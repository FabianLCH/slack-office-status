const express = require("express");
const cors = require("cors");

const Members = require("../../models/Members");

const publicRouter = express.Router();

publicRouter.use(cors());

publicRouter.get("/:identifier", (req, res) => {
    const { identifier } = req.params;

    Members.findOne({ identifier }, (err, doc) => {
        if(err)
            return res.json({error: true, errorMsg: "Could not retrieve data from database."});
        else {
            if(doc && Object.entries(doc).length > 0) {
                const { publicId, message } = doc.currentStatus;
                return res.json({ publicId, message });
            }
            else {
                return res.json({error: true, errorMsg: "User not found."});
            }
        }   
    });
});

module.exports = publicRouter;