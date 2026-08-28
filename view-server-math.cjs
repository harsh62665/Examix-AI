const fs = require('fs');
const s = fs.readFileSync('server.ts', 'utf8');
console.log(s.substring(s.indexOf('4. STEP-BY-STEP'), s.indexOf('6. EXCELLENCE')));
