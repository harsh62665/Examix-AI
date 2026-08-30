import React, { useState, useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Copy, Check, Code2, Sparkles, Volume2, Radio } from 'lucide-react';
import { VideoSceneCard } from './VideoSceneCard';
import { WhiteboardPlayer } from './WhiteboardPlayer';
import { ManimAnimationCard } from './ManimAnimationCard';
import { SvgDiagramCard, sanitizeSvg, ImageLightboxModal } from './SvgDiagramCard';
import { getSpeechHighlightInfo, isBlockActiveForSpeech } from '../utils/speechConverter';

export interface MarkdownRendererProps {
  content: string;
  className?: string;
  isSpeaking?: boolean;
  speechCharIndex?: number;
  spokenText?: string;
}

/**
 * Strip all mathematical alphanumeric symbols, fraktur, and gothic unicode glyphs.
 * Normalizes stylized / decorative Unicode text (Mathematical Bold, Fraktur,
 * Gothic, Script, Double-struck, Fullwidth, Sans-serif, Monospace, and Digits) into clean standard ASCII.
 */
export function normalizeToPlainAscii(str: string): string {
  if (!str) return '';
  return str.normalize('NFKD').replace(/[\u{1D400}-\u{1D7FF}]/gu, (char) => {
    const code = char.codePointAt(0)!;
    // Normalize Math Bold / Fraktur to standard ASCII
    if (code >= 0x1D400 && code <= 0x1D419) return String.fromCharCode(code - 0x1D400 + 65); // A-Z
    if (code >= 0x1D41A && code <= 0x1D433) return String.fromCharCode(code - 0x1D41A + 97); // a-z
    if (code >= 0x1D434 && code <= 0x1D44D) return String.fromCharCode(code - 0x1D434 + 65); // Italic A-Z
    if (code >= 0x1D44E && code <= 0x1D467) return String.fromCharCode(code - 0x1D44E + 97); // Italic a-z
    if (code >= 0x1D468 && code <= 0x1D481) return String.fromCharCode(code - 0x1D468 + 65); // Bold Italic A-Z
    if (code >= 0x1D482 && code <= 0x1D49B) return String.fromCharCode(code - 0x1D482 + 97); // Bold Italic a-z
    if (code >= 0x1D49C && code <= 0x1D4B5) return String.fromCharCode(code - 0x1D49C + 65); // Script A-Z
    if (code >= 0x1D4B6 && code <= 0x1D4CF) return String.fromCharCode(code - 0x1D4B6 + 97); // Script a-z
    if (code >= 0x1D4D0 && code <= 0x1D4E9) return String.fromCharCode(code - 0x1D4D0 + 65); // Bold Script A-Z
    if (code >= 0x1D4EA && code <= 0x1D503) return String.fromCharCode(code - 0x1D4EA + 97); // Bold Script a-z
    if (code >= 0x1D504 && code <= 0x1D51C) return String.fromCharCode(code - 0x1D504 + 65); // Fraktur A-Z
    if (code >= 0x1D51E && code <= 0x1D537) return String.fromCharCode(code - 0x1D51E + 97); // Fraktur a-z
    if (code >= 0x1D538 && code <= 0x1D551) return String.fromCharCode(code - 0x1D538 + 65); // Double-struck A-Z
    if (code >= 0x1D552 && code <= 0x1D56B) return String.fromCharCode(code - 0x1D552 + 97); // Double-struck a-z
    if (code >= 0x1D56C && code <= 0x1D585) return String.fromCharCode(code - 0x1D56C + 65); // Bold Fraktur A-Z
    if (code >= 0x1D586 && code <= 0x1D59F) return String.fromCharCode(code - 0x1D586 + 97); // Bold Fraktur a-z
    if (code >= 0x1D5A0 && code <= 0x1D5B9) return String.fromCharCode(code - 0x1D5A0 + 65); // Sans-serif A-Z
    if (code >= 0x1D5BA && code <= 0x1D5D3) return String.fromCharCode(code - 0x1D5BA + 97); // Sans-serif a-z
    if (code >= 0x1D5D4 && code <= 0x1D5ED) return String.fromCharCode(code - 0x1D5D4 + 65); // Sans-serif Bold A-Z
    if (code >= 0x1D5EE && code <= 0x1D607) return String.fromCharCode(code - 0x1D5EE + 97); // Sans-serif Bold a-z
    if (code >= 0x1D608 && code <= 0x1D621) return String.fromCharCode(code - 0x1D621 + 65); // Sans-serif Italic A-Z
    if (code >= 0x1D622 && code <= 0x1D63B) return String.fromCharCode(code - 0x1D622 + 97); // Sans-serif Italic a-z
    if (code >= 0x1D63C && code <= 0x1D655) return String.fromCharCode(code - 0x1D63C + 65); // Sans-serif Bold Italic A-Z
    if (code >= 0x1D656 && code <= 0x1D66F) return String.fromCharCode(code - 0x1D656 + 97); // Sans-serif Bold Italic a-z
    if (code >= 0x1D670 && code <= 0x1D689) return String.fromCharCode(code - 0x1D670 + 65); // Monospace A-Z
    if (code >= 0x1D68A && code <= 0x1D6A3) return String.fromCharCode(code - 0x1D68A + 97); // Monospace a-z
    if (code >= 0x1D7CE && code <= 0x1D7D7) return String.fromCharCode(code - 0x1D7CE + 48); // Digits 0-9
    return char;
  });
}

/**
 * Normalizes stylized / decorative Unicode text (Mathematical Bold, Fraktur,
 * Gothic, Script, Double-struck, Fullwidth, Sans-serif, Monospace, etc.) into clean standard ASCII.
 * Completely purges glyphs like 𝕰𝖝𝖆𝖒𝖎𝖝 -> Examix.
 */
export function normalizeDecorativeUnicode(text: string): string {
  if (!text) return '';

  // 1. Direct codepoint decomposition and regex normalization for Mathematical Alphanumeric Symbols
  let result = normalizeToPlainAscii(text);

  // 2. Comprehensive Letterlike & Special Enclosed unicode symbol map
  const specialMap: Record<string, string> = {
    'ℬ': 'B', 'ℭ': 'C', 'ℰ': 'E', 'ℱ': 'F', 'ℋ': 'H', 'ℑ': 'I', 'ℐ': 'I', 'ℒ': 'L', 'ℳ': 'M',
    'ℛ': 'R', 'ℨ': 'Z', 'ℯ': 'e', 'ℊ': 'g', 'ℴ': 'o', 'ℵ': 'Aleph', 'ℶ': 'Bet',
    'ℂ': 'C', 'ℍ': 'H', 'ℕ': 'N', 'ℙ': 'P', 'ℚ': 'Q', 'ℝ': 'R', 'ℤ': 'Z',
    'ⓐ': 'a', 'ⓑ': 'b', 'ⓒ': 'c', 'ⓓ': 'd', 'ⓔ': 'e', 'ⓕ': 'f', 'ⓖ': 'g', 'ⓗ': 'h', 'ⓘ': 'i',
    'ⓙ': 'j', 'ⓚ': 'k', 'ⓛ': 'l', 'ⓜ': 'm', 'ⓝ': 'n', 'ⓞ': 'o', 'ⓟ': 'p', 'ⓠ': 'q', 'ⓡ': 'r',
    'ⓢ': 's', 'ⓣ': 't', 'ⓤ': 'u', 'ⓥ': 'v', 'ⓦ': 'w', 'ⓧ': 'x', 'ⓨ': 'y', 'ⓩ': 'z',
    'Ⓐ': 'A', 'Ⓑ': 'B', 'Ⓒ': 'C', 'Ⓓ': 'D', 'Ⓔ': 'E', 'Ⓕ': 'F', 'Ⓖ': 'G', 'Ⓗ': 'H', 'Ⓘ': 'I',
    'Ⓙ': 'J', 'Ⓚ': 'K', 'Ⓛ': 'L', 'Ⓜ': 'M', 'Ⓝ': 'N', 'Ⓞ': 'O', 'Ⓟ': 'P', 'Ⓠ': 'Q', 'Ⓡ': 'R',
    'Ⓢ': 'S', 'Ⓣ': 'T', 'Ⓤ': 'U', 'Ⓥ': 'V', 'Ⓦ': 'W', 'Ⓧ': 'X', 'Ⓨ': 'Y', 'Ⓩ': 'Z'
  };

  result = result.replace(/[ℬℭℰℱℋℑℐℒℳℛℨℯℊℴℂℍℕℙℚℝℤⓐ-ⓩⒶ-Ⓩ]/g, (ch) => specialMap[ch] || ch);

  // 3. Purge any remaining surrogate pairs in math alphanumeric block
  result = result.replace(/[\uD835][\uDC00-\uDFFF]/g, (surrogate) => surrogate.normalize('NFKD'));

  // 4. Normalize LaTeX brackets \( ... \) to $ ... $ and \[ ... \] to $$ ... $$ for robust KaTeX rendering
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, '$$\n$1\n$$');
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

  return result;
}

/**
 * Sanitizes markdown content to resolve unclosed code fences, leaking SVG code blocks,
 * and accidental monospace wrapper blocks around regular explanations.
 */
export function sanitizeMarkdownTrapping(raw: string): string {
  if (!raw) return '';
  let text = normalizeDecorativeUnicode(raw);

  // 1. If the entire response was wrapped in ```markdown ... ``` or ```text ... ``` or ```code ... ```, unwrap it
  const fullFenceMatch = /^```(?:markdown|text|code|md|plain|txt)?\s*\n([\s\S]*?)\n```\s*$/i.exec(text.trim());
  if (
    fullFenceMatch &&
    (fullFenceMatch[1].includes('###') ||
      fullFenceMatch[1].includes('$$') ||
      fullFenceMatch[1].includes('<svg') ||
      fullFenceMatch[1].includes('⚠️') ||
      fullFenceMatch[1].includes('🎯') ||
      fullFenceMatch[1].includes('🧠') ||
      fullFenceMatch[1].includes('**') ||
      /^\s*(?:\d+\.|\*|-)\s+/m.test(fullFenceMatch[1]))
  ) {
    text = fullFenceMatch[1];
  }

  // 2. Unwrap any embedded ```markdown ... ``` or ```text ... ``` or ```code ... ``` blocks containing regular prose/headings/math
  text = text.replace(/```(?:markdown|text|code|md|plain|txt)?\s*\n([\s\S]*?)\n```/gi, (match, inner) => {
    if (
      inner.includes('###') ||
      inner.includes('$$') ||
      inner.includes('⚠️') ||
      inner.includes('🎯') ||
      inner.includes('🧠') ||
      inner.includes('📝') ||
      inner.includes('📐') ||
      inner.includes('📌') ||
      inner.includes('**') ||
      inner.includes('\\vec{') ||
      inner.includes('\\frac{') ||
      /^\s*(?:\d+\.|\*|-)\s+[A-Za-z]/m.test(inner)
    ) {
      return `\n\n${inner.trim()}\n\n`;
    }
    return match;
  });

  // 3. Fix unclosed SVG code block leaking into subsequent markdown:
  // e.g. ```xml\n<svg ...>...</svg>\n### Next Heading
  text = text.replace(/```(?:xml|svg|html)?\s*(<svg[\s\S]*?<\/svg>)\s*```?/gi, '$1');

  // 4. If an unclosed ``` was opened before <svg> but not closed, or text after </svg> was trapped inside the code fence:
  text = text.replace(/```(?:xml|svg|html)?\s*(<svg[\s\S]*?<\/svg>)([\s\S]*?)(?=```|$)/gi, (match, svg, after) => {
    if (
      after.trim().length > 0 &&
      (after.includes('###') || after.includes('$$') || after.includes('**') || after.includes('⚠️') || after.includes('1. ') || after.includes('* '))
    ) {
      return `\n\n${svg}\n\n${after.trim()}\n\n`;
    }
    return match;
  });

  // 5. Remove accidental leading ```code or ```markdown if unclosed at top of text
  if (/^```(?:markdown|text|code|md|plain|txt)?\s*\n/i.test(text.trim()) && !text.trim().endsWith('```')) {
    text = text.trim().replace(/^```(?:markdown|text|code|md|plain|txt)?\s*\n/i, '');
  }

  return text;
}

interface ContentBlock {
  type: 'markdown' | 'svg' | 'video_scene' | 'whiteboard' | 'next_steps';
  content: string;
}

function parseBlocks(rawText: string): ContentBlock[] {
  if (!rawText) return [];

  const sanitized = sanitizeMarkdownTrapping(rawText);

  // Match:
  // 1. Complete <svg ... </svg>
  // 2. [VIDEO_SCENE: ...] or [VIDEO_SCENE]...[/VIDEO_SCENE]
  // 3. [WHITEBOARD_SEQUENCE]...[/WHITEBOARD_SEQUENCE]
  // 4. [NEXT_STEPS]...[/NEXT_STEPS]
  const pattern = /(<svg[\s\S]*?<\/svg>|\[VIDEO_SCENE:[\s\S]*?\]|\[VIDEO_SCENE\][\s\S]*?\[\/VIDEO_SCENE\]|\[WHITEBOARD_SEQUENCE\][\s\S]*?\[\/WHITEBOARD_SEQUENCE\]|\[NEXT_STEPS\][\s\S]*?\[\/NEXT_STEPS\])/gi;
  const parts = sanitized.split(pattern);
  const blocks: ContentBlock[] = [];

  for (const part of parts) {
    if (!part) continue;
    const trimmed = part.trim();
    if (trimmed.toLowerCase().startsWith('<svg') && trimmed.toLowerCase().endsWith('</svg>')) {
      blocks.push({ type: 'svg', content: trimmed });
    } else if (
      trimmed.toUpperCase().startsWith('[VIDEO_SCENE:') ||
      (trimmed.toUpperCase().startsWith('[VIDEO_SCENE]') && trimmed.toUpperCase().endsWith('[/VIDEO_SCENE]'))
    ) {
      blocks.push({ type: 'video_scene', content: trimmed });
    } else if (
      trimmed.toUpperCase().startsWith('[WHITEBOARD_SEQUENCE]') &&
      trimmed.toUpperCase().endsWith('[/WHITEBOARD_SEQUENCE]')
    ) {
      blocks.push({ type: 'whiteboard', content: trimmed });
    } else if (
      trimmed.toUpperCase().startsWith('[NEXT_STEPS]') &&
      trimmed.toUpperCase().endsWith('[/NEXT_STEPS]')
    ) {
      blocks.push({ type: 'next_steps', content: trimmed });
    } else {
      let mdText = part;
      // Auto-heal any odd count of unclosed triple backticks
      const backtickCount = (mdText.match(/```/g) || []).length;
      if (backtickCount % 2 !== 0) {
        mdText += '\n```';
      }
      blocks.push({ type: 'markdown', content: mdText });
    }
  }

  return blocks;
}

// Recursively extracts plain text from React nodes
function extractRawText(node: React.ReactNode): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractRawText).join(' ');
  }
  if (React.isValidElement(node) && (node.props as any)?.children) {
    return extractRawText((node.props as any).children);
  }
  return '';
}

// Clean a token for word alignment
function cleanWordToken(w: string): string {
  return w.replace(/^[^\w]+|[^\w]+$/g, '').toLowerCase().trim();
}

// Highlights specific active spoken word inside React text nodes with fluid karaoke-style word tracking
function highlightNode(
  node: React.ReactNode,
  activeWord: string,
  isBlockActive: boolean,
  sentenceWords: string[] = [],
  activeWordIndex: number = -1,
  rawBlockText: string = ''
): React.ReactNode {
  if (!isBlockActive || !activeWord) return node;

  const cleanActive = cleanWordToken(activeWord);
  if (!cleanActive || cleanActive.length < 1) return node;

  // Tokenize the block's text to find sentence start offset within the block
  const blockWords = rawBlockText
    .split(/\s+/)
    .map(cleanWordToken)
    .filter(Boolean);

  let sentenceStartInBlock = 0;
  if (sentenceWords && sentenceWords.length > 0 && blockWords.length > 0) {
    const cleanSentWords = sentenceWords.map(cleanWordToken).filter(Boolean);
    const firstFew = cleanSentWords.filter(w => w.length > 1).slice(0, 3);
    
    if (firstFew.length > 0) {
      for (let i = 0; i <= blockWords.length - firstFew.length; i++) {
        let match = true;
        for (let j = 0; j < firstFew.length; j++) {
          if (blockWords[i + j] !== firstFew[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          sentenceStartInBlock = i;
          break;
        }
      }
    }
  }

  const targetWordIndexInBlock = sentenceStartInBlock + Math.max(0, activeWordIndex);

  interface HighlightContext {
    cleanActive: string;
    targetWordIndex: number;
    sentenceStartIndex: number;
    wordCounter: number;
    hasMatched: boolean;
  }

  const context: HighlightContext = {
    cleanActive,
    targetWordIndex: targetWordIndexInBlock,
    sentenceStartIndex: sentenceStartInBlock,
    wordCounter: 0,
    hasMatched: false,
  };

  function traverse(n: React.ReactNode): React.ReactNode {
    if (n === null || n === undefined) return n;

    if (typeof n === 'string') {
      if (!n.trim()) return n;

      const tokens = n.split(/(\s+|[.,!?;:()\[\]{}"'`\\\/]+)/);

      return tokens.map((token, idx) => {
        const cleanToken = cleanWordToken(token);

        if (cleanToken.length > 0) {
          const currentWordPos = context.wordCounter;
          context.wordCounter++;

          const isDirectIndexMatch = currentWordPos === context.targetWordIndex;
          const isFuzzyMatch =
            Math.abs(currentWordPos - context.targetWordIndex) <= 2 &&
            (cleanToken === context.cleanActive ||
              (cleanToken.length > 3 &&
                context.cleanActive.length > 3 &&
                (cleanToken.startsWith(context.cleanActive) || context.cleanActive.startsWith(cleanToken))));

          // Active spoken karaoke word
          if (!context.hasMatched && (isDirectIndexMatch || isFuzzyMatch)) {
            context.hasMatched = true;
            return (
              <mark
                key={`mark-${idx}-${currentWordPos}`}
                className="bg-[#4ADE80] text-[#0A0A0B] font-bold px-1.5 py-0.5 rounded-md shadow-[0_0_16px_rgba(74,222,128,0.95)] inline-block scale-[1.06] transition-all duration-150 not-italic ring-2 ring-[#4ADE80] mx-0.5 align-baseline"
              >
                {token}
              </mark>
            );
          }

          // Already spoken words in the sentence (karaoke trail)
          if (currentWordPos >= context.sentenceStartIndex && currentWordPos < context.targetWordIndex) {
            return (
              <span
                key={`past-${idx}-${currentWordPos}`}
                className="text-emerald-300 font-medium transition-colors duration-150"
              >
                {token}
              </span>
            );
          }
        }
        return token;
      });
    }

    if (Array.isArray(n)) {
      return n.map((child, i) => (
        <React.Fragment key={i}>
          {traverse(child)}
        </React.Fragment>
      ));
    }

    if (React.isValidElement(n)) {
      // Preserve raw code, SVGs, preformatted and math equations
      if (typeof n.type === 'string' && ['pre', 'code', 'svg', 'table', 'img'].includes(n.type)) {
        return n;
      }
      const props = n.props as any;
      if (props && props.children) {
        return React.cloneElement(n, {
          ...props,
          children: traverse(props.children),
        } as any);
      }
      return n;
    }

    return n;
  }

  return traverse(node);
}

// Component to render code blocks with a clean copy button and Manim animation integration
function CodeBlock({ node, inline, className, children, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1].toLowerCase() : '';
  const textContent = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    const raw = String(children);
    // If inline code is accidentally wrapping a whole sentence, formula, heading, or markdown syntax:
    if (
      raw.length > 70 ||
      raw.includes('\n') ||
      raw.includes('$$') ||
      raw.includes('$') ||
      raw.startsWith('#') ||
      raw.includes('**') ||
      raw.includes('\\vec') ||
      raw.includes('\\frac')
    ) {
      return <span className="text-gray-200">{children}</span>;
    }
    return (
      <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-emerald-300" {...props}>
        {children}
      </code>
    );
  }

  // If code block is an svg block written in code fences, render it cleanly with extra margins & 1-click fullscreen lightbox
  if ((lang === 'svg' || lang === 'xml') && textContent.trim().startsWith('<svg') && textContent.trim().endsWith('</svg>')) {
    return (
      <SvgDiagramCard svgContent={textContent} />
    );
  }

  // If code block is Manim Python Animation script
  if (lang === 'manim' || (lang === 'python' && (textContent.includes('from manim import') || textContent.includes('import manim') || textContent.includes('Scene(')))) {
    return (
      <div className="my-6 sm:my-8">
        <ManimAnimationCard code={textContent} />
      </div>
    );
  }

  // Safety net: Check if the block is actually regular text, math, revision note, or markdown rather than genuine source code
  const isActualProgrammingCode =
    ['javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx', 'python', 'py', 'html', 'css', 'json', 'cpp', 'c', 'java', 'rust', 'go', 'sql', 'bash', 'sh'].includes(lang) &&
    !textContent.includes('###') &&
    !textContent.includes('$$') &&
    !textContent.includes('⚠️') &&
    !textContent.includes('🎯') &&
    !textContent.includes('🧠') &&
    !textContent.includes('📝') &&
    !textContent.includes('📐') &&
    !textContent.includes('📌') &&
    !/^\s*(?:\d+\.|\*|-|#)\s+[A-Za-z]/m.test(textContent);

  if (
    !isActualProgrammingCode &&
    (!lang ||
      ['markdown', 'md', 'text', 'code', 'plain', 'txt', 'none', ''].includes(lang) ||
      textContent.includes('###') ||
      textContent.includes('$$') ||
      textContent.includes('⚠️') ||
      textContent.includes('🎯') ||
      textContent.includes('🧠') ||
      textContent.includes('📝') ||
      textContent.includes('📐') ||
      textContent.includes('📌') ||
      textContent.includes('**') ||
      textContent.includes('\\vec{') ||
      textContent.includes('\\frac{') ||
      textContent.includes('\\times') ||
      /^\s*(?:\d+\.|\*|-)\s+[A-Za-z]/m.test(textContent))
  ) {
    return (
      <div className="my-4 text-gray-200 leading-relaxed">
        <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {textContent}
        </Markdown>
      </div>
    );
  }

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-white/10 bg-[#0F0F11] shadow-lg">
      <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-3.5 py-1.5 text-xs text-gray-400">
        <span className="flex items-center gap-1.5 font-mono text-gray-300">
          <Code2 size={13} className="text-blue-400" />
          {lang || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs text-gray-200 leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default function MarkdownRenderer({
  content,
  className = '',
  isSpeaking = false,
  speechCharIndex = 0,
  spokenText = ''
}: MarkdownRendererProps) {
  const [activeImageLightbox, setActiveImageLightbox] = useState<{ src: string; alt?: string } | null>(null);
  const blocks = useMemo(() => parseBlocks(content), [content]);

  // Compute live speech highlight context
  const highlightInfo = useMemo(() => {
    if (!isSpeaking || !spokenText) {
      return {
        activeSentence: '',
        activeWord: '',
        charIndex: 0,
        progress: 0,
        wordStart: 0,
        wordEnd: 0,
        sentenceWords: [],
        activeWordIndexInSentence: -1
      };
    }
    return getSpeechHighlightInfo(spokenText, speechCharIndex);
  }, [isSpeaking, spokenText, speechCharIndex]);

  const { activeSentence, activeWord, progress, sentenceWords, activeWordIndexInSentence } = highlightInfo;

  return (
    <div className={`markdown-body space-y-3 relative ${className}`}>
      {/* Live Karaoke / Follow-along Floating HUD during Speech Synthesis */}
      {isSpeaking && (
        <div className="sticky top-0 z-30 mb-4 rounded-xl border border-[#4ADE80]/40 bg-[#101412]/95 p-3 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition-all duration-300 animate-fade-in">
          <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4ADE80]"></span>
              </span>
              <span className="font-semibold text-[#4ADE80] uppercase tracking-wider text-[11px] shrink-0 flex items-center gap-1.5">
                <Radio size={13} className="text-[#4ADE80] animate-pulse" /> Live Narration
              </span>
              {activeWord && (
                <span className="truncate rounded-md bg-[#4ADE80]/20 px-2 py-0.5 font-mono text-[11px] font-bold text-[#4ADE80] border border-[#4ADE80]/40 shadow-sm">
                  "{activeWord}"
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono text-gray-300 font-medium">
                {Math.round(progress * 100)}%
              </span>
            </div>
          </div>

          {/* Current Spoken Sentence Ticker */}
          {activeSentence && (
            <p className="text-xs text-gray-200 italic px-1 line-clamp-1 border-l-2 border-[#4ADE80]/70 pl-2 my-1">
              "{activeSentence}"
            </p>
          )}

          {/* Smooth Speech Progress Bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 mt-2">
            <div
              className="h-full bg-gradient-to-r from-[#4ADE80] via-emerald-400 to-teal-300 rounded-full transition-all duration-150 ease-out shadow-[0_0_10px_rgba(74,222,128,0.8)]"
              style={{ width: `${Math.min(100, Math.max(2, progress * 100))}%` }}
            />
          </div>
        </div>
      )}

      {blocks.map((block, index) => {
        if (block.type === 'svg') {
          return (
            <SvgDiagramCard key={`svg-${index}`} svgContent={block.content} />
          );
        }

        if (block.type === 'video_scene') {
          return <VideoSceneCard key={`video-scene-${index}`} promptText={block.content} />;
        }

        if (block.type === 'whiteboard') {
          return <WhiteboardPlayer key={`whiteboard-${index}`} rawSequenceText={block.content} />;
        }

        if (block.type === 'next_steps') {
          // Handled natively by interactive prompt pills in the message container
          return null;
        }

        return (
          <div key={`md-${index}`}>
            <Markdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code: CodeBlock,
                p: ({ children, ...props }) => {
                  const rawText = extractRawText(children);
                  const isBlockActive = isSpeaking && !!activeSentence && isBlockActiveForSpeech(rawText, activeSentence);

                  return (
                    <p
                      className={`leading-relaxed transition-all duration-300 ${
                        isBlockActive
                          ? 'rounded-xl bg-[#4ADE80]/[0.08] border-l-4 border-[#4ADE80] px-3.5 py-2 my-2 shadow-[0_0_20px_rgba(74,222,128,0.12)] text-white font-normal ring-1 ring-[#4ADE80]/20'
                          : 'my-2 text-gray-200'
                      }`}
                      {...props}
                    >
                      {highlightNode(children, activeWord, isBlockActive, sentenceWords, activeWordIndexInSentence, rawText)}
                    </p>
                  );
                },
                li: ({ children, ...props }) => {
                  const rawText = extractRawText(children);
                  const isBlockActive = isSpeaking && !!activeSentence && isBlockActiveForSpeech(rawText, activeSentence);

                  return (
                    <li
                      className={`leading-relaxed transition-all duration-300 ${
                        isBlockActive
                          ? 'rounded-lg bg-[#4ADE80]/[0.08] border-l-4 border-[#4ADE80] px-2.5 py-1.5 my-1 text-white shadow-[0_0_15px_rgba(74,222,128,0.1)] ring-1 ring-[#4ADE80]/20'
                          : 'my-1 text-gray-300'
                      }`}
                      {...props}
                    >
                      {highlightNode(children, activeWord, isBlockActive, sentenceWords, activeWordIndexInSentence, rawText)}
                    </li>
                  );
                },
                h1: ({ children, ...props }) => {
                  const rawText = extractRawText(children);
                  const isBlockActive = isSpeaking && !!activeSentence && isBlockActiveForSpeech(rawText, activeSentence);
                  return (
                    <h1
                      className={`text-xl font-bold text-gray-100 my-4 transition-all duration-300 ${
                        isBlockActive ? 'text-[#4ADE80] border-l-4 border-[#4ADE80] pl-2.5' : ''
                      }`}
                      {...props}
                    >
                      {highlightNode(children, activeWord, isBlockActive, sentenceWords, activeWordIndexInSentence, rawText)}
                    </h1>
                  );
                },
                h2: ({ children, ...props }) => {
                  const rawText = extractRawText(children);
                  const isBlockActive = isSpeaking && !!activeSentence && isBlockActiveForSpeech(rawText, activeSentence);
                  return (
                    <h2
                      className={`text-lg font-bold text-gray-200 my-3 transition-all duration-300 ${
                        isBlockActive ? 'text-[#4ADE80] border-l-4 border-[#4ADE80] pl-2' : ''
                      }`}
                      {...props}
                    >
                      {highlightNode(children, activeWord, isBlockActive, sentenceWords, activeWordIndexInSentence, rawText)}
                    </h2>
                  );
                },
                h3: ({ children, ...props }) => {
                  const rawText = extractRawText(children);
                  const isBlockActive = isSpeaking && !!activeSentence && isBlockActiveForSpeech(rawText, activeSentence);
                  return (
                    <h3
                      className={`text-base font-semibold text-gray-200 my-2 transition-all duration-300 ${
                        isBlockActive ? 'text-[#4ADE80] border-l-4 border-[#4ADE80] pl-2' : ''
                      }`}
                      {...props}
                    >
                      {highlightNode(children, activeWord, isBlockActive, sentenceWords, activeWordIndexInSentence, rawText)}
                    </h3>
                  );
                },
                h4: ({ children, ...props }) => {
                  const rawText = extractRawText(children);
                  const isBlockActive = isSpeaking && !!activeSentence && isBlockActiveForSpeech(rawText, activeSentence);
                  return (
                    <h4
                      className={`text-sm font-semibold text-gray-200 my-1.5 transition-all duration-300 ${
                        isBlockActive ? 'text-[#4ADE80] border-l-4 border-[#4ADE80] pl-2' : ''
                      }`}
                      {...props}
                    >
                      {highlightNode(children, activeWord, isBlockActive, sentenceWords, activeWordIndexInSentence, rawText)}
                    </h4>
                  );
                },
                h5: ({ children, ...props }) => {
                  const rawText = extractRawText(children);
                  const isBlockActive = isSpeaking && !!activeSentence && isBlockActiveForSpeech(rawText, activeSentence);
                  return (
                    <h5
                      className={`text-xs font-semibold uppercase tracking-wider text-gray-300 my-1.5 transition-all duration-300 ${
                        isBlockActive ? 'text-[#4ADE80] border-l-4 border-[#4ADE80] pl-2' : ''
                      }`}
                      {...props}
                    >
                      {highlightNode(children, activeWord, isBlockActive, sentenceWords, activeWordIndexInSentence, rawText)}
                    </h5>
                  );
                },
                h6: ({ children, ...props }) => {
                  const rawText = extractRawText(children);
                  const isBlockActive = isSpeaking && !!activeSentence && isBlockActiveForSpeech(rawText, activeSentence);
                  return (
                    <h6
                      className={`text-xs font-medium text-gray-300 my-1 transition-all duration-300 ${
                        isBlockActive ? 'text-[#4ADE80] border-l-4 border-[#4ADE80] pl-2' : ''
                      }`}
                      {...props}
                    >
                      {highlightNode(children, activeWord, isBlockActive, sentenceWords, activeWordIndexInSentence, rawText)}
                    </h6>
                  );
                },
                blockquote: ({ children, ...props }) => {
                  const rawText = extractRawText(children);
                  const isBlockActive = isSpeaking && !!activeSentence && isBlockActiveForSpeech(rawText, activeSentence);
                  
                  const isDecayRetentionCheck = rawText.includes('15-Day Memory Retention Check') ||
                                              rawText.includes('Memory Retention Check') ||
                                              rawText.includes('Spaced Repetition Check') ||
                                              rawText.includes('Ebbinghaus');

                  const isRecallCheck = rawText.includes('Spontaneous Memory Check') || 
                                       rawText.includes('Quick 10-Second Recall Check') || 
                                       rawText.includes('10-Second Recall') ||
                                       rawText.includes('Memory Check');

                  if (isDecayRetentionCheck) {
                    return (
                      <div className={`my-4 overflow-hidden rounded-2xl border transition-all duration-300 ${
                        isBlockActive
                          ? 'border-amber-400 bg-gradient-to-br from-[#2A1D0D] via-[#1F160A] to-[#120D05] shadow-[0_0_25px_rgba(251,191,36,0.25)] ring-1 ring-amber-400/40'
                          : 'border-amber-500/40 bg-gradient-to-br from-[#1C1408] via-[#140E06] to-[#0A0703] shadow-xl'
                      }`}>
                        <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-3.5 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                              🧠 15-Day Memory Retention Check
                            </span>
                          </div>
                          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <span>🛡️</span> Ebbinghaus Decay Engine
                          </span>
                        </div>
                        <div className="p-3.5 sm:p-4 text-sm text-amber-50/95 italic leading-relaxed">
                          {highlightNode(children, activeWord, isBlockActive, sentenceWords, activeWordIndexInSentence, rawText)}
                        </div>
                        <div className="px-3.5 py-1.5 bg-black/30 border-t border-amber-500/10 flex items-center justify-between text-[10px] text-amber-300/70">
                          <span>1-3-7-15 Day Spaced Repetition</span>
                          <span>3 Correct Checks = 🛡️ Permanent Lock</span>
                        </div>
                      </div>
                    );
                  }

                  if (isRecallCheck) {
                    return (
                      <div className={`my-4 overflow-hidden rounded-2xl border transition-all duration-300 ${
                        isBlockActive
                          ? 'border-[#4ADE80] bg-gradient-to-br from-[#12271F] via-[#0E1F18] to-[#0A1713] shadow-[0_0_25px_rgba(74,222,128,0.25)] ring-1 ring-[#4ADE80]/40'
                          : 'border-emerald-500/40 bg-gradient-to-br from-[#0D1C17] via-[#0A1713] to-[#060D0B] shadow-lg'
                      }`}>
                        <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full bg-[#4ADE80] animate-ping" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4ADE80] flex items-center gap-1.5">
                              🔄 Spontaneous Memory Check
                            </span>
                          </div>
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                            ⚡ 10–15s Recall Check
                          </span>
                        </div>
                        <div className="p-3.5 sm:p-4 text-sm text-gray-100 italic leading-relaxed">
                          {highlightNode(children, activeWord, isBlockActive, sentenceWords, activeWordIndexInSentence, rawText)}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <blockquote
                      className={`my-3 border-l-4 pl-4 py-1.5 italic transition-all duration-300 rounded-r-xl ${
                        isBlockActive
                          ? 'border-[#4ADE80] bg-[#4ADE80]/[0.1] text-white shadow-[0_0_15px_rgba(74,222,128,0.12)]'
                          : 'border-emerald-500/40 bg-white/[0.02] text-gray-300'
                      }`}
                      {...props}
                    >
                      {highlightNode(children, activeWord, isBlockActive, sentenceWords, activeWordIndexInSentence, rawText)}
                    </blockquote>
                  );
                },
                a: ({ href, children, ...props }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline hover:text-emerald-300 font-medium"
                    {...props}
                  >
                    {children}
                  </a>
                ),
                table: ({ children, ...props }) => (
                  <div className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30">
                    <table className="w-full text-left text-xs text-gray-300 divide-y divide-white/10" {...props}>
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children, ...props }) => (
                  <th className="bg-white/5 px-3 py-2 font-semibold text-gray-200" {...props}>
                    {children}
                  </th>
                ),
                td: ({ children, ...props }) => (
                  <td className="px-3 py-2 border-t border-white/5" {...props}>
                    {children}
                  </td>
                ),
                img: ({ src, alt, ...props }) => (
                  <span
                    onClick={() => {
                      if (src) {
                        setActiveImageLightbox({ src, alt: alt || 'Diagram / Image View' });
                      }
                    }}
                    className="group relative my-4 block overflow-hidden rounded-2xl border border-white/15 bg-black/40 shadow-xl max-w-2xl mx-auto cursor-zoom-in transition-all duration-200 hover:border-[#4ADE80]/50 hover:shadow-[0_0_25px_rgba(74,222,128,0.15)]"
                    title="Click or tap to inspect full-screen with zoom & pan"
                  >
                    <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/70 px-2.5 py-1 text-[11px] font-medium text-emerald-300 opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 shadow-md pointer-events-none">
                      <Sparkles size={12} className="text-[#4ADE80]" />
                      <span>Full Screen</span>
                    </div>
                    <img
                      src={src}
                      alt={alt || 'Visual Diagram'}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-auto max-h-[500px] object-contain rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]"
                      {...props}
                    />
                    {alt && alt !== 'image' && (
                      <span className="block px-4 py-2 text-center text-xs text-gray-400 border-t border-white/5 bg-white/[0.02]">
                        {alt}
                      </span>
                    )}
                  </span>
                )
              }}
            >
              {block.content}
            </Markdown>
          </div>
        );
      })}

      {/* Interactive Fullscreen Image Lightbox Modal */}
      {activeImageLightbox && (
        <ImageLightboxModal
          src={activeImageLightbox.src}
          alt={activeImageLightbox.alt}
          onClose={() => setActiveImageLightbox(null)}
        />
      )}
    </div>
  );
}
