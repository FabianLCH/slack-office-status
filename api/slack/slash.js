"use strict";

const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");

const Members = require("../../models/Members");

const { savedStatusBlock, 
       plainBlockFactory, 
       mrkdwnBlockFactory, 
       modalFactory,
       savedAddModal,
       savedRemoveModal,
       statusSetModal
      } = require("./blockFactory");

const commandList = require("./commandList");

const { SLACK_WORKSPACE_TOKEN } = process.env;

const SLACK_VIEW_OPEN_ENDPOINT = "https://slack.com/api/views.open";

const notInDatabaseMsg = "It looks like you are not in the database yet. To add yourself to the database, type `/lc_status enroll <id>`."

const { viewSubmissionActions } = require("./variables");

const slash = express.Router();

const sendModal = (triggerId, modalFactoryFunction) => {
  
  const requestBody = {
    "token": SLACK_WORKSPACE_TOKEN,
    "trigger_id": triggerId,
    "view": modalFactoryFunction()
  };
  
  axios({
    method: 'post',
    url: SLACK_VIEW_OPEN_ENDPOINT,
    headers: {
      "Authorization": `Bearer ${SLACK_WORKSPACE_TOKEN}`,
      "Content-Type": "application/json; charset=UTF-8"
    },
    data: JSON.stringify(requestBody)
  }).then( response => {
    if(response.data.ok) {
      console.log("Modal POST request successful.") 
    }
    else {
      throw new Error(response.data.error);
    }
    
  }).catch( error => {
    console.log("Modal POST request failed. \n", error);
  });
}

// detect command and generate corresponding blocks array
slash.post("/", async (req, res, next) => {
    const userId = req.body["user_id"];
    let blocks = [];
  
    // set the default response type
    req.responseType = "ephimeral";
  
    // get command parameters and separate them
    const rawCommandParams = req.body.text;
    const [subcommand, value, option] = rawCommandParams.split(" ");
    
    console.log(`CMD: /lc_status ${rawCommandParams}`);
    
    //  ▼ COMMANDS THAT DO NOT REQUIRE ENROLLMENT CHECK ▼
    if (!subcommand) {
      blocks.push(mrkdwnBlockFactory("Type `/lc_status help` to display a list of all available commands."));
  
      req.blocks = blocks;
      next();
    }
    // ++++++++ HELP ++++++++ //
    else if (subcommand == "help") {
      let mrkdwnCommands = "";
      commandList.forEach(command => {
        mrkdwnCommands += "`" + command.slash + "`  " + command.description + "\n";
      });
  
      blocks = [
        mrkdwnBlockFactory("*Here's a list of all available commands:*"),
        {"type": "divider"},
        mrkdwnBlockFactory(mrkdwnCommands)
      ];
  
      // send responseType and blocks to next middleware
      req.blocks = blocks;
  
      next();
    }
    // ++++++++ CHECK ++++++++ //
    else if (subcommand == "check") {
      let targetUserId, lastUpdatedString;
  
      // if no user specified, display caller's status
      // else, display specified user's status
      if (!value) {
        targetUserId = userId;
      } else {
        try {
          targetUserId = value.split("|")[0].replace("<@", "");
        } catch (e) {
          console.log(e);
        }
      }
  
      Members.findOne({ slackId: targetUserId }, (err, memberDocument) => {
        let statusMessage;
  
        if (err) {
          statusMessage = "Could not get status. Please try again!";
          console.log(err);
        } else if (memberDocument && memberDocument.currentStatus) {
          
          // create date object and parse it
          const lastUpdatedDate = new Date(memberDocument.lastUpdated);
          lastUpdatedString = `${lastUpdatedDate.toDateString()} ${lastUpdatedDate.toTimeString()}`;
          
          const { currentStatus } = memberDocument;
          
          if(currentStatus.message) {
            statusMessage = `*<@${targetUserId}>'s office status:*\n> `+ "`" + currentStatus.publicId + "`  " + `${currentStatus.message}`;
          }
          else {
            statusMessage = `*${targetUserId == userId ? "You have" : "<@"+targetUserId+"> has"} not set an office status yet.*`;
          }
          
          // if share option specified, show in channel
          if(option == "share") {
            req.responseType = "in_channel";
          }
        } 
        else {
          if (/U[0-9A-Z]{8}$/.test(targetUserId)) {
            statusMessage = `Could not find status for <@${targetUserId}>`;
          } else {
            statusMessage = "Invalid user. Please try again.";
          }
        }
        
        // add complete Slack message to blocks
        blocks.push(mrkdwnBlockFactory(statusMessage));
        
        // send user status to next middleware
        req.blocks = blocks;
        next();
      });
    }
    // ++++++++ ENROLL ++++++++ //
    else if(subcommand == "enroll") {
      // 1. Check if user is already on database
      Members.findOne({ slackId: userId }, (err, memberDocument) => {
        if(err) {
          blocks.push(plainBlockFactory("An error occurred. Please try again later."));
          req.blocks = blocks;
          next();
        }
        else {
          // check if user exists in database
          if(memberDocument && Object.entries(memberDocument).length > 0) {
            blocks.push(plainBlockFactory(":exclamation: You have already been added to the database"));
            
            req.blocks = blocks;
            next();
          }
          else {
            // check if user provided an identifier
            if(!value) {
              blocks.push(mrkdwnBlockFactory("Type `/lc_status enroll <id>` to get added to the database."));
              blocks.push(mrkdwnBlockFactory("`<id>` must be a *unique* identifier. It will be used by external sites to retrieve your public status from the database."));
              
              req.blocks = blocks;
              next();
            }
            else {
              // if id of valid length and contains valid characters, enroll
              if(/^[a-z0-9]{5,15}$/i.test(value)) {
                const newUser = new Members({
                  _id: mongoose.Types.ObjectId(),
                  slackId: userId,
                  identifier: value,
                  currentStatus: {},
                  lastUpdated: null,
                  statusList: []
                });
              
                newUser.save((err) => {
                  if(err) {
                    console.log(err);
                    const errorMessage = err.code == 11000 ? `:exclamation: The id \`${err.keyValue.identifier}\` is already in use. Please try a different one.` : "An error occurred. Please try again later.";
                    blocks.push(mrkdwnBlockFactory(errorMessage));
                  }
                  else {
                    blocks.push(plainBlockFactory(":heavy_check_mark: You have been added to the database successfully."));
                  }

                  req.blocks = blocks;
                  next();
                });
              }
              else {
                blocks.push(plainBlockFactory("Your id must have between 5 and 15 characters and cannot contain any special characters or spaces (letters and numbers only)."));
                
                req.blocks = blocks;
                next();
              }
            }
          }
        }
      });
    }
    //  ▼ COMMANDS THAT REQUIRE ENROLLMENT  ▼   
    else {
      // check if member is enrolled (has entry in DB)
      Members.findOne({ slackId: userId }, (err, memberDocument) => {
        if(err) { 
          blocks.push(plainBlockFactory("An error occurred. Please try again later"));
          
          req.blocks = blocks;
          next();
        }
        else if(memberDocument && Object.entries(memberDocument).length > 0) {
          // ++++++++ SAVED ++++++++ //
          if (subcommand == "saved") {
            // **** no SAVED option specified **** //
            if(!value) {
              Members.findOne({ slackId: userId }, (err, memberDocument) => {
              if (err) {
                blocks.push(plainBlockFactory("An error occurred. Please try again."));
              } 
              else {
                if (memberDocument && memberDocument.statusList) {
                  if (memberDocument.statusList.length > 0) {

                    //if there are 1 or more saved status messages, display them to user
                    const statusBlockList = memberDocument.statusList.map(status =>
                      savedStatusBlock("`" + status.publicId + "`  " + status.message, status._id)
                    );

                    // add the top message and the divider
                    Array.prototype.push.apply(blocks, [ mrkdwnBlockFactory("*Here's a list of the status messages you have saved:*"), { type: "divider" } ]);

                    // add the status messages
                    Array.prototype.push.apply(blocks, statusBlockList);
                  } 
                  else {
                    // if array is empty or doesn't exist, inform user
                    blocks.push(plainBlockFactory("You have not saved any status messages."));
                  }
                } 
                else {
                  // if no array of status messages is found, send error block
                  blocks.push(mrkdwnBlockFactory("It looks like you are not in the database yet. To add yourself to the database, type `/lc_status enroll`."));
                }
              }

              req.blocks = blocks;

              next();
            });
            }
            // **** SAVED ADD option selected ***
            else if(value == "add") {
              const triggerId = req.body["trigger_id"];

              // acknowledge the request
              res.send();

              sendModal(triggerId, savedAddModal);
            }
            // **** SAVED REMOVE option selected **** //
            else if(value == "remove") {
              const triggerId = req.body["trigger_id"];

              // acknowledge the request
              res.send();

              // send the remove modal
              sendModal(triggerId, savedRemoveModal);

            }
            // **** unknown SAVED option **** //
            else {
              blocks.push(mrkdwnBlockFactory("Invalid command. Type `/lc_status help` to display a list of all available commands."));

              req.blocks = blocks;

              next();
            }

          }
          // ++++++++ SET ++++++++ //
          else if (subcommand == "set") {
            if(!value) {
              const triggerId = req.body["trigger_id"];

              // acknowledge the request
              res.send();

              // send the remove modal
              sendModal(triggerId, statusSetModal);
            }
            else {
              // user specified a public ID, set status to that IF IT MATCHES TO ANY
              Members.findOne({ slackId: userId }, (err, memberDocument) => {
                if(err) {
                  console.log(err);
                  blocks.push(plainBlockFactory("An error has ocurred. Please try again later."));

                  req.blocks = blocks;
                  next();
                }
                else {
                  if(memberDocument && memberDocument.statusList) {
                    const targetStatusIdx = memberDocument.statusList.findIndex( status => status.publicId == value );

                    if(targetStatusIdx === -1) {
                      blocks.push(mrkdwnBlockFactory(`Could not find status with public ID ${"`" + value + "`"}.`));

                      req.blocks = blocks;
                      next();
                    }
                    else {
                      // update current status on DB
                      const newCurrentStatus = memberDocument.statusList[targetStatusIdx];

                      Members.updateOne({ slackId: userId }, {currentStatus: newCurrentStatus }, (err, memberDocument) => {
                        if(err)
                          blocks.push(plainBlockFactory("Could not update current status. Please try again later."));
                        else {
                          blocks.push(mrkdwnBlockFactory(`:heavy_check_mark: Office status was successfully updated to:\n> ${"`" + newCurrentStatus.publicId + "`  " + newCurrentStatus.message}` ));
                        }


                        req.blocks = blocks;
                        next();
                      });
                    }
                  }
                  else {
                    blocks.push(plainBlockFactory("Could not retrieve user data. Please try again later."));


                    req.blocks = blocks;
                    next();
                  }
                }
              });
            }
          }
          // ++++++++ CLEAR ++++++++ //
          else if (subcommand == "clear") {
            Members.updateOne({ slackId: userId }, 
              {currentStatus: null }, 
              {new: false},
              (err) => {
                if(err) {
                  console.log(err);
                  blocks.push(plainBlockFactory("Could not clear status. Please try again."))
                }
                else {
                  blocks.push(plainBlockFactory("Status cleared successfully."));
                }

                req.blocks = blocks;

                next();
            });
          }
          // ++++++++ UNENROLL ++++++++ //
          else if(subcommand == "unenroll") {
            const triggerId = req.body["trigger_id"];

            // acknowledge the request
            res.send();
            
            const { confirmUnenroll } = viewSubmissionActions;
            
            sendModal(triggerId, () => modalFactory(confirmUnenroll.title,
                                                   confirmUnenroll.callbackId,
                                                   confirmUnenroll.submit,
                                                   confirmUnenroll.close,
                                                   [mrkdwnBlockFactory("Are you sure you want to unenroll? *All of your saved status messages will be deleted.*")]));
          }
          // ???? UNKNOWN COMMAND ????
          else {
            blocks.push(mrkdwnBlockFactory("Invalid command. Type `/lc_status help` for a list of available commands."));
            
            req.blocks = blocks;
            next();
          }
        }
        else {
          blocks.push(mrkdwnBlockFactory(notInDatabaseMsg));
          
          req.blocks = blocks;
          next();
        }
      });
      
    }
});
  

// send standard responses to slack
slash.post("/", (req, res) => {
  const { blocks, responseType } = req;

  const message = {
    response_type: responseType,
    blocks: blocks
  };

  // send response payload to slack
  res.json(message);
});

module.exports = slash;