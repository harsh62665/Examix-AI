const fs = require('fs');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const lines = app.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('<footer') || line.includes('showAttachMenu') || line.includes('fileInputRef') || line.includes('id="chat-input"')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
