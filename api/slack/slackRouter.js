const express = require("express");
const slackRouter = express.Router();

const slashRouter = require("./slash");
const actionsRouter = require("./actions");
const optionsRouter = require("./options");

const signature = require("./verifySignature");

// verify that request came from slack before performing any actions
slackRouter.use(async (req, res, next) => {
    if (!signature.isVerified(req)) {
      return res.sendStatus(404);
    } else {
      next();
    }
  });

slackRouter.use("/commands", slashRouter);
slackRouter.use("/actions", actionsRouter);
slackRouter.use("/options", optionsRouter);

module.exports = slackRouter;