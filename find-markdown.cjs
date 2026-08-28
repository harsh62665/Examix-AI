const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('<Markdown') || line.includes('rehypeRaw') || line.includes('markdown-body')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
