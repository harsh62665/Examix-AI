const fs = require('fs');

// 1. Update src/main.tsx to import katex CSS
let mainTsx = fs.readFileSync('src/main.tsx', 'utf8');
if (!mainTsx.includes('katex.min.css')) {
  mainTsx = `import 'katex/dist/katex.min.css';\n` + mainTsx;
  fs.writeFileSync('src/main.tsx', mainTsx);
  console.log("src/main.tsx updated with KaTeX CSS");
}

// 2. Update src/App.tsx to import remarkMath and rehypeKatex
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');
if (!appTsx.includes('remark-math')) {
  appTsx = appTsx.replace(
    "import rehypeRaw from 'rehype-raw';",
    "import rehypeRaw from 'rehype-raw';\nimport remarkMath from 'remark-math';\nimport rehypeKatex from 'rehype-katex';"
  );
  
  // Replace Markdown usage
  appTsx = appTsx.replace(
    '<Markdown rehypePlugins={[rehypeRaw]}>{msg.content}</Markdown>',
    '<Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeRaw, rehypeKatex]}>{msg.content}</Markdown>'
  );
  
  fs.writeFileSync('src/App.tsx', appTsx);
  console.log("src/App.tsx updated with remarkMath and rehypeKatex");
}

// 3. Update src/index.css with KaTeX dark-mode polish
let indexCss = fs.readFileSync('src/index.css', 'utf8');
if (!indexCss.includes('/* KaTeX Dark Theme & Math Formatting */')) {
  const katexStyles = `

/* KaTeX Dark Theme & Math Formatting */
.katex {
  font-size: 1.08em;
  color: #F1F5F9;
  letter-spacing: normal;
}

.katex-display {
  margin: 1rem 0 !important;
  padding: 0.75rem 1rem !important;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.katex-display > .katex {
  text-align: center;
  white-space: nowrap;
}

.katex .mord.mathnormal {
  color: #93C5FD; /* Soft blue tint for math variables so they pop beautifully */
}

.katex .mbin,
.katex .mrel {
  color: #4ADE80; /* Subtle green accent for operators = + - \times */
}

.katex .mord {
  color: #F8FAFC;
}
`;
  indexCss += katexStyles;
  fs.writeFileSync('src/index.css', indexCss);
  console.log("src/index.css updated with KaTeX styles");
}

