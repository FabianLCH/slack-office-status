/*
*  --- SLACK BLOCK KIT ELEMENT FACTORY FUNCTIONS ---
*  The following functions construct block objects following the Slack
*  Block Kit documentation. These blocks are used by Slack to reconstruct
*  the message in a GUI friendly format and display it to the user.
*
*/
const PLAIN_TEXT_INPUT = "plain_text_input";
const MULTI_EXTERNAL_SELECT = "multi_external_select";
const STATIC_SELECT = "static_select";

const { viewSubmissionActions } = require("./variables");

const plainBlockFactory = plainMessage => {
  return {
    type: "section",
    text: {
      type: "plain_text",
      text: plainMessage
    }
  };
};

const mrkdwnBlockFactory = mrkdwnMessage => {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: mrkdwnMessage
    }
  };
};

const contextBlockFactory = contextMessage => {
  return {
			"type": "context",
			"elements": [
				{
					"type": "mrkdwn",
					"text": contextMessage
				}
			]
		}
};

const inputBlockFactory = (elementType, label, blockId, actionId, options) => {
  const inputBlock = {
			"type": "input",
      "block_id": blockId,
			"element": {
				"type": elementType,
        "action_id": actionId
			},
			"label": {
				"type": "plain_text",
				"text": label
			}
  };
  
  // check if an 'options' array was specified
  if(options && options.length > 0) {
    inputBlock["element"]["options"] = options.map( option => {
      return {
        "text": {
          "type": "plain_text",
          "text": option.text,
          "emoji": true
        },
        "value": option.value
      }
    });
  }
  
  return inputBlock;
}

const confirmBlockFactory = (title, body, confirmText, denyText) => {
  return {
    "title": {
        "type": "plain_text",
        "text": title
    },
    "text": {
        "type": "mrkdwn",
        "text": body
    },
    "confirm": {
        "type": "plain_text",
        "text": confirmText
    },
    "deny": {
        "type": "plain_text",
        "text": denyText
    }
  }
}

const radioBlockFactory = (description, options) => {
  const optionBlocks = options.map( option => {
    return {
      "text": {
        "type": "plain_text",
        "text": option.text
      },
      "value": option.value
    }
  });
  
  return {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": description
    },
    "accessory": {
      "type": "radio_buttons",
      "initial_option": optionBlocks[0],
      "options": optionBlocks
    }
  }
}

const modalFactory = (title, callbackId, submitText, closeText, blocks) => {
  return {
    "type": "modal",
    "callback_id": callbackId,
    "title": {
      "type": "plain_text",
      "text": title,
      "emoji": true
    },
    "submit": {
      "type": "plain_text",
      "text": submitText,
      "emoji": true
    },
    "close": {
      "type": "plain_text",
      "text": closeText,
      "emoji": true
    },
    "blocks": blocks
  }
}

// -----------------------------------
// SAVED ADD, SAVED REMOVE,  SET modal variables
const { addToSaved, removeFromSaved, setAndSave } = viewSubmissionActions;
const { publicId, messageContent } = addToSaved.inputs;

const pubIdInput = inputBlockFactory(PLAIN_TEXT_INPUT, publicId.label, publicId.blockId, publicId.actionId);
const statMsgInput = inputBlockFactory(PLAIN_TEXT_INPUT, messageContent.label, messageContent.blockId, messageContent.actionId);

// add minimum length property to base input block
const pubIdInputBlock = {...pubIdInput, "element": {...pubIdInput.element, "min_length": 3} };

const pubIdContext = contextBlockFactory("A keyword that will help identify your status out in the wild. Make sure to use something you have not used before!");
const statMsgContext = contextBlockFactory("*Try to keep it short!*");

// blocks used for add modal (Public ID w/ context & Status Message w/ context)
const baseAddBlocks = [
      pubIdInputBlock,
      pubIdContext,
      statMsgInput,
      statMsgContext
];
// ----------------------------------

const savedAddModal = () => modalFactory(
  addToSaved.title, 
  addToSaved.callbackId,
  addToSaved.submit, 
  addToSaved.close, 
  baseAddBlocks
);

const savedRemoveModal = () => {
  const { statusSelect } = removeFromSaved.inputs;
  
  // create multi_external_select input block
  const removeInputBlock = inputBlockFactory(
    MULTI_EXTERNAL_SELECT, 
    statusSelect.label, 
    statusSelect.blockId, 
    statusSelect.actionId
  );
  
  // add min_query_length property to base input block
  removeInputBlock["element"]["min_query_length"] = 0;
  
  return modalFactory(
    removeFromSaved.title, 
    removeFromSaved.callbackId,
    removeFromSaved.submit, 
    removeFromSaved.close, 
    [removeInputBlock]
  );
}

const statusSetModal = () => {
  
  const { saveOption } = setAndSave.inputs;
  
  // add the radio buttons block to base add blocks
  const statusSetBlocks = baseAddBlocks.concat([
    inputBlockFactory(
      STATIC_SELECT,
      saveOption.label,
      saveOption.blockId,
      saveOption.actionId,
      [
        { text: "Yes", value: saveOption.values.yes },
        { text: "No", value: saveOption.values.no }
      ]
    )
  ]);
  
  return modalFactory(
    setAndSave.title,
    setAndSave.callbackId,
    setAndSave.submit,
    setAndSave.close,
    statusSetBlocks
  );
}

const savedStatusBlock = (message, id) => {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text: message
    },
    accessory: {
      type: "button",
      text: {
        type: "plain_text",
        emoji: true,
        text: "Set"
      },
      value: `set_saved_status!${id}`
    }
  };
};

module.exports = { savedStatusBlock, plainBlockFactory, mrkdwnBlockFactory, contextBlockFactory, modalFactory, savedAddModal, savedRemoveModal, statusSetModal };