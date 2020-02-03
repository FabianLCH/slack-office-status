"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 4000;
const ATLAS_URI = process.env.ATLAS_URI;

const slackRouter = require("./api/slack/slackRouter");
const publicRouter = require("./api/public/publicRouter");

const app = express();

if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
}
  
mongoose.connect(ATLAS_URI, {
useNewUrlParser: true,
useUnifiedTopology: true
});
let db = mongoose.connection;

db.once("open", () => {
console.log("Connected to database.");
});
db.on("error", console.error.bind(console, "MongoDB connection erorr:"));

const rawBodyBuffer = (req, res, buf, encoding) => {
    if (buf && buf.length) {
      req.rawBody = buf.toString(encoding || "utf8");
    }
  };
  
// use raw buffer to perform request validation
app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true }));
app.use(bodyParser.json({ verify: rawBodyBuffer }));

app.use("/api/slack", slackRouter);
app.use("/api/public", publicRouter);

app.listen(PORT, () => {
    console.log(
      "Express server listening on port %d in %s mode",
      PORT,
      app.settings.env
    );
});
  