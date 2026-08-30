/**
 * Examix AI - Multi-Hotword Wake-up Matrix & Screen-Off Voice Engine
 * Handles zero-latency keyword spotting (KWS), inverted power screen-off listening,
 * audio chime synthesis, study window scheduling, and hands-free oral tutoring.
 */

export interface HotwordConfig {
  id: string;
  keyword: string;
  aliases: string[];
  description: string;
  category: 'core' | 'classroom' | 'callout' | 'night' | 'casual';
  enabled: boolean;
  sensitivity: number; // 0.1 to 1.0
  lastTriggered?: number;
}

export interface HotwordEngineSettings {
  enabled: boolean;
  invertedPowerMode: boolean; // Screen-off = listen, Screen-on = pause
  studyScheduleEnabled: boolean;
  studyScheduleStart: string; // "20:00"
  studyScheduleEnd: string;   // "23:30"
  autoHibernateMinutes: number; // 15
  soundChimeEnabled: boolean;
  oralResponseConstraintWords: number; // 35 words
  hotwords: HotwordConfig[];
}

export const DEFAULT_HOTWORDS: HotwordConfig[] = [
  {
    id: 'examix',
    keyword: 'Examix',
    aliases: ['examix', 'hey examix', 'ok examix', 'examex', 'hey examex', 'hi examix'],
    description: 'Default Academic Core — Full syllabus, formula derivations & exam scoring.',
    category: 'core',
    enabled: true,
    sensitivity: 0.8
  },
  {
    id: 'teacher',
    keyword: 'Teacher',
    aliases: ['teacher', 'hey teacher', 'teacher ji', 'sir', 'teacher suno', 'hey master'],
    description: 'Direct Socratic Classroom Trigger — Step-by-step mentor questioning & concept drilling.',
    category: 'classroom',
    enabled: true,
    sensitivity: 0.85
  },
  {
    id: 'poco',
    keyword: 'Poco / Picu',
    aliases: ['picu', 'poco', 'hey poco', 'hey picu', 'piku', 'pokku'],
    description: 'Short Dynamic Callout — Quick doubt resolution, unit lookup & rapid formula recall.',
    category: 'callout',
    enabled: true,
    sensitivity: 0.8
  },
  {
    id: 'nightwave',
    keyword: 'Nightwave',
    aliases: ['nightwave', 'night wave', 'hey nightwave', 'sleep mode', 'calm study'],
    description: 'Late-Night Study & Ambient Retention — Whisper-paced audio revision with low frequency.',
    category: 'night',
    enabled: true,
    sensitivity: 0.75
  },
  {
    id: 'hello',
    keyword: 'Hello',
    aliases: ['hello', 'hello examix', 'namaste', 'hi', 'hey there'],
    description: 'General Conversational Trigger — Casual academic greeting & study plan check.',
    category: 'casual',
    enabled: true,
    sensitivity: 0.7
  }
];

export const DEFAULT_HOTWORD_SETTINGS: HotwordEngineSettings = {
  enabled: true,
  invertedPowerMode: true,
  studyScheduleEnabled: true,
  studyScheduleStart: '20:00',
  studyScheduleEnd: '23:30',
  autoHibernateMinutes: 15,
  soundChimeEnabled: true,
  oralResponseConstraintWords: 35,
  hotwords: DEFAULT_HOTWORDS
};

// Play a pleasant, low-power Web Audio chime when hotword wakes up
export function playWakeChime(type: 'wake' | 'sleep' | 'correct' | 'error' = 'wake') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'wake') {
      // Dual-tone snappy ascending chime (sub-100ms)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.12); // A5

      osc2.frequency.setValueAtTime(880.00, now + 0.04);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.16); // D6

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.04);
      osc1.stop(now + 0.24);
      osc2.stop(now + 0.24);
    } else if (type === 'correct') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.18); // G5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    // Audio context may require user interaction first
  }
}

// Check if current time falls within scheduled study window
export function isWithinStudySchedule(settings: HotwordEngineSettings): boolean {
  if (!settings.studyScheduleEnabled) return true;
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = settings.studyScheduleStart.split(':').map(Number);
    const [endH, endM] = settings.studyScheduleEnd.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Overnight schedule (e.g. 21:00 to 02:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  } catch (e) {
    return true;
  }
}

// Extract detected hotword and clean user prompt from incoming speech stream
export function detectHotwordMatch(
  text: string,
  hotwords: HotwordConfig[]
): { triggered: boolean; hotword?: HotwordConfig; prompt: string; rawMatch?: string } {
  const clean = text.toLowerCase().trim();
  if (!clean) return { triggered: false, prompt: text };

  for (const hw of hotwords) {
    if (!hw.enabled) continue;

    // Check main keyword and all aliases
    const searchTerms = [hw.keyword.toLowerCase(), ...hw.aliases.map(a => a.toLowerCase())];

    for (const term of searchTerms) {
      // Check if text starts with or contains the wake term
      const index = clean.indexOf(term);
      if (index !== -1) {
        // Strip out the wake phrase to leave the actual question
        const before = clean.substring(0, index).trim();
        const after = clean.substring(index + term.length).trim();
        
        // Remove trailing commas, colons or question marks
        const strippedPrompt = `${before} ${after}`.replace(/^[,:\s]+/, '').trim();

        return {
          triggered: true,
          hotword: hw,
          prompt: strippedPrompt || 'Hello! Main tayyar hoon, boliye.',
          rawMatch: term
        };
      }
    }
  }

  return { triggered: false, prompt: text };
}
