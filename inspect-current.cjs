const fs = require('fs');
const server = fs.readFileSync('server.ts', 'utf8');
console.log("=== SERVER PROMPT ===");
console.log(server.substring(0, server.indexOf('app.use(express.json')));

const app = fs.readFileSync('src/App.tsx', 'utf8');
console.log("\n=== ASSISTANT MESSAGE TOOLBAR ===");
console.log(app.substring(app.indexOf('const AssistantMessage ='), app.indexOf('// User Message Bubble')));

console.log("\n=== PLUS MENU ITEMS ===");
const plusIdx = app.indexOf('id="chat-attach-menu-dropdown"');
if (plusIdx !== -1) {
  console.log(app.substring(plusIdx - 100, plusIdx + 800));
} else {
  console.log("Plus menu search");
}
