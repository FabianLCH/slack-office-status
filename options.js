const express = require("express");

const Members = require("./models/Members");

const options = express.Router();

options.post("/", (req, res) => {
  const payload = JSON.parse(req.body.payload);
  const userId = payload.user.id;
  
  const searchParam = payload.value;
  
  console.log(searchParam);
  
  const searchRegExp = new RegExp(searchParam, "i");
  
  Members.findOne({slackId: userId}, (err, memberDocument) => {
    if(err) {
      // something occurred while retrieveing status messages
      return res.status(500).send();
    }
    else {
      if(memberDocument && memberDocument.statusList) {
        // format the status messages to valid option blocks
        
        const searchMatches = memberDocument.statusList.filter( statusMsg => searchRegExp.test(statusMsg.message) || searchRegExp.test(statusMsg.publicId));
        
        const optionBlocks = searchMatches.map( status => {
          return {
            "text": {
              "type": "plain_text",
              "text": `[${status.publicId}] ${status.message}`
            },
            "value": status._id
          }
        }); 
        
        return res.json({"options": optionBlocks});
      }
      else {
        // user has no saved status messages
        return res.status(404).send();
      }
    }
  });
  
});

module.exports = options;