# LFS LC Office Status Slack App API
An Express server that listens for incoming `POST` requests from a Slack app and interacts with a database. 

Users who install the app can use Slack commands from their workspace to update their office status on an online database.

Slash Commands
---------
`/lc_status help` - shows a list of all commands


`/lc_status enroll <id>` - adds a user to the database

`lc_status unenroll` - removes a user from the database


`/lc_status saved` - shows a list of status messages the user has saved

`/lc_status saved add` - opens a view where the user can add a new status message

`/lc_status saved remove` - opens a view where the user can select saved status messages to remove


`/lc_status check` - displays the user's current status

`/lc_status check <member_mention>` - displays the specified member's status (only visible to caller)

`/lc_status check <member_mention> share` - displays the specified member's status (to everyone in the channel)


`/lc_status set` - opens a view where user can set a new status 

`/lc_status set <public_id>` - sets current status to message from saved list 


`/lc_status clear` - clear the user's current status



Actions
---------
**Endpoint:** /action

### [block_action]

#### 1. _displaySaved_

**Slash command:** `/lc_status saved` 

Triggered when a user clicks a saved status message's __Set__ button. 

An action payload with the value `set_saved_status!<_id>` will then be sent to the actions endpoint.

### [view_submission]
The following actions are triggered when a user fills in the input fields in a view (modal) window and submits it. 

Each view contains a unique `callback_id` that is later used to identify which was submitted in the code. This is necessary as all action payloads are sent to the same endpoint.

#### 1. _addToSaved_

**Slash command:** `/lc_status saved add`

**callback_id:** `status_add`

The view contains two input blocks:

| **Public ID** | **Status Message** |
|:---------------|:--------------------|
|**block_id:**   pubId| **block_id:**  statMsg |
| **action_id:** pubId_add_submit| **action_id:**  statMsg_add_submit | 

The `block_id` and `action_id` are used to retrieve input field values from the incoming payload.

#### 2. _removeFromSaved_

**Slash command:** `/lc_status saved remove`

**callback_id:** `status_remove`

The view contains a single input block:

|**Status Select**|
|-----------------|
|**block_id:** statObjId |
|**action_id:** statObjId_remove_submit |

#### 3. _setAndSave_

**Slash command:** `/lc_status set`

**callback_id:** `status_set`

The view contains the same two input blocks as the **_addToSaved_** view, with an additional input field:

|**Save Option**|
|-----------------|
|**block_id:** statSetRadio |
|**action_id:** statSetRadio_set_submit |

The field can contain one of two values: 
* `save_status_yes`
* `save_status_no`

#### 4. _confirmUnenroll_ 

**Slash command:** `/lc_status unenroll`

**callback_id:** `confirm_unenroll`

The view contains no input blocks. Its submission indicates user confirmation for unenrollment.

## Schemas

### Members

```javascript
{
  _id: ObjectId,
  slackId: String,
  identifier: String
  currentStatus: {_id: ObjectId, message: String, publicId: String},
  lastUpdated: Date,
  statusList: [
    {_id: ObjectId, message: String, publicId: String}
  ]
}
```