const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const { ObjectId } = Schema.Types;

const Members = new Schema({
  _id: ObjectId,
  slackId: String,
  identifier: String,
  currentStatus: {_id: ObjectId, message: String, publicId: String},
  lastUpdated: Date,
  statusList: [
    {_id: ObjectId, message: String, publicId: String}
  ]
});

module.exports = mongoose.model("Members", Members, "members");