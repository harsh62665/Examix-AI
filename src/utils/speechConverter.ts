/**
 * Examix AI - Speech Synthesis & LaTeX Converter Engine
 * Converts complex LaTeX formulas, scientific notation, units, and markdown
 * into natural, conversational, fluent English/Hinglish spoken audio.
 */

// Common scientific units conversion for spoken text
const UNIT_MAP: Record<string, string> = {
  'N\\cdot m^2/C^2': 'Newton meter square per Coulomb square',
  'N\\cdot m^2\\text{C}^{-2}': 'Newton meter square per Coulomb square',
  'N m^2/C^2': 'Newton meter square per Coulomb square',
  'N/C': 'Newtons per Coulomb',
  'V/m': 'Volts per meter',
  'm/s^2': 'meters per second square',
  'm/s': 'meters per second',
  'kg\\cdot m/s': 'kilogram meters per second',
  'kg m/s': 'kilogram meters per second',
  'rad/s': 'radians per second',
  'C': 'Coulombs',
  'N': 'Newtons',
  'J': 'Joules',
  'V': 'Volts',
  'A': 'Amperes',
  'm': 'meters',
  'cm': 'centimeters',
  'mm': 'millimeters',
  's': 'seconds',
  'ms': 'milliseconds',
  'kg': 'kilograms',
  'g': 'grams',
  'F': 'Farads',
  'mu F': 'microfarads',
  'pF': 'picofarads',
  'T': 'Teslas',
  'Wb': 'Webers',
  'Hz': 'Hertz',
  'kHz': 'kilohertz',
  'MHz': 'megahertz',
  'W': 'Watts',
  'kW': 'kilowatts',
  'eV': 'electron volts',
  'MeV': 'mega electron volts',
  'mol': 'moles',
  'K': 'Kelvin',
  'Omega': 'Ohms',
  'k\\Omega': 'kilo Ohms',
  'M\\Omega': 'mega Ohms',
};

// Physics and Math symbols pronunciation
const SYMBOL_MAP: [RegExp, string][] = [
  // Greek letters & constants
  [/\\varepsilon_0|\\epsilon_0/g, ' epsilon naught '],
  [/\\varepsilon|\\epsilon/g, ' epsilon '],
  [/\\mu_0/g, ' mu naught '],
  [/\\mu/g, ' micro '],
  [/\\lambda/g, ' lambda '],
  [/\\sigma/g, ' sigma '],
  [/\\rho/g, ' rho '],
  [/\\omega/g, ' omega '],
  [/\\Omega/g, ' Ohms '],
  [/\\theta/g, ' theta '],
  [/\\phi/g, ' phi '],
  [/\\alpha/g, ' alpha '],
  [/\\beta/g, ' beta '],
  [/\\gamma/g, ' gamma '],
  [/\\Delta\s*([A-Za-z])/g, ' Delta $1 '],
  [/\\Delta/g, ' change in '],
  [/\\delta/g, ' delta '],
  [/\\tau/g, ' tau '],
  [/\\nu/g, ' nu '],
  [/\\eta/g, ' eta '],
  [/\\kappa/g, ' kappa '],
  [/\\pi/g, ' pi '],
  [/\\hbar/g, ' h-bar '],
  [/\\infty/g, ' infinity '],

  // Vectors and unit vectors
  [/\\vec\{([a-zA-Z])\}/g, ' vector $1 '],
  [/\\vec\s+([a-zA-Z])/g, ' vector $1 '],
  [/\\mathbf\{([a-zA-Z])\}/g, ' vector $1 '],
  [/\\hat\{([a-zA-Z])\}/g, ' $1 cap '],
  [/\\hat\s+([a-zA-Z])/g, ' $1 cap '],

  // Dot product & cross product
  [/\\cdot/g, ' dot '],
  [/\\times/g, ' into '],

  // Relational & arithmetic symbols
  [/\\pm/g, ' plus or minus '],
  [/\\mp/g, ' minus or plus '],
  [/\\approx/g, ' approximately equals '],
  [/\\neq/g, ' is not equal to '],
  [/\\leq|\\le/g, ' is less than or equal to '],
  [/\\geq|\\ge/g, ' is greater than or equal to '],
  [/\\ll/g, ' is much less than '],
  [/\\gg/g, ' is much greater than '],
  [/\\propto/g, ' is proportional to '],
  [/\\to|\\rightarrow/g, ' approaches '],
  [/\\implies/g, ' which implies '],
  [/\\iff/g, ' if and only if '],
  [/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, ' integral from $1 to $2 of '],
  [/\\int_([a-zA-Z0-9])\^([a-zA-Z0-9])/g, ' integral from $1 to $2 of '],
  [/\\oint/g, ' closed loop integral of '],
  [/\\int/g, ' integral of '],
  [/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, ' summation from $1 to $2 of '],
  [/\\sum/g, ' summation of '],

  // Functions
  [/\\sin\^2/g, ' sine square '],
  [/\\cos\^2/g, ' cos square '],
  [/\\tan\^2/g, ' tan square '],
  [/\\sin/g, ' sine '],
  [/\\cos/g, ' cos '],
  [/\\tan/g, ' tan '],
  [/\\cot/g, ' cot '],
  [/\\sec/g, ' sec '],
  [/\\csc|\\cosec/g, ' cosec '],
  [/\\ln/g, ' natural log '],
  [/\\log_\{10\}|\\log_10/g, ' log base 10 '],
  [/\\log/g, ' log '],
  [/\\lim_\{([^}]+)\}/g, ' limit as $1, '],

  // Formatting macros
  [/\\text\{([^}]+)\}/g, ' $1 '],
  [/\\mathrm\{([^}]+)\}/g, ' $1 '],
  [/\\mathbf\{([^}]+)\}/g, ' $1 '],
  [/\\mathit\{([^}]+)\}/g, ' $1 '],
  [/\\left\(|\\right\)/g, ' '],
  [/\\left\[|\\right\]/g, ' '],
  [/\\left\\{|\\right\\}/g, ' '],
  [/\\left\||\\right\|/g, ' magnitude of '],
  [/\\quad|\\qquad|\\,|\\;|\\!/g, ' '],
];

/**
 * Recursively parses and converts fractions \frac{num}{den} into spoken words
 */
function convertFractions(text: string): string {
  let prev = '';
  let curr = text;
  let maxIterations = 5;

  while (curr.includes('\\frac') && maxIterations > 0 && curr !== prev) {
    prev = curr;
    curr = curr.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (_, num, den) => {
      // Special physics cases
      if (num.trim() === '1' && (den.includes('4\\pi\\varepsilon_0') || den.includes('4 pi epsilon naught') || den.includes('4\\pi \\varepsilon_0'))) {
        return ' 1 upon 4 pi epsilon naught ';
      }
      if (num.trim() === '1' && den.trim() === '2') {
        return ' half ';
      }
      if (num.trim() === '1' && den.trim() === '4') {
        return ' one fourth ';
      }
      return ` ${num.trim()} over ${den.trim()} `;
    });
    maxIterations--;
  }

  // Handle un-braced fractions like \frac12
  curr = curr.replace(/\\frac([0-9a-zA-Z])([0-9a-zA-Z])/g, '$1 over $2');
  return curr;
}

/**
 * Converts roots \sqrt{x} and \sqrt[n]{x} into spoken language
 */
function convertRoots(text: string): string {
  let prev = '';
  let curr = text;
  let maxIterations = 5;

  while (curr.includes('\\sqrt') && maxIterations > 0 && curr !== prev) {
    prev = curr;
    curr = curr.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, ' $1 th root of $2 ');
    curr = curr.replace(/\\sqrt\{([^{}]+)\}/g, ' square root of $1 ');
    maxIterations--;
  }
  return curr;
}

/**
 * Converts powers and exponents (e.g. 10^{-19}, x^2, r^3, 9 \times 10^9) into spoken words
 */
function convertPowers(text: string): string {
  return text
    // 10^{negative or positive number}
    .replace(/10\^\{([+-]?\d+)\}/g, (_, pow) => {
      const p = parseInt(pow, 10);
      if (p < 0) return ` 10 to the power minus ${Math.abs(p)} `;
      return ` 10 to the power ${p} `;
    })
    .replace(/10\^([+-]?\d+)/g, (_, pow) => {
      const p = parseInt(pow, 10);
      if (p < 0) return ` 10 to the power minus ${Math.abs(p)} `;
      return ` 10 to the power ${p} `;
    })
    // Common variable powers
    .replace(/([a-zA-Z0-9\)])\^\{2\}|([a-zA-Z0-9\)])\^2/g, '$1 square')
    .replace(/([a-zA-Z0-9\)])\^\{3\}|([a-zA-Z0-9\)])\^3/g, '$1 cube')
    .replace(/([a-zA-Z0-9\)])\^\{([+-]?[a-zA-Z0-9]+)\}/g, '$1 to the power $2')
    .replace(/([a-zA-Z0-9\)])\^([a-zA-Z0-9])/g, '$1 to the power $2');
}

/**
 * Converts subscripts into natural spoken math (e.g. q_1 -> q 1, F_{12} -> F 1 2)
 */
function convertSubscripts(text: string): string {
  return text
    .replace(/([a-zA-Z])_\{([a-zA-Z0-9]+)\}/g, (_, v, sub) => {
      // If subscript is a number like 1, 2, speak "v 1", "v 2"
      if (/^\d+$/.test(sub)) {
        return ` ${v} ${sub.split('').join(' ')} `;
      }
      return ` ${v} subscript ${sub} `;
    })
    .replace(/([a-zA-Z])_([a-zA-Z0-9])/g, ' $1 $2 ');
}

/**
 * Converts a math expression chunk (from inside $...$ or $$...$$) into spoken text
 */
export function convertMathExpressionToSpeech(rawMath: string): string {
  let math = rawMath.trim();

  // Replace known complex units first
  for (const [unit, spoken] of Object.entries(UNIT_MAP)) {
    math = math.split(unit).join(` ${spoken} `);
  }

  // Convert roots
  math = convertRoots(math);

  // Convert fractions
  math = convertFractions(math);

  // Apply symbol mappings
  for (const [regex, replacement] of SYMBOL_MAP) {
    math = math.replace(regex, replacement);
  }

  // Convert powers
  math = convertPowers(math);

  // Convert subscripts
  math = convertSubscripts(math);

  // Clean equal signs and basic operators
  math = math
    .replace(/=/g, ' equals ')
    .replace(/\+/g, ' plus ')
    .replace(/-/g, ' minus ')
    .replace(/\//g, ' divided by ')
    .replace(/\*/g, ' times ')
    .replace(/%/g, ' percent ')
    .replace(/[{}]/g, ' ')
    .replace(/\\/g, ' ');

  return math;
}

/**
 * Cleans and converts complete Markdown & conversational text for Speech Synthesis.
 * Strips raw SVG diagrams, JSON blocks, action pills, markdown syntax,
 * and transforms all inline/block LaTeX formulas into fluid conversational phonetics.
 */
export function cleanTextForSpeech(raw: string): string {
  if (!raw) return '';

  let text = raw.normalize('NFKD');

  // 1. Remove hidden system sync JSON blocks
  text = text.replace(/```json\s*\{[\s\S]*?"system_sync"[\s\S]*?\}\s*```/gi, '');
  text = text.replace(/```json[\s\S]*?```/gi, '');

  // 2. Remove [NEXT_STEPS] blocks
  text = text.replace(/\[NEXT_STEPS\][\s\S]*?\[\/NEXT_STEPS\]/gi, '');

  // 3. Remove SVG blocks and replace with brief contextual spoken hint
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, ' Visual diagram shown on screen. ');

  // 4. Remove HTML tags
  text = text.replace(/<[^>]*>/g, ' ');

  // 5. Remove Markdown headers
  text = text.replace(/#{1,6}\s?/g, '');

  // 6. Convert display math blocks ($$...$$)
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, mathBlock) => {
    return ' ' + convertMathExpressionToSpeech(mathBlock) + ' ';
  });

  // 7. Convert inline math ($...$)
  text = text.replace(/\$([^$]+)\$/g, (_, inlineMath) => {
    return ' ' + convertMathExpressionToSpeech(inlineMath) + ' ';
  });

  // 8. Convert any remaining standalone LaTeX symbols or powers that might be in regular text
  text = text
    .replace(/10\^\{([+-]?\d+)\}/g, ' 10 to the power $1 ')
    .replace(/10\^([+-]?\d+)/g, ' 10 to the power $1 ')
    .replace(/\\varepsilon_0/g, ' epsilon naught ')
    .replace(/\\Delta\s*V/g, ' delta V ')
    .replace(/\\pi/g, ' pi ')
    .replace(/\\times/g, ' into ')
    .replace(/\\pm/g, ' plus or minus ')
    .replace(/\\cdot/g, ' times ');

  // 9. Remove Markdown bold/italic/code formatting
  text = text
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`{1,3}.*?`{1,3}/gs, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[|]/g, ' ')
    .replace(/---/g, ' ')
    .replace(/>\s?/g, ' ');

  // 10. Clean up bullet points, multiple punctuation, and extra whitespace
  text = text
    .replace(/^\s*[-*+]\s+/gm, ' ')
    .replace(/([.,!?])\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Selects the optimal natural speech voice for English, Hindi, and Hinglish content.
 */
export function getOptimalVoice(
  voices: SpeechSynthesisVoice[],
  text: string,
  preferredLang?: string
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const hasHindiChars = /[\u0900-\u097F]/.test(text);
  const hasHinglishWords = /\b(hai|hain|hota|karo|samjho|kya|kyun|kaise|isliye|aap|tum|bhai|dekho|pehle|matlab|bolna|sunna|padhna|karein|samjhein)\b/i.test(text);
  const isDesi = hasHindiChars || hasHinglishWords || preferredLang === 'hi-IN' || preferredLang === 'hi';

  if (isDesi) {
    // Look for Indian English or Hindi voices first
    const desiVoice = voices.find(v => v.lang === 'hi-IN' || v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi')) ||
                      voices.find(v => v.lang === 'en-IN' || v.name.toLowerCase().includes('india') || v.name.toLowerCase().includes('indian'));
    if (desiVoice) return desiVoice;
  }

  // High-quality natural voices (Google, Natural, Samantha, David, Zira, Siri)
  const naturalVoice = voices.find(v =>
    (v.lang.startsWith('en') || v.lang.startsWith('hi')) &&
    (v.name.includes('Natural') ||
     v.name.includes('Google') ||
     v.name.includes('Samantha') ||
     v.name.includes('David') ||
     v.name.includes('Zira') ||
     v.name.includes('Jenny') ||
     v.name.includes('Guy') ||
     v.name.includes('Aria'))
  );

  if (naturalVoice) return naturalVoice;

  // Fallback to default en voice
  return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
}

export interface SpeechHighlightInfo {
  activeSentence: string;
  activeWord: string;
  charIndex: number;
  progress: number;
  wordStart: number;
  wordEnd: number;
  sentenceWords: string[];
  activeWordIndexInSentence: number;
  globalWordIndex: number;
  totalWords: number;
  allSpokenWords: string[];
}

/**
 * Extracts the active sentence, active word, and playback progress
 * from the spoken text at a given character index with precision and decimal protection.
 */
export function getSpeechHighlightInfo(spokenText: string, charIndex: number): SpeechHighlightInfo {
  if (!spokenText || spokenText.length === 0 || charIndex < 0) {
    return {
      activeSentence: '',
      activeWord: '',
      charIndex: 0,
      progress: 0,
      wordStart: 0,
      wordEnd: 0,
      sentenceWords: [],
      activeWordIndexInSentence: -1,
      globalWordIndex: -1,
      totalWords: 0,
      allSpokenWords: [],
    };
  }

  const safeCharIndex = Math.min(Math.max(0, charIndex), spokenText.length - 1);
  const progress = spokenText.length > 0 ? safeCharIndex / spokenText.length : 0;

  // 1. Find sentence start (after . ? ! followed by space or newline, but NOT decimal numbers like 3.14)
  let sentStart = 0;
  for (let i = safeCharIndex - 1; i >= 0; i--) {
    const ch = spokenText[i];
    const prevChar = i > 0 ? spokenText[i - 1] : '';
    const nextChar = i < spokenText.length - 1 ? spokenText[i + 1] : '';

    if (ch === '\n') {
      sentStart = i + 1;
      break;
    }

    if (ch === '.' || ch === '?' || ch === '!') {
      // Guard against decimal numbers (e.g., 3.14, 9.8) or abbreviations
      const isDecimal = ch === '.' && /\d/.test(prevChar) && /\d/.test(nextChar);
      if (!isDecimal && (/\s/.test(nextChar) || nextChar === '')) {
        sentStart = i + 1;
        break;
      }
    }
  }

  while (sentStart < spokenText.length && /\s/.test(spokenText[sentStart])) {
    sentStart++;
  }

  // 2. Find sentence end (at . ? ! or newline followed by space or end of text)
  let sentEnd = spokenText.length;
  for (let i = safeCharIndex; i < spokenText.length; i++) {
    const ch = spokenText[i];
    const prevChar = i > 0 ? spokenText[i - 1] : '';
    const nextChar = i < spokenText.length - 1 ? spokenText[i + 1] : '';

    if (ch === '\n') {
      sentEnd = i;
      break;
    }

    if (ch === '.' || ch === '?' || ch === '!') {
      const isDecimal = ch === '.' && /\d/.test(prevChar) && /\d/.test(nextChar);
      if (!isDecimal && (/\s/.test(nextChar) || nextChar === '')) {
        sentEnd = i + 1;
        break;
      }
    }
  }

  const activeSentence = spokenText.slice(sentStart, sentEnd).trim();

  // 3. Find word boundaries around safeCharIndex
  // If safeCharIndex is currently on whitespace or punctuation, snap to the nearest adjacent word
  let searchIndex = safeCharIndex;
  if (/[\s.,!?;:()\[\]{}"'`\\\/]/.test(spokenText[searchIndex])) {
    // Look forward up to 15 chars for the next word start
    let forward = searchIndex;
    while (forward < spokenText.length && /[\s.,!?;:()\[\]{}"'`\\\/]/.test(spokenText[forward])) {
      forward++;
    }
    if (forward < spokenText.length && forward < sentEnd) {
      searchIndex = forward;
    } else {
      // Look backward
      let backward = searchIndex;
      while (backward > sentStart && /[\s.,!?;:()\[\]{}"'`\\\/]/.test(spokenText[backward])) {
        backward--;
      }
      searchIndex = Math.max(sentStart, backward);
    }
  }

  let wordStart = searchIndex;
  while (wordStart > 0 && !/[\s.,!?;:()\[\]{}"'`\\\/]/.test(spokenText[wordStart - 1])) {
    wordStart--;
  }

  let wordEnd = searchIndex;
  while (wordEnd < spokenText.length && !/[\s.,!?;:()\[\]{}"'`\\\/]/.test(spokenText[wordEnd])) {
    wordEnd++;
  }

  const rawActiveWord = spokenText.slice(wordStart, wordEnd).trim();
  const activeWord = rawActiveWord.replace(/^[^\w]+|[^\w]+$/g, '');

  // 4. Tokenize words in active sentence and determine active word index
  const sentenceWords = activeSentence
    .split(/\s+/)
    .map(w => w.replace(/^[^\w]+|[^\w]+$/g, '').toLowerCase())
    .filter(Boolean);

  const sentencePrefix = spokenText.slice(sentStart, Math.max(sentStart, wordEnd));
  const wordsInPrefix = sentencePrefix
    .split(/\s+/)
    .map(w => w.replace(/^[^\w]+|[^\w]+$/g, '').toLowerCase())
    .filter(Boolean);

  const activeWordIndexInSentence = Math.max(0, wordsInPrefix.length - 1);

  // Global words calculation
  const allSpokenWords = spokenText
    .split(/\s+/)
    .map(w => w.replace(/^[^\w]+|[^\w]+$/g, '').toLowerCase())
    .filter(Boolean);

  const globalPrefix = spokenText.slice(0, Math.max(0, wordEnd));
  const globalWordsInPrefix = globalPrefix
    .split(/\s+/)
    .map(w => w.replace(/^[^\w]+|[^\w]+$/g, '').toLowerCase())
    .filter(Boolean);
  const globalWordIndex = Math.max(0, globalWordsInPrefix.length - 1);

  return {
    activeSentence,
    activeWord,
    charIndex: safeCharIndex,
    progress,
    wordStart,
    wordEnd,
    sentenceWords,
    activeWordIndexInSentence,
    globalWordIndex,
    totalWords: allSpokenWords.length,
    allSpokenWords,
  };
}

/**
 * Granular token representation with duration weighting and LaTeX metadata.
 */
export interface SpeechTokenMeta {
  index: number;
  text: string;
  clean: string;
  start: number;
  end: number;
  weight: number; // Duration weight in relative speech units
  sentenceIndex: number;
  isMathPhonetic?: boolean;
}

/**
 * Granular Speech Boundary Tracker
 * Accurately tracks utterance word boundaries and adapts to complex LaTeX-converted sequences,
 * preventing desynchronization, rubber-banding, or skips.
 */
export class SpeechBoundaryTracker {
  public tokens: SpeechTokenMeta[] = [];
  public sentences: { text: string; start: number; end: number; tokenStart: number; tokenEnd: number }[] = [];
  public totalWeight = 0;
  
  private lastConfirmedCharIndex = 0;
  private lastConfirmedTokenIndex = 0;
  private lastConfirmedTimestamp = 0;
  private hasReceivedHardwareBoundary = false;
  private rate = 1.0;
  private spokenText = '';

  constructor(spokenText: string, rate: number = 1.0) {
    this.spokenText = spokenText || '';
    this.rate = Math.max(0.5, Math.min(2.0, rate || 1.0));
    this.initTokens();
  }

  private initTokens() {
    if (!this.spokenText) return;

    const text = this.spokenText;
    let currentSentenceIndex = 0;
    let sentenceStart = 0;
    let sentenceTokenStart = 0;

    // Split text preserving exact character offsets
    const regex = /\S+/g;
    let match: RegExpExecArray | null;
    let tokenIdx = 0;

    while ((match = regex.exec(text)) !== null) {
      const wordText = match[0];
      const start = match.index;
      const end = start + wordText.length;
      const clean = wordText.replace(/^[^\w]+|[^\w]+$/g, '').toLowerCase();

      // Estimate phonetic duration weight
      let weight = 1.0;
      if (clean.length <= 2) {
        weight = 0.65;
      } else if (clean.length >= 8) {
        weight = 1.4;
      }

      // Check for math phonetic tokens that take deliberate pronunciation time
      const isMathPhonetic = /^(epsilon|naught|fraction|divided|subscript|integral|summation|vector|infinity|squared|cubed|approx|proportional|coulomb|farad|joule|newton|micro|pi|theta|lambda|sigma|delta|exponential)$/i.test(clean);
      if (isMathPhonetic) {
        weight *= 1.35;
      }

      // Numbers and powers take longer to enunciate
      if (/\d/.test(clean)) {
        weight *= 1.25;
      }

      this.tokens.push({
        index: tokenIdx,
        text: wordText,
        clean,
        start,
        end,
        weight,
        sentenceIndex: currentSentenceIndex,
        isMathPhonetic,
      });

      this.totalWeight += weight;
      tokenIdx++;

      // Check if word ends a sentence (and is not a decimal number)
      const hasSentencePunctuation = /[.!?]$/.test(wordText);
      const isDecimal = wordText.includes('.') && /\d\.\d/.test(wordText);

      if (hasSentencePunctuation && !isDecimal) {
        this.sentences.push({
          text: text.slice(sentenceStart, end).trim(),
          start: sentenceStart,
          end,
          tokenStart: sentenceTokenStart,
          tokenEnd: tokenIdx - 1,
        });
        currentSentenceIndex++;
        sentenceStart = end;
        sentenceTokenStart = tokenIdx;
      }
    }

    if (sentenceStart < text.length && this.tokens.length > 0) {
      this.sentences.push({
        text: text.slice(sentenceStart).trim(),
        start: sentenceStart,
        end: text.length,
        tokenStart: sentenceTokenStart,
        tokenEnd: this.tokens.length - 1,
      });
    }

    this.lastConfirmedTimestamp = Date.now();
  }

  /**
   * Process a hardware Web Speech API boundary event with exact token snapping
   */
  public onBoundary(event: { charIndex?: number; charLength?: number; name?: string; elapsedTime?: number }): number {
    this.hasReceivedHardwareBoundary = true;
    const rawCharIndex = typeof event.charIndex === 'number' ? event.charIndex : 0;
    this.lastConfirmedTimestamp = Date.now();

    if (this.tokens.length === 0) {
      this.lastConfirmedCharIndex = rawCharIndex;
      return rawCharIndex;
    }

    // Binary search/linear search for the nearest token starting at or immediately before rawCharIndex
    let bestTokenIdx = 0;
    let minDiff = Infinity;

    for (let i = 0; i < this.tokens.length; i++) {
      const tok = this.tokens[i];
      const diff = Math.abs(tok.start - rawCharIndex);
      if (diff < minDiff) {
        minDiff = diff;
        bestTokenIdx = i;
      }
      if (tok.start <= rawCharIndex && rawCharIndex <= tok.end) {
        bestTokenIdx = i;
        break;
      }
      if (tok.start > rawCharIndex && diff > minDiff) {
        break;
      }
    }

    this.lastConfirmedTokenIndex = bestTokenIdx;
    this.lastConfirmedCharIndex = this.tokens[bestTokenIdx].start;
    return this.lastConfirmedCharIndex;
  }

  /**
   * Get calibrated interpolated char index based on token phonetic duration weights
   */
  public getInterpolatedCharIndex(): number {
    if (this.tokens.length === 0 || !this.spokenText) return 0;

    const now = Date.now();
    const elapsedSinceBoundary = (now - this.lastConfirmedTimestamp) / 1000;

    // If hardware boundaries are active and recent, advance gently through the current token
    if (this.hasReceivedHardwareBoundary && elapsedSinceBoundary < 0.35) {
      return this.lastConfirmedCharIndex;
    }

    // Adaptive token advancement
    // Average token duration is roughly ~0.26s / rate for standard words
    const baseWordDuration = 0.26 / this.rate;
    let accumulatedTime = 0;
    let currentIndex = this.lastConfirmedTokenIndex;

    while (currentIndex < this.tokens.length - 1) {
      const tokenDuration = this.tokens[currentIndex].weight * baseWordDuration;
      if (accumulatedTime + tokenDuration > elapsedSinceBoundary) {
        break;
      }
      accumulatedTime += tokenDuration;
      currentIndex++;
    }

    // Cap the forward leap so interpolation never runs past the next sentence prematurely
    const currentToken = this.tokens[this.lastConfirmedTokenIndex];
    const maxTokenInSentence = this.tokens.findIndex(
      (t, idx) => idx > this.lastConfirmedTokenIndex && t.sentenceIndex > currentToken.sentenceIndex
    );
    const safeMaxIndex = maxTokenInSentence > 0 ? maxTokenInSentence : this.tokens.length - 1;

    const targetTokenIdx = Math.min(currentIndex, safeMaxIndex);
    return this.tokens[targetTokenIdx].start;
  }

  /**
   * Get current highlight info for the given or current character index
   */
  public getHighlightInfo(charIndex?: number): SpeechHighlightInfo {
    const idx = typeof charIndex === 'number' ? charIndex : this.lastConfirmedCharIndex;
    return getSpeechHighlightInfo(this.spokenText, idx);
  }
}

/**
 * Factory to create a Granular Speech Boundary Tracker
 */
export function createSpeechBoundaryTracker(spokenText: string, rate: number = 1.0): SpeechBoundaryTracker {
  return new SpeechBoundaryTracker(spokenText, rate);
}

/**
 * Checks whether a markdown block/sentence corresponds to the currently active spoken sentence,
 * accurately handling complex LaTeX converted phrases.
 */
export function isBlockActiveForSpeech(
  blockRawText: string,
  activeSentence: string
): boolean {
  if (!activeSentence || !blockRawText) return false;

  // Convert any embedded LaTeX math in the block to spoken form for high-fidelity alignment
  let phoneticallyExpandedBlock = blockRawText
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, m) => ' ' + convertMathExpressionToSpeech(m) + ' ')
    .replace(/\$([^$]+)\$/g, (_, m) => ' ' + convertMathExpressionToSpeech(m) + ' ');

  const cleanBlock = phoneticallyExpandedBlock
    .replace(/[#*`_~\[\](){}<>$=|\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();

  const cleanSent = activeSentence
    .replace(/[#*`_~\[\](){}<>$=|\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();

  if (!cleanBlock || !cleanSent) return false;

  // Direct substring match
  if (cleanBlock.includes(cleanSent) || cleanSent.includes(cleanBlock)) {
    return true;
  }

  // Token-level overlap matching with LaTeX phonetic words
  const sentWords = cleanSent.split(/\s+/).filter(w => w.length > 2);
  if (sentWords.length === 0) return false;

  let matchCount = 0;
  for (const w of sentWords) {
    if (cleanBlock.includes(w)) {
      matchCount++;
    }
  }

  return (matchCount / sentWords.length) >= 0.30;
}

