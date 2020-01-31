const express = require("express");
const router = express.Router();
const axios = require("axios");
const mongoose = require("mongoose");

const Members = require("./models/Members");

const { plainBlockFactory,
      mrkdwnBlockFactory } = require("./blockFactory");

const { SLACK_WORKSPACE_TOKEN } = process.env;
const SLACK_VIEW_OPEN_ENDPOINT = "https://slack.com/api/views.open";

const INTERNAL_ERROR_TITLE = "Internal error";
const INTERNAL_ERROR_MESSAGE = "An error occurred while processing your request.";

const { viewSubmissionActions } = require("./variables");


// ******************************************************
//   POST JSON for a simple modal containing a title, a 
//   message and a close button to the Slack views.open
//   endpoint. 
// ******************************************************
const postMessageModal = (triggerId, modalTitle, modalMessage) => {
  
  // ensure title is less than 24 characters long
  modalTitle = modalTitle.slice(0, 23);
  
  const modal = {
      "type": "modal",
      "title": {
        "type": "plain_text",
        "text": modalTitle,
        "emoji": true
      },
      "close": {
        "type": "plain_text",
        "text": "Close",
        "emoji": true
      },
      "blocks": [mrkdwnBlockFactory(modalMessage)]
  }
  const requestBody = {"trigger_id": triggerId, "view": modal };
  
  // send POST request
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
      console.log("Message modal POST request successful."); 
    }
    else {
      throw new Error(response.data.error);
    }  
  }).catch( error => {
    console.log("Message modal POST request failed. \n", error);
  });
}

// ==================================================
//   ACTION PAYLOAD MIDDLEWARE 
// ==================================================
router.post("/", (req, res, next) => {
  
  // parse the payload 
  const payload = JSON.parse(req.body.payload);
  
  // get payload details
  const userId = payload.user.id;
  
  // get response URL and attach to request
  const responseURL = payload["response_url"];
  req.slackResponseURL = responseURL;
  
  let actionIdentifier, actionValue;

  // acknowledge valid action payload (Slack needs a 200 OK response from server)
  res.send();
  
  // ----------------------------------
  //  STANDARD ACTION PAYLOAD
  // ----------------------------------
  if(payload.type == "block_actions") {
    try {
      [actionIdentifier, actionValue] = payload.actions[0].value.split("!");
    }
    catch(error) {
      return next(error);
    }

    if(actionIdentifier == "set_saved_status") {
    Members.findOne({ slackId: userId }, (err, memberDocument) => {
      if(err) {
        // send to error handling middleware
        return next(err);
      }
      else {
        // check if a valid document was retrieved
        if(memberDocument && memberDocument.statusList) {
          const { statusList } = memberDocument;
          const savedStatusIdx = statusList.findIndex( status => status._id == actionValue );

          if(savedStatusIdx === -1 ) {
            // status message with corresponding id was not found, send to error handling middleware
            next("The specified status does not exist!");
          }
          else {
            // update the current status to the saved one
            const newCurrentStatus = statusList[savedStatusIdx];
            const currentTime = Date.now();

          Members.updateOne({ slackId: userId }, 
            { currentStatus: newCurrentStatus, lastUpdated: currentTime },
            {new: false}, 
            (err) => {
              let actionResponseMessage;
              if(err) {
                actionResponseMessage = ":x: Could not update status. Please try again later.";
                req.dbUpdateError = true;
              }
              else actionResponseMessage = ":heavy_check_mark: Office status has been successfully updated to:";

              // send POST request details to next middleware
              req.newCurrentStatus = newCurrentStatus;
              req.slackActionResponse = actionResponseMessage;
              return next();
            });
          }
        }
      }
    });
    }
  }
  // ----------------------------------
  //  MODAL SUBMISSION ACTION PAYLOAD
  // ----------------------------------
  else if(payload.type == "view_submission") {
    const triggerId = payload["trigger_id"];
    
    const { addToSaved, removeFromSaved, setAndSave, confirmUnenroll } = viewSubmissionActions;
    
    let callbackId;
    
    try {
      callbackId = payload.view["callback_id"];
    }
    catch(error) {
      console.log(error);
      // send error message to user and exit the middleware function
      return postMessageModal(triggerId, INTERNAL_ERROR_TITLE, INTERNAL_ERROR_MESSAGE);
    }
    
    // &&&&&&&&&&&&&&&&&&&&&&&&
    //  ADD MODAL SUBMITTED
    // &&&&&&&&&&&&&&&&&&&&&&&&
    if(callbackId == addToSaved.callbackId) {
      let statusPublicId, statusMessage; 

      // get the public ID and status message
      try {
        const { values } = payload.view.state;
        const { publicId, messageContent } = addToSaved.inputs
        statusPublicId = values[publicId.blockId][publicId.actionId]["value"];
        statusMessage = values[messageContent.blockId][messageContent.actionId]["value"];
      }
      catch(error) {
        console.log(error);
        // send error message to user and exit the middleware function
        return postMessageModal(triggerId, INTERNAL_ERROR_TITLE, INTERNAL_ERROR_MESSAGE);
      }

      const newStatusMessage = {
        _id: mongoose.Types.ObjectId(),
        message: statusMessage,
        publicId: statusPublicId
      };

      // save new status message on database
      Members.updateOne({ slackId: userId }, { $push: {statusList: newStatusMessage} }, (err, memberDocument) => {
        if(err)
        {
          console.log(err)
          postMessageModal(triggerId, "Unable to save status", "Could not save your new status to the database. Please try again in a bit.");
        }
        else
          postMessageModal(triggerId, "Status saved", "Your status message has been saved successfully.");
      });
    }
    // &&&&&&&&&&&&&&&&&&&&&&&&
    //  REMOVE MODAL SUBMITTED
    // &&&&&&&&&&&&&&&&&&&&&&&&
    else if(callbackId == removeFromSaved.callbackId) {
      const { statusSelect } = removeFromSaved.inputs;
      
      const selectedOptionBlocks = payload.view.state.values[statusSelect.blockId][statusSelect.actionId]["selected_options"]
      const selectedOptionObjectIds = selectedOptionBlocks.map( option => option.value );
      
      Members.updateOne({ slackId: userId }, { $pull: { statusList: { _id: { $in: selectedOptionObjectIds } } } }, (err, memberDocument) => {
        if(err)
          postMessageModal(triggerId, "An error occurred", "Unable to delete status messages from database. Please try again.");
        else {
          postMessageModal(triggerId, "Delete successful", "Status message(s) deleted successfully.");
        }
      }); 
    }
    // &&&&&&&&&&&&&&&&&&&&&&&&
    //  SET MODAL SUBMITTED
    // &&&&&&&&&&&&&&&&&&&&&&&&
    else if(callbackId == setAndSave.callbackId) {
      const { values } = payload.view.state;
      
      // get object containing variables for the setAndSave action's saveOption input field
      const { saveOption } = setAndSave.inputs;
      const { publicId, messageContent } = addToSaved.inputs;
      
      const newStatusMessage = {
        _id: mongoose.Types.ObjectId(),
        message: values[messageContent.blockId][messageContent.actionId]["value"],
        publicId: values[publicId.blockId][publicId.actionId]["value"]
      }
              
      if(values[saveOption.blockId][saveOption.actionId]["selected_option"]["value"] == saveOption.values.yes) {
        // set status and save it
        Members.updateOne({ slackId: userId }, {currentStatus: newStatusMessage, $push: { statusList: newStatusMessage }}, (err, memberDocument) => {
          if(err) {
              console.log(err);
              return postMessageModal(triggerId, "Could not set status", "Unable to set status on database. Please try again later.");
            }
          else {
            postMessageModal(triggerId, "New status set", "Your new status was saved to the database and set as your current status successfully.");
          }
        });
      }
      else {
        // just set status
        Members.updateOne({ slackId: userId }, {currentStatus: newStatusMessage }, (err, memberDocument) => {
          if(err) {
            console.log(err);
            return postMessageModal(triggerId, "Could not set status", "Unable to set status on database. Please try again.");
          }
          else {
           postMessageModal(triggerId, "New status set", "Your current status was updated successfully."); 
          }
        });
      }
    }
    // &&&&&&&&&&&&&&&&&&&&&&&&
    //  UNENROLL MODAL SUBMITTED
    // &&&&&&&&&&&&&&&&&&&&&&&&
    else if(callbackId == confirmUnenroll.callbackId) {
      const userId = payload.user.id;
      
      // delete member document from database
      Members.deleteOne({ slackId: userId }, (err) => {
        if(err) {
          console.log(err);
          return postMessageModal(triggerId, "Unenroll failed", "Unable to remove user from database. Please try again.");
        }
        else {
          return postMessageModal(triggerId, "Unenroll successful", "You have been removed from the database successfully.");
        }
      });
    }
    // &&&&&&&&&&&&&&&&&&&&&&&&&
    //  INVALID MODAL SUBMITTED
    // &&&&&&&&&&&&&&&&&&&&&&&&
    else {
      console.log("The view_submission action received could not be recognized.");
      return postMessageModal(triggerId, INTERNAL_ERROR_TITLE, INTERNAL_ERROR_MESSAGE);
    }
  }
  // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  //  INVALID ACTION
  // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  else {
    return next(new Error("Invalid action."));
  }
});

// ==================================================
// STANDARD ACTION - POST REQUEST MIDDLEWARE
// ==================================================
router.post("/", (req, res) => {
  const { newCurrentStatus, slackResponseURL, slackActionResponse } = req;
  
  const blocks = req.dbUpdateError ? 
        [plainBlockFactory(slackActionResponse)] :
        [plainBlockFactory(slackActionResponse), mrkdwnBlockFactory(`>${"`" + newCurrentStatus.publicId + "`  "+ newCurrentStatus.message}`)];
  
  const responseBody = {
    "response_type": "ephimeral",
    "blocks": blocks
  };
  
  // send text response to Slack
  axios.post(slackResponseURL, responseBody)
    .then((response) => {
    console.log("POST request successful.");
  }).catch((error) => {
    console.log("POST request failed! \n", error);
  });
  
});

// ==================================================
// ERROR HANDLING MIDDLEWARE
// ==================================================
router.use((error, req, res, next) => {
  // log the error to the console   
  console.log(error);
  
  // POST request details
  const errorResponseMessage = "An error occurred. Please try again later.";
  const errorResponseBody = {
    "response_type": "ephimeral",
    "text": errorResponseMessage
  };
  
  if(req.slackResponseURL) {
    // send simplified error message to slack
    axios.post(req.slackResponseURL, errorResponseBody)
      .then((response) => {
        console.log("Error response sent successfully.");
    }).catch((error) => {
      console.log("Could not send error response. \n", error);
    });
  }
});
  

module.exports = router;

