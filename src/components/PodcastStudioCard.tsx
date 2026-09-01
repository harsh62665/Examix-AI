import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  Radio, 
  Headphones, 
  BookOpen, 
  FileText, 
  FastForward, 
  Rewind, 
  Flame, 
  Bookmark, 
  Share2, 
  Clock, 
  Languages,
  CheckCircle2,
  FileAudio,
  Loader2
} from 'lucide-react';
import { downloadPodcastAsMp3 } from '../utils/audioExporter';
import { 
  autoAudioEngine, 
  AUTO_MOODS, 
  detectStoryAtmosphere 
} from '../utils/autoAtmosphereEngine';

export interface PodcastEpisodeData {
  title: string;
  subjectTopic: string;
  estimatedDuration: string;
  hook: string;
  journey: string;
  climax: string;
  fullScript: string;
  takeaways: string[];
  characters: { name: string; role: string }[];
  examQA: { question: string; answer: string }[];
  summary: string[];
  mnemonic: string;
  rawText: string;
}

export function parsePodcastContent(raw: string): PodcastEpisodeData {
  let text = raw || '';

  // Extract Title
  let title = 'Examix AI Learning Audio Story';
  const titleMatch = text.match(/(?:[-*•#]|\*\*)*\s*(?:Title|शीर्षक)\s*[:\-]\s*([^\n\r]+)/i) || 
                     text.match(/\[EPISODE_META\][\s\S]*?(?:Title|शीर्षक)\s*[:\-]\s*([^\n\r]+)/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].replace(/[*_#`]/g, '').trim();
  }

  // Extract Subject & Topic
  let subjectTopic = 'Academic Concept / Exam Syllabus';
  const subjectMatch = text.match(/(?:[-*•#]|\*\*)*\s*(?:Subject\s*(?:&|and)?\s*(?:Topic|Class)?|विषय\s*(?:व\s*कक्षा)?|Topic)\s*[:\-]\s*([^\n\r]+)/i);
  if (subjectMatch && subjectMatch[1]) {
    subjectTopic = subjectMatch[1].replace(/[*_#`]/g, '').trim();
  }

  // Extract Estimated Duration
  let estimatedDuration = '5-10 Min';
  const durationMatch = text.match(/(?:[-*•#]|\*\*)*\s*(?:Estimated\s*(?:Audio\s*)?Duration|Target\s*Duration|अवधि)\s*[:\-]\s*([^\n\r]+)/i);
  if (durationMatch && durationMatch[1]) {
    estimatedDuration = durationMatch[1].replace(/[*_#`]/g, '').trim();
  }

  // Extract Hook
  let hook = '';
  const hookMatch = text.match(/(?:[-*•#]|\*\*)*\s*(?:Hook|The Hook|भूमिका)\s*[:\-]\s*([\s\S]*?)(?=(?:[-*•#]|\*\*)*\s*(?:The Journey|Journey|Story|The Story|कथा प्रवाह|कहानी|Climax|Insight|\[MEMORY_ANCHOR_NOTES\]|$))/i);
  if (hookMatch && hookMatch[1]) {
    hook = hookMatch[1].replace(/\[\/?(?:AUDIO_SCRIPT|AUDIO_SCRIPT_HINDI)\]/gi, '').trim();
  }

  // Extract Journey / Story
  let journey = '';
  const journeyMatch = text.match(/(?:[-*•#]|\*\*)*\s*(?:The Journey\s*\/?\s*Story|Journey|Story|The Story|कथा प्रवाह|कहानी|मुख्य भाग)\s*[:\-]\s*([\s\S]*?)(?=(?:[-*•#]|\*\*)*\s*(?:Climax|Insight|चरमोत्कर्ष|निष्कर्ष|\[MEMORY_ANCHOR_NOTES\]|$))/i);
  if (journeyMatch && journeyMatch[1]) {
    let cleanJourney = journeyMatch[1].trim();
    cleanJourney = cleanJourney.replace(/\[\/?(?:AUDIO_SCRIPT|AUDIO_SCRIPT_HINDI)\]/gi, '').trim();
    cleanJourney = cleanJourney.replace(/^[-\s]*JOURNEY:\s*/i, '');
    journey = cleanJourney;
  }

  // Extract Climax & Insight
  let climax = '';
  const climaxMatch = text.match(/(?:[-*•#]|\*\*)*\s*(?:Climax\s*(?:&|and)?\s*Insight|Climax|Insight|चरमोत्कर्ष|निष्कर्ष)\s*[:\-]\s*([\s\S]*?)(?=(?:\[MEMORY_ANCHOR_NOTES\]|$))/i);
  if (climaxMatch && climaxMatch[1]) {
    climax = climaxMatch[1].replace(/\[\/?(?:AUDIO_SCRIPT|AUDIO_SCRIPT_HINDI)\]/gi, '').trim();
    climax = climax.replace(/^[-\s]*CLIMAX:\s*/i, '');
  }

  // Extract Memory Anchor Notes section
  const notesMatch = text.match(/\[MEMORY_ANCHOR_NOTES\]([\s\S]*?)(?:\[\/MEMORY_ANCHOR_NOTES\]|$)/i);
  const notesText = notesMatch ? notesMatch[1] : text;

  // Extract Summary (📌 कहानी का सारांश / Key Takeaways)
  const summary: string[] = [];
  const summaryMatch = notesText.match(/(?:📌|[-*•#]|\*\*)*\s*(?:कहानी का(?: मूल)? सारांश|Key Takeaways|Summary)[\s\S]*?(?=(?:🎭|📝|💡|[-*•#]|\*\*)*\s*(?:मुख्य पात्र|Characters|परीक्षा उपयोगी|प्रश्न-उत्तर|Mnemonic|Memory Trick|$))/i);
  if (summaryMatch && summaryMatch[0]) {
    const lines = summaryMatch[0].split('\n');
    for (const l of lines) {
      const clean = l.replace(/^[-*•\d.)\s]+/, '').replace(/[*_#`]/g, '').trim();
      if (clean && clean.length > 5 && !clean.toLowerCase().includes('सारांश') && !clean.toLowerCase().includes('takeaway')) {
        summary.push(clean);
      }
    }
  }

  // Extract Characters (🎭 मुख्य पात्र)
  const characters: { name: string; role: string }[] = [];
  const charMatch = notesText.match(/(?:🎭|[-*•#]|\*\*)*\s*(?:मुख्य पात्र|Characters(?:\s*&\s*Roles)?)[\s\S]*?(?=(?:📝|💡|[-*•#]|\*\*)*\s*(?:परीक्षा उपयोगी|प्रश्न-उत्तर|Mnemonic|Memory Trick|$))/i);
  if (charMatch && charMatch[0]) {
    const lines = charMatch[0].split('\n');
    for (const l of lines) {
      const line = l.trim();
      if (line.includes(':') || line.includes(' - ')) {
        const parts = line.split(/[:\-]/);
        if (parts.length >= 2) {
          const name = parts[0].replace(/^[-*•\d.)\s]+/, '').replace(/[*_#`]/g, '').trim();
          const role = parts.slice(1).join(':').replace(/[*_#`]/g, '').trim();
          if (name && role && !name.toLowerCase().includes('पात्र') && !name.toLowerCase().includes('character')) {
            characters.push({ name, role });
          }
        }
      }
    }
  }

  // Extract Board Exam Q&A (📝 परीक्षा उपयोगी प्रश्न-उत्तर)
  const examQA: { question: string; answer: string }[] = [];
  const qaRegex = /(?:प्रश्न|Q|Question)\s*[\d.)]*\s*[:\-]\s*([^\n\r]+)[\r\n]+\s*(?:\*?\*?(?:उत्तर|Ans|Answer)\*?\*?\s*[:\-]\s*([^\n\r]+))/gi;
  let match;
  while ((match = qaRegex.exec(notesText)) !== null) {
    if (match[1] && match[2]) {
      examQA.push({
        question: match[1].replace(/[*_#`]/g, '').trim(),
        answer: match[2].replace(/[*_#`]/g, '').trim()
      });
    }
  }

  // Extract Easy Trick / Mnemonic (💡 मेमोरी ट्रिक)
  let mnemonic = '';
  const mnemonicMatch = notesText.match(/(?:💡|[-*•#]|\*\*)*\s*(?:Easy Trick|Mnemonic|मेमोरी ट्रिक|Memory Hack)[\s\S]*?[:\-]?\s*([^\n\r]+)/i);
  if (mnemonicMatch && mnemonicMatch[1]) {
    mnemonic = mnemonicMatch[1].replace(/[*_#`>]/g, '').trim();
  }

  // Fallback: If structured sections were not parsed cleanly, build reasonable fallbacks
  if (!hook && !journey && !climax) {
    const scriptSectionMatch = text.match(/\[AUDIO_SCRIPT(?:_HINDI)?\]([\s\S]*?)(?=\[MEMORY_ANCHOR_NOTES\]|$)/i);
    if (scriptSectionMatch && scriptSectionMatch[1]) {
      journey = scriptSectionMatch[1].trim();
    } else {
      journey = text
        .replace(/\[EPISODE_META\][\s\S]*?(?=\[AUDIO_SCRIPT|$)/i, '')
        .replace(/\[MEMORY_ANCHOR_NOTES\][\s\S]*$/i, '')
        .trim();
    }
  }

  // Clean script parts
  const cleanPart = (p: string) => p.replace(/[*_`#]/g, '').trim();
  const scriptParts: string[] = [];
  if (hook) scriptParts.push(cleanPart(hook));
  if (journey) scriptParts.push(cleanPart(journey));
  if (climax) scriptParts.push(cleanPart(climax));
  const fullScript = scriptParts.length > 0 ? scriptParts.join('\n\n') : cleanPart(journey || text);

  return {
    title,
    subjectTopic,
    estimatedDuration,
    hook: cleanPart(hook),
    journey: cleanPart(journey),
    climax: cleanPart(climax),
    fullScript,
    takeaways: summary.length > 0 ? summary : [
      'Core concept foundation and intuitive real-world connection',
      'High-probability exam formula or key syllabus fact',
      'Common trap to avoid during the final examination'
    ],
    characters,
    examQA,
    summary,
    mnemonic: mnemonic || 'Connect the story character to the core formula for instant recall in the exam hall.',
    rawText: text
  };
}

interface PodcastStudioCardProps {
  rawContent: string;
}

export function PodcastStudioCard({ rawContent }: PodcastStudioCardProps) {
  const episode = useMemo(() => parsePodcastContent(rawContent), [rawContent]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'player' | 'notes'>('player');
  const [selectedSection, setSelectedSection] = useState<'all' | 'hook' | 'journey' | 'climax'>('all');
  const [copied, setCopied] = useState(false);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(-1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isDownloadingMp3, setIsDownloadingMp3] = useState(false);
  const [mp3Downloaded, setMp3Downloaded] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const currentIndexRef = useRef<number>(0);
  const speedRef = useRef<number>(1);

  // Sync refs with state
  isPlayingRef.current = isPlaying;
  speedRef.current = playbackSpeed;

  // Split text into clean sentences for audio playback & highlighting
  const targetScriptText = useMemo(() => {
    if (selectedSection === 'hook') return episode.hook || episode.fullScript;
    if (selectedSection === 'journey') return episode.journey || episode.fullScript;
    if (selectedSection === 'climax') return episode.climax || episode.fullScript;
    return episode.fullScript;
  }, [selectedSection, episode]);

  const cleanSpeechSentence = (sent: string) => {
    return sent
      .replace(/[*_~`#>]/g, '')
      .replace(/\[\/?(?:EPISODE_META|AUDIO_SCRIPT_HINDI|AUDIO_SCRIPT|MEMORY_ANCHOR_NOTES|NEXT_STEPS)\]/gi, '')
      .replace(/^[-•]\s*(?:Hook|The Journey|Story|Climax|Insight)\s*:/gi, '')
      .trim();
  };

  const sentences = useMemo(() => {
    if (!targetScriptText) return [];
    return targetScriptText
      .split(/(?<=[.?!।\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }, [targetScriptText]);

  // Compute approximate duration in seconds based on word count (140 words per min)
  const totalEstimatedSeconds = useMemo(() => {
    const wordCount = targetScriptText.split(/\s+/).filter(Boolean).length;
    return Math.max(30, Math.round((wordCount / 140) * 60));
  }, [targetScriptText]);

  const progress = useMemo(() => {
    if (sentences.length === 0) return 0;
    if (activeSentenceIndex < 0) return isPlaying ? 0.05 : 0;
    return Math.min(1, Math.max(0.05, (activeSentenceIndex + 1) / sentences.length));
  }, [activeSentenceIndex, sentences.length, isPlaying]);

  // Automatic Story SFX & Atmospheric Music State
  const [selectedMood, setSelectedMood] = useState<string>('auto_smart');
  const [bgmVolume, setBgmVolume] = useState<number>(0.28);
  const [isBgmActive, setIsBgmActive] = useState<boolean>(true);

  // Auto-detect best atmosphere for this specific story
  const autoDetectedMoodId = useMemo(() => {
    return detectStoryAtmosphere(episode.title, episode.fullScript || episode.journey);
  }, [episode.title, episode.fullScript, episode.journey]);

  const activeMoodId = selectedMood === 'auto_smart' ? autoDetectedMoodId : selectedMood;
  const currentMoodObj = AUTO_MOODS[activeMoodId] || AUTO_MOODS.village_nostalgia;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      autoAudioEngine.stop();
    };
  }, []);

  // Handle Dynamic Waveform Visualizer on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    let height = (canvas.height = 44);

    let phase = 0;
    const barCount = 28;

    const render = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const barWidth = Math.max(3, (width / barCount) - 3);
      
      for (let i = 0; i < barCount; i++) {
        let barHeight = 4;
        if (isPlaying) {
          const factor = Math.sin(phase + i * 0.35) * 0.5 + 0.5;
          const factor2 = Math.cos(phase * 1.5 + i * 0.2) * 0.5 + 0.5;
          barHeight = 6 + (factor * factor2) * (height - 12);
        } else {
          barHeight = 4 + Math.sin(i * 0.4) * 2;
        }

        const x = i * (barWidth + 3);
        const y = (height - barHeight) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (isPlaying) {
          grad.addColorStop(0, '#4ADE80'); // bright emerald
          grad.addColorStop(0.5, '#22D3EE'); // cyan
          grad.addColorStop(1, '#10B981');
        } else {
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }

      if (isPlaying) {
        phase += 0.14 * playbackSpeed;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed]);

  // Robust Sentence-by-Sentence TTS Engine
  const speakSentenceAt = (index: number) => {
    if (!('speechSynthesis' in window)) {
      return;
    }

    if (index >= sentences.length) {
      // Completed all sentences
      setIsPlaying(false);
      setIsPaused(false);
      setActiveSentenceIndex(-1);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    currentIndexRef.current = index;
    setActiveSentenceIndex(index);

    const rawText = sentences[index];
    const textToSpeak = cleanSpeechSentence(rawText);
    if (!textToSpeak) {
      speakSentenceAt(index + 1);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance;

    // Pick best Hindi or Indian English voice
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('HI') || v.name.toLowerCase().includes('hindi'));
    const indianEngVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en_IN') || v.name.toLowerCase().includes('india'));
    
    if (hindiVoice) {
      utterance.voice = hindiVoice;
      utterance.lang = 'hi-IN';
    } else if (indianEngVoice) {
      utterance.voice = indianEngVoice;
      utterance.lang = 'en-IN';
    } else {
      utterance.lang = 'hi-IN';
    }

    utterance.rate = speedRef.current;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      if (isPlayingRef.current) {
        speakSentenceAt(index + 1);
      }
    };

    utterance.onerror = (e) => {
      console.warn('TTS utterance interrupted:', e);
      if (isPlayingRef.current && index + 1 < sentences.length) {
        speakSentenceAt(index + 1);
      } else {
        setIsPlaying(false);
        setIsPaused(false);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // Atmospheric Music & SFX coordination helpers
  const handleMoodChange = (moodId: string) => {
    setSelectedMood(moodId);
    if (isPlaying && isBgmActive) {
      const effectiveMood = moodId === 'auto_smart' ? autoDetectedMoodId : moodId;
      autoAudioEngine.playMood(effectiveMood, bgmVolume, selectedSection);
    }
  };

  const handleBgmVolumeChange = (vol: number) => {
    setBgmVolume(vol);
    autoAudioEngine.setVolume(vol);
  };

  const handleToggleBgmActive = () => {
    const nextState = !isBgmActive;
    setIsBgmActive(nextState);
    if (nextState && isPlaying) {
      autoAudioEngine.playMood(activeMoodId, bgmVolume, selectedSection);
    } else {
      autoAudioEngine.stop();
    }
  };

  // Start Playback from start or given index
  const startPlayback = (fromIndex = 0) => {
    if (!('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlaying(true);
    setIsPaused(false);
    setElapsedSeconds(0);

    speakSentenceAt(fromIndex);

    // Coordinate automatic story-adaptive background music & SFX
    if (isBgmActive) {
      autoAudioEngine.playMood(activeMoodId, bgmVolume, selectedSection);
    }

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  };

  const pausePlayback = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(true);
    autoAudioEngine.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const resumePlayback = () => {
    const resumeIndex = Math.max(0, activeSentenceIndex);
    setIsPlaying(true);
    setIsPaused(false);
    speakSentenceAt(resumeIndex);

    // Resume automatic background atmosphere
    if (isBgmActive) {
      autoAudioEngine.playMood(activeMoodId, bgmVolume, selectedSection);
    }

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopPlayback = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setActiveSentenceIndex(-1);
    setElapsedSeconds(0);
    autoAudioEngine.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const jumpToSentence = (index: number) => {
    if (isPlaying) {
      speakSentenceAt(index);
    } else {
      setActiveSentenceIndex(index);
      startPlayback(index);
    }
  };

  const handleNextSentence = () => {
    const next = Math.min(sentences.length - 1, activeSentenceIndex + 1);
    jumpToSentence(next);
  };

  const handlePrevSentence = () => {
    const prev = Math.max(0, activeSentenceIndex - 1);
    jumpToSentence(prev);
  };

  // Change playback speed
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    speedRef.current = speed;
    if (isPlaying) {
      const curr = Math.max(0, activeSentenceIndex);
      speakSentenceAt(curr);
    }
  };

  // Copy Full Podcast Script & Notes
  const handleCopy = () => {
    const fullText = `🎧 ${episode.title}\nSubject: ${episode.subjectTopic}\nEstimated Duration: ${episode.estimatedDuration}\n\n[AUDIO SCRIPT]\n${episode.fullScript}\n\n[KEY TAKEAWAYS]\n${episode.takeaways.map(t => '• ' + t).join('\n')}\n\n[MEMORY TRICK]\n${episode.mnemonic}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download Offline Markdown Notes
  const handleDownload = () => {
    const mdContent = `# 🎙️ ${episode.title}
**Subject / Topic:** ${episode.subjectTopic}
**Audio Duration:** ${episode.estimatedDuration}

---

## 🎧 Audio Podcast Script (Story-Driven Learning)

### ⚡ The Hook
${episode.hook || 'Opening story hook'}

### 📖 The Journey / Core Concept
${episode.journey || episode.fullScript}

### 🎯 Climax & Exam Insight
${episode.climax || 'Exam key understanding'}

---

## 📝 Memory Anchor & Quick Revision Notes
### 📌 3 Key Takeaways:
${episode.takeaways.map((t, idx) => `${idx + 1}. ${t}`).join('\n')}

### 💡 Memory Trick / Mnemonic:
> ${episode.mnemonic}

*Generated by Examix AI Story Studio — Educational Podcast Narrator*
`;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${episode.title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}_podcast_notes.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download high-fidelity MP3 audio track
  const handleDownloadMp3 = async () => {
    if (isDownloadingMp3) return;
    setIsDownloadingMp3(true);
    try {
      await downloadPodcastAsMp3(episode.title, episode.fullScript, {
        voice: 'Kore',
        autoDownload: true
      });
      setMp3Downloaded(true);
      setTimeout(() => setMp3Downloaded(false), 3500);
    } catch (err) {
      console.error('Error exporting podcast MP3:', err);
    } finally {
      setIsDownloadingMp3(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div 
      id="podcast-studio-card"
      className="group relative my-5 overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-b from-[#081711] via-[#0B1512] to-[#060D0B] shadow-[0_12px_45px_rgba(0,0,0,0.7)] transition-all duration-300 hover:border-emerald-500/40"
    >
      {/* Decorative Top Studio Banner */}
      <div className="relative overflow-hidden border-b border-white/10 bg-[#0E241B]/70 px-4 py-3.5 sm:px-6 backdrop-blur-md">
        {/* Glow effect */}
        <div className="absolute -top-12 -left-12 h-32 w-32 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-teal-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          {/* Studio Brand & On-Air Badge */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black shadow-[0_0_20px_rgba(74,222,128,0.4)]">
              <Radio size={18} className={isPlaying ? "animate-pulse" : ""} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400 font-mono">
                  Story Studio
                </span>
                <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase text-emerald-300">
                  <span className={`h-1.5 w-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'}`} />
                  {isPlaying ? 'ON AIR' : 'PODCAST READY'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium truncate max-w-xs">
                {episode.subjectTopic}
              </p>
            </div>
          </div>

          {/* Action Tabs & Download Buttons */}
          <div className="flex items-center gap-1.5">
            <div className="flex rounded-xl bg-black/40 p-1 border border-white/10 text-xs">
              <button
                onClick={() => setActiveTab('player')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                  activeTab === 'player'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Headphones size={13} />
                <span>Audio Story</span>
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                  activeTab === 'notes'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileText size={13} />
                <span>Revision Notes</span>
              </button>
            </div>

            <button
              onClick={handleDownloadMp3}
              disabled={isDownloadingMp3}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                mp3Downloaded
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500 hover:text-black shadow-sm'
              }`}
              title="Download full podcast audio as MP3"
            >
              {isDownloadingMp3 ? (
                <Loader2 size={13} className="animate-spin text-emerald-300" />
              ) : mp3Downloaded ? (
                <Check size={13} />
              ) : (
                <FileAudio size={13} />
              )}
              <span className="hidden sm:inline">
                {isDownloadingMp3 ? 'Exporting MP3...' : mp3Downloaded ? 'MP3 Saved!' : 'Download MP3'}
              </span>
              <span className="sm:hidden">
                {isDownloadingMp3 ? 'MP3...' : mp3Downloaded ? 'Saved' : 'MP3'}
              </span>
            </button>

            <button
              onClick={handleCopy}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition-all hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
              title="Copy script & notes"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>

            <button
              onClick={handleDownload}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition-all hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
              title="Download offline notes (.md)"
            >
              <Download size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="p-4 sm:p-6 space-y-5">
        {/* Episode Header & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>{episode.title}</span>
              <Sparkles size={16} className="text-emerald-400 shrink-0" />
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 font-mono text-gray-300 border border-white/10">
                <Clock size={11} className="text-emerald-400" />
                <span>{episode.estimatedDuration}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Languages size={12} />
                <span>Hindi / Hinglish TTS Narrator</span>
              </span>
            </div>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10 text-[11px] font-semibold font-mono">
            <span className="px-1.5 text-gray-500 uppercase text-[9px]">Speed</span>
            {[0.75, 1, 1.25, 1.5].map((spd) => (
              <button
                key={spd}
                onClick={() => handleSpeedChange(spd)}
                className={`rounded-lg px-2 py-0.5 transition-colors cursor-pointer ${
                  playbackSpeed === spd
                    ? 'bg-emerald-500 text-black font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Studio Audio Player Controls */}
        <div className="rounded-2xl border border-white/10 bg-[#0B1A14]/80 p-4 shadow-inner space-y-3">
          {/* Animated Waveform frequency bar visualizer */}
          <div className="w-full overflow-hidden rounded-xl bg-black/40 px-3 py-1 border border-white/5 flex items-center justify-between">
            <div className="w-full flex-1">
              <canvas ref={canvasRef} className="w-full h-8 block" />
            </div>
          </div>

          {/* Progress Timeline & Scrubber */}
          <div className="space-y-1">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-200 ease-out shadow-[0_0_12px_rgba(74,222,128,0.8)]"
                style={{ width: `${Math.min(100, Math.max(2, progress * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-gray-400">
              <span>{formatTime(elapsedSeconds)}</span>
              <span className="text-emerald-400 font-semibold">{episode.estimatedDuration}</span>
            </div>
          </div>

          {/* Playback Controls & Section Selectors */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Section Quick Jump Filter */}
            <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
              <button
                onClick={() => {
                  stopPlayback();
                  setSelectedSection('all');
                }}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                  selectedSection === 'all'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-gray-400 hover:text-white bg-white/5 border border-white/5'
                }`}
              >
                Full Story
              </button>
              {episode.hook && (
                <button
                  onClick={() => {
                    stopPlayback();
                    setSelectedSection('hook');
                  }}
                  className={`rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                    selectedSection === 'hook'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-gray-400 hover:text-white bg-white/5 border border-white/5'
                  }`}
                >
                  ⚡ Hook
                </button>
              )}
              {episode.journey && (
                <button
                  onClick={() => {
                    stopPlayback();
                    setSelectedSection('journey');
                  }}
                  className={`rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                    selectedSection === 'journey'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-gray-400 hover:text-white bg-white/5 border border-white/5'
                  }`}
                >
                  📖 Story
                </button>
              )}
              {episode.climax && (
                <button
                  onClick={() => {
                    stopPlayback();
                    setSelectedSection('climax');
                  }}
                  className={`rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                    selectedSection === 'climax'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-gray-400 hover:text-white bg-white/5 border border-white/5'
                  }`}
                >
                  🎯 Exam Insight
                </button>
              )}
            </div>

            {/* Main Play / Pause & Skip Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevSentence}
                disabled={activeSentenceIndex <= 0}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Previous Sentence"
              >
                <Rewind size={15} />
              </button>

              {isPlaying ? (
                <button
                  onClick={pausePlayback}
                  className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 text-sm font-bold text-black shadow-[0_0_20px_rgba(74,222,128,0.4)] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <Pause size={18} />
                  <span>Pause Story</span>
                </button>
              ) : isPaused ? (
                <button
                  onClick={resumePlayback}
                  className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 text-sm font-bold text-black shadow-[0_0_20px_rgba(74,222,128,0.4)] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <Play size={18} />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  onClick={() => startPlayback(0)}
                  className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 text-sm font-bold text-black shadow-[0_0_25px_rgba(74,222,128,0.45)] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <Play size={18} />
                  <span>Listen Now (Hindi TTS)</span>
                </button>
              )}

              <button
                onClick={handleNextSentence}
                disabled={activeSentenceIndex >= sentences.length - 1}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Next Sentence"
              >
                <FastForward size={15} />
              </button>

              {(isPlaying || isPaused || activeSentenceIndex >= 0) && (
                <button
                  onClick={stopPlayback}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  title="Stop & Reset"
                >
                  <RotateCcw size={15} />
                </button>
              )}

              <button
                onClick={handleDownloadMp3}
                disabled={isDownloadingMp3}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-300 hover:bg-emerald-500 hover:text-black transition-colors cursor-pointer ml-1"
                title="Download episode as MP3"
              >
                {isDownloadingMp3 ? (
                  <Loader2 size={14} className="animate-spin text-emerald-300" />
                ) : (
                  <FileAudio size={14} />
                )}
                <span className="hidden md:inline">MP3</span>
              </button>
            </div>
          </div>

          {/* Automatic Story-Adaptive Background Score & SFX Atmosphere */}
          <div className="pt-2 border-t border-white/5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-emerald-400" />
                <span className="font-semibold text-white text-[11px]">Story BGM & Atmosphere:</span>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1.5">
                  <span>{currentMoodObj.emoji}</span>
                  <span className="font-bold">{currentMoodObj.hindiName}</span>
                </span>
                {isPlaying && isBgmActive && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-md animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> AUTO-SYNC
                  </span>
                )}
              </div>

              {/* Volume Slider & Mute Toggle */}
              <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-lg border border-white/5">
                <button
                  onClick={handleToggleBgmActive}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title={isBgmActive ? "Mute Story BGM" : "Unmute Story BGM"}
                >
                  {!isBgmActive || bgmVolume === 0 ? (
                    <VolumeX size={12} className="text-red-400" />
                  ) : (
                    <Volume2 size={12} className="text-emerald-400" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isBgmActive ? bgmVolume : 0}
                  onChange={(e) => {
                    if (!isBgmActive) setIsBgmActive(true);
                    handleBgmVolumeChange(parseFloat(e.target.value));
                  }}
                  className="w-14 h-1 bg-[#1C382E] rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  title={`BGM Volume: ${Math.round(bgmVolume * 100)}%`}
                />
                <span className="text-[9px] font-mono text-gray-400 w-5 text-right">
                  {isBgmActive ? `${Math.round(bgmVolume * 100)}%` : '0%'}
                </span>
              </div>
            </div>

            {/* Atmosphere theme presets (Automatic default + quick override) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              {Object.values(AUTO_MOODS).map((profile) => {
                const isSelected = selectedMood === profile.id;
                return (
                  <button
                    key={profile.id}
                    onClick={() => handleMoodChange(profile.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl whitespace-nowrap border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm font-semibold'
                        : 'bg-black/30 text-gray-400 border-white/5 hover:border-white/20 hover:text-gray-200'
                    }`}
                  >
                    <span className="text-xs">{profile.emoji}</span>
                    <span>{profile.id === 'auto_smart' ? '✨ Automatic Story-Sync' : profile.name.split('(')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab 1: Audio Story Script Viewer */}
        {activeTab === 'player' && (
          <div className="space-y-4">
            {/* Hook Section */}
            {episode.hook && (selectedSection === 'all' || selectedSection === 'hook') && (
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-2">
                  <Flame size={14} className="animate-pulse" />
                  <span>The Hook (First 15 Seconds)</span>
                </div>
                <p className="text-sm sm:text-base leading-relaxed text-amber-100/90 font-medium italic">
                  "{episode.hook.replace(/^[-*•]?\s*Hook\s*:\s*/i, '')}"
                </p>
              </div>
            )}

            {/* Journey / Core Story Section */}
            {(episode.journey || episode.fullScript) && (selectedSection === 'all' || selectedSection === 'journey') && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5 shadow-inner space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 text-xs font-semibold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <BookOpen size={14} />
                    <span>The Story & Academic Journey</span>
                  </span>
                  <span className="text-[11px] text-gray-400 font-mono">Click any line to jump narration</span>
                </div>

                <div className="space-y-2 text-sm sm:text-base leading-relaxed text-gray-200">
                  {sentences.map((sent, idx) => {
                    const isActive = isPlaying && activeSentenceIndex === idx;
                    return (
                      <span
                        key={idx}
                        onClick={() => jumpToSentence(idx)}
                        className={`inline cursor-pointer transition-all duration-200 rounded px-1.5 py-0.5 hover:bg-emerald-500/15 ${
                          isActive 
                            ? 'bg-emerald-500/25 text-emerald-200 font-medium shadow-[0_0_12px_rgba(74,222,128,0.3)] ring-1 ring-emerald-500/50' 
                            : ''
                        }`}
                        title="Click to play from here"
                      >
                        {sent}{' '}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Climax & Insight Section */}
            {episode.climax && (selectedSection === 'all' || selectedSection === 'climax') && (
              <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/5 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-2">
                  <Sparkles size={14} />
                  <span>Climax & Exam Insight</span>
                </div>
                <p className="text-sm sm:text-base leading-relaxed text-cyan-100/90 font-medium">
                  {episode.climax.replace(/^[-*•]?\s*(?:Climax|Insight)\s*:\s*/i, '')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Memory Anchor Notes & Exam Revision */}
        {activeTab === 'notes' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Key Summary / Takeaways */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Bookmark size={14} />
                <span>📌 कहानी का सारांश एवं मूल संदेश (Key Exam Takeaways)</span>
              </div>
              <ul className="space-y-2.5">
                {episode.takeaways.map((takeaway, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-gray-200">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-bold text-emerald-300 border border-emerald-500/30 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Character Profiles (if parsed) */}
            {episode.characters && episode.characters.length > 0 && (
              <div className="rounded-2xl border border-purple-500/30 bg-purple-950/15 p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
                  <BookOpen size={14} />
                  <span>🎭 मुख्य पात्र एवं चरित्र-चित्रण (Key Characters)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {episode.characters.map((char, idx) => (
                    <div key={idx} className="rounded-xl border border-purple-500/20 bg-black/40 p-3 space-y-1">
                      <div className="text-sm font-bold text-purple-200 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-purple-400" />
                        <span>{char.name}</span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed pl-3.5">
                        {char.role}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* High-Yield Exam Q&A (if parsed) */}
            {episode.examQA && episode.examQA.length > 0 && (
              <div className="rounded-2xl border border-blue-500/30 bg-blue-950/15 p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                  <FileText size={14} />
                  <span>📝 परीक्षा उपयोगी महत्वपूर्ण प्रश्न-उत्तर (Board Exam Q&A)</span>
                </div>
                <div className="space-y-3">
                  {episode.examQA.map((qa, idx) => (
                    <div key={idx} className="rounded-xl border border-blue-500/20 bg-black/40 p-3 space-y-1.5">
                      <div className="text-xs sm:text-sm font-bold text-blue-300">
                        {qa.question.startsWith('प्रश्न') || qa.question.startsWith('Q') ? qa.question : `प्रश्न ${idx + 1}: ${qa.question}`}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-200 leading-relaxed pl-2 border-l-2 border-blue-500/50">
                        {qa.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Memory Trick / Mnemonic Banner */}
            <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-transparent p-4 sm:p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-yellow-400 uppercase tracking-wider">
                <Sparkles size={14} />
                <span>💡 आसान मेमोरी ट्रिक (Mnemonic for Rapid Exam Recall)</span>
              </div>
              <p className="text-sm sm:text-base leading-relaxed text-yellow-100/95 font-medium pl-1">
                {episode.mnemonic}
              </p>
            </div>

            {/* Quick Actions at bottom of notes */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Revision Notes'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-400 transition-colors shadow-md cursor-pointer"
              >
                <Download size={14} />
                <span>Download Markdown Notes</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PodcastStudioCard;
