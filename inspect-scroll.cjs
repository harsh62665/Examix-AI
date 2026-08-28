const fs = require('fs');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const lines = app.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('messagesEndRef') || line.includes('scrollTo') || line.includes('scrollIntoView') || line.includes('scrollTop') || line.includes('scrollHeight')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
