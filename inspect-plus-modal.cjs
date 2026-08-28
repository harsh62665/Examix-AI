const fs = require('fs');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const startIdx = app.indexOf('id="attach-file-btn"');
const endIdx = app.indexOf('id="chat-input-field"');
console.log(app.substring(startIdx - 100, endIdx + 50));
