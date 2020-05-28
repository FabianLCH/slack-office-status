const commandList = [
  {slash: "/lc_status help", description: "shows all available commands\n"},
  
  {slash: "/lc_status enroll <id>", description: "adds a user to the database"},
  {slash: "/lc_status unenroll", description: "removes user from the database (requires confirmation)\n"}, 
  
  {slash: "/lc_status saved", description: "shows a list of all your saved status messages"},
  {slash: "/lc_status saved add", description: "add a new status message to your list"},
  {slash: "/lc_status saved remove", description: "remove a status message from your saved list\n"},
  
  {slash: "/lc_status check", description: "display your current status (only visible to you)"},
  {slash: "/lc_status check <member>", description: "display the mentioned member’s current status (only visible to you)"},
  {slash: "/lc_status check <member> share", description: "display and share the mentioned member’s current status with everyone in the channel\n"},
  
  {slash: "/lc_status set", description: "set a new status (with the option to save it to your list)"},
  {slash: "/lc_status set <public_id>", description: "set a status message as the current status using its public ID\n"},

  {slash: "/lc_status location", description: "edit your current location\n"},
  
  {slash: "/lc_status clear", description: "clear the your current status"}
];

module.exports = commandList;