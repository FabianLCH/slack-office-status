const viewSubmissionActions = {
  addToSaved: {
    title: "Add a new status message",
    callbackId: "status_add",
    submit: "Add",
    close: "Cancel",
    inputs: {
      publicId: { label: ":eyes: Public ID", blockId: "pubID", actionId: "pubID_add_submit" },
      messageContent: {label: ":computer: Message", blockId: "statMsg", actionId: "statMsg_add_submit" }
    }
  },
  removeFromSaved: {
    title: "Delete a saved status",
    callbackId: "status_remove",
    submit: "Remove",
    close: "Cancel",
    inputs: {
      statusSelect: {label: "Select status message(s) to remove", blockId: "statObjId", actionId: "statObjId_remove_submit" }
    }
  },
  setAndSave: {
    title: "Set office status",
    callbackId: "status_set",
    submit: "Set Status",
    close: "Cancel",
    inputs: {
      saveOption: { 
        label: "Would you like to save your status message?",
        blockId: "statSetRadio", 
        actionId: "statSetRadio_set_submit",
        values: {
          yes: "save_set_status_yes",
          no: "save_set_status_no"
        }
      }
    }
  },
  confirmUnenroll: {
    title: "Confirm unenroll",
    callbackId: "confirm_unenroll",
    submit: "Confirm",
    close: "Cancel"
  }
};

module.exports = { viewSubmissionActions };