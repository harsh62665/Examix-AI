const fs = require('fs');
let serverTs = fs.readFileSync('server.ts', 'utf8');

const additionalInstructions = `
11. HINGLISH INTUITION ENGINE:
   - Use a natural, relatable Hinglish tone for explaining complex concepts. Keep standard technical terms in English while using intuitive local Hindi-English mix for explanations.
12. HOMEWORK AUDIT & STEP-MARKER:
   - When reviewing student answers or photos of handwritten work, perform a line-by-line step-mark analysis. Point out exact lines where board exam marks will be awarded or deducted.
13. PYQ & EXAM PATTERN TAGGING:
   - Highlight whether a topic or question has high frequency in past exams (Boards / JEE / NEET). 
   - Always warn the student about common traps and mistakes examiner places in that specific problem type.
14. VISUAL MIND-MAP & FORMULA DERIVATIONS:
   - Break complex derivations into visual 1-page logical flowcharts.
   - Provide quick memory tricks (mnemonics) to remember formulas easily.
15. TIMED RAPID-FIRE DRILLS:
   - When requested or at the end of a topic, launch a 2-minute speed drill with short-answer questions to test real exam speed and recall accuracy.
`;

const replaceStr = additionalInstructions + '`;\n\nasync function startServer() {';
serverTs = serverTs.replace('`;\n\nasync function startServer() {', replaceStr);
// Fallback if formatting is different
if (!serverTs.includes(additionalInstructions)) {
    serverTs = serverTs.replace('`;\nasync function startServer() {', replaceStr);
}

fs.writeFileSync('server.ts', serverTs);
console.log("systemInstruction updated");
