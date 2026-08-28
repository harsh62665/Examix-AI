const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');
appTsx = appTsx.replace(
  `bg-[#1A1A1A] px-4 py-2.5 rounded-2xl rounded-tr-sm`,
  ``
);
fs.writeFileSync('src/App.tsx', appTsx);
