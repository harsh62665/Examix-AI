const fs = require('fs');

let serverTs = fs.readFileSync('server.ts', 'utf8');

serverTs = serverTs.replace(
  `- NO GENERIC GREETINGS. Do not start with "Hello! I am Examix AI..." or similar introductory filler. Jump straight into solving the user's prompt or asking the first Socratic question.`,
  `- Do NOT start responses with introductory greetings (e.g., "Hello! I am your AI...", "Sure, here is..."). Jump directly into the answer on Sentence 1.\n   - Structure responses cleanly using standalone bold text headers, spaced bullet points, and clean typography.`
);

fs.writeFileSync('server.ts', serverTs);
