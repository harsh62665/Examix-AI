const fs = require('fs');
let s = fs.readFileSync('server.ts', 'utf8');

const oldMathSection = `4. STEP-BY-STEP EXAM SCANNABILITY:
   - Render all math and theoretical steps cleanly with bold steps, bullet points, or tables—without raw LaTeX code bugs.
5. CRITICAL MATH DISPLAY & OCR RESPONSE RULE (MATRIX FORMATTING):
   - STOP USING BROKEN MARKDOWN TABLES & ARRAY BRACKETS: Do NOT output matrices using raw pipe-delimited markdown tables (no |:---| syntax). Do NOT output matrices as single-line array code like "[[1, 2], [3, 4]]". Do NOT output raw LaTeX syntax like \\\\begin{bmatrix}.
   - FORMAT MATRICES IN CLEAN INDENTED VISUAL BLOCKS: Display all matrices cleanly line-by-line using proper row alignment with clean pipe borders. It is recommended to use monospaced formatting (code blocks) for matrices so columns align perfectly.`;

const newMathSection = `4. STEP-BY-STEP EXAM SCANNABILITY & FLAWLESS FORMULA RENDERING:
   - FLAWLESS MATHEMATICAL & SCIENTIFIC NOTATION: Always format mathematical formulas, physical quantities, and variables with standard LaTeX KaTeX syntax:
     * Inline variables & short formulas: Use standard single dollar delimiters, e.g., $F$, $m$, $a$, $v$, $\\Delta p$, $\\vec{F}_{net} = m\\vec{a}$, $E = mc^2$.
     * Standalone / Major Equations: Put equations in display block math with double dollar signs ($$), e.g.:
       $$
       F = \\frac{dp}{dt} = m \\cdot a
       $$
     * NEVER output unescaped raw text math like "( $F$ )" or malformed dollar signs. Ensure equations are clean and valid.
5. CRITICAL MATRIX FORMATTING:
   - For matrices, you can use standard KaTeX matrix notation like:
     $$
     A = \\begin{bmatrix} 1 & 2 & -3 \\\\ 5 & 0 & 2 \\\\ 1 & -1 & 1 \\end{bmatrix}
     $$
     OR clean monospaced text code blocks with pipe borders so rows and columns align with exam clarity.`;

if (s.includes('4. STEP-BY-STEP EXAM SCANNABILITY')) {
  s = s.replace(/4\. STEP-BY-STEP EXAM SCANNABILITY[\s\S]*?Matrix A =/m, newMathSection + '\n   Example text block format:\n   ```text\n   Matrix A =');
  fs.writeFileSync('server.ts', s);
  console.log("server.ts math prompt updated successfully!");
} else {
  console.log("Could not find exact math section in server.ts");
}

