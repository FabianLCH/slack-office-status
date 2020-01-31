const commandList = [
  {slash: "/lc_status help", description: "shows all available commands\n"},
  
  {slash: "/lc_status enroll <id>", description: "adds a user to the database"},
  {slash: "/lc_status unenroll", description: "removes user from the database (requires confirmation)\n"}, 
  
  {slash: "/lc_status saved", description: "shows a list of all your saved status messages"},
  {slash: "/lc_status saved add", description: "add a new status to user's list"},
  {slash: "/lc_status saved remove", description: "remove a status from user’s saved list\n"},
  
  {slash: "/lc_status check", description: "shows the your current status"},
  {slash: "/lc_status check <member>", description: "displays the mentioned member’s status (only to you)"},
  {slash: "/lc_status check <member> share", description: "displays the mentioned member’s status to everyone in the channel\n"},
  
  {slash: "/lc_status set", description: "set a new status (with the option to save)"},
  {slash: "/lc_status set <public_id>", description: "sets a status message as the current status using its public ID\n"},
  
  {slash: "/lc_status clear", description: "clear the user’s current status"}
];

module.exports = commandList;