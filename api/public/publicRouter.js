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
                const lastUpdatedRaw = doc.lastUpdated;
                
                const parsedLastUpdated = Date.parse(lastUpdatedRaw);
                const now = Date.now();
                
                const minuteDifference = Math.floor((now - parsedLastUpdated)/(1000 * 60));
                const hourDifference = Math.floor((now - parsedLastUpdated)/(1000 * 60 * 60));
                const dayDifference = Math.floor((now - parsedLastUpdated)/(1000 * 60 * 60 * 24));

                return res.json({ 
                    publicId, 
                    message, 
                    lastUpdated: {
                        raw: lastUpdatedRaw,
                        minutes: minuteDifference,
                        hours: hourDifference,
                        days: dayDifference
                    },
                    location: doc.location
                });
            }
            else {
                return res.json({error: true, errorMsg: "User not found."});
            }
        }   
    });
});

module.exports = publicRouter;