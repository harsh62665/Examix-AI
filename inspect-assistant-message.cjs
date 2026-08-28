const fs = require('fs');
const app = fs.readFileSync('src/App.tsx', 'utf8');

const startIdx = app.indexOf('const AssistantMessage =');
const endIdx = app.indexOf('// User Message Bubble');
console.log(app.substring(startIdx, endIdx));
