import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ShieldCheck, 
  Moon, 
  Zap, 
  Clock, 
  Battery, 
  Radio, 
  Flame,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { HotwordConfig, HotwordEngineSettings, playWakeChime } from '../utils/hotwordEngine';
import { cleanTextForSpeech } from '../utils/speechConverter';

interface ScreenOffOledOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  settings: HotwordEngineSettings;
  onUpdateSettings: (newSettings: HotwordEngineSettings) => void;
  onProcessVoiceQuery: (query: string, hotword?: HotwordConfig) => Promise<string>;
  activeHotword?: string | null;
}

export default function ScreenOffOledOverlay({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onProcessVoiceQuery,
  activeHotword: initialActiveHotword
}: ScreenOffOledOverlayProps) {
  const [timeStr, setTimeStr] = useState('');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [sessionState, setSessionState] = useState<'listening' | 'processing' | 'speaking' | 'idle'>('listening');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [mentorResponse, setMentorResponse] = useState('');
  const [activeTrigger, setActiveTrigger] = useState<string | null>(initialActiveHotword || null);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [pulseScale, setPulseScale] = useState(1);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    timerRef.current = setInterval(updateTime, 1000);

    // Battery status API
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);

        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
        battery.addEventListener('chargingchange', () => {
          setIsCharging(battery.charging);
        });
      }).catch(() => {});
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Initialize Speech Recognition & Synthesis for OLED Screen-Off Mode
  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      return;
    }

    synthRef.current = window.speechSynthesis;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'hi-IN';

      recognition.onstart = () => {
        setSessionState('listening');
      };

      recognition.onresult = async (event: any) => {
        // Instant Barge-In: If user speaks while AI is speaking, interrupt immediately
        if (synthRef.current && synthRef.current.speaking) {
          synthRef.current.cancel();
          setSessionState('listening');
        }

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (final.trim()) {
          setLiveTranscript(final);
          await handleSpeechInput(final.trim());
        } else if (interim.trim()) {
          setLiveTranscript(interim);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('OLED Screen-Off recognition error:', e);
        }
      };

      recognition.onend = () => {
        // Auto-restart to keep always-listening in screen-off mode
        if (isOpen && sessionState !== 'speaking' && sessionState !== 'processing') {
          try { recognition.start(); } catch (e) {}
        }
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('Failed to start recognition in OLED mode:', e);
      }
    }

    // Play wake chime upon entering OLED screen-off mode
    playWakeChime('wake');

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [isOpen]);

  const handleSpeechInput = async (spokenText: string) => {
    setSessionState('processing');
    
    // Check if any hotword was invoked
    const cleanLower = spokenText.toLowerCase();
    let matchedHw: HotwordConfig | undefined = undefined;

    for (const hw of settings.hotwords) {
      if (!hw.enabled) continue;
      const terms = [hw.keyword.toLowerCase(), ...hw.aliases.map(a => a.toLowerCase())];
      if (terms.some(t => cleanLower.includes(t))) {
        matchedHw = hw;
        setActiveTrigger(hw.keyword);
        break;
      }
    }

    if (matchedHw) {
      playWakeChime('wake');
    }

    try {
      const response = await onProcessVoiceQuery(spokenText, matchedHw);
      setMentorResponse(response);
      setSessionState('speaking');

      // Convert response to conversational audio
      const audioClean = cleanTextForSpeech(response);
      speakOralResponse(audioClean);
    } catch (err) {
      console.error('Error processing screen-off speech:', err);
      setSessionState('listening');
    }
  };

  const speakOralResponse = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 1.05; // natural swift pace

    // Choose preferred voice
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('en-IN') || v.name.includes('India'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      setSessionState('listening');
      setLiveTranscript('');
      // Resume listening
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (e) {}
      }
    };

    utterance.onerror = () => {
      setSessionState('listening');
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (e) {}
      }
    };

    synthRef.current.speak(utterance);
  };

  if (!isOpen) return null;

  return (
    <div 
      id="screen-off-oled-canvas"
      className="fixed inset-0 z-[100] bg-black text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden"
      style={{ backgroundColor: '#000000' }}
    >
      {/* Top Status Bar (Ultra-minimal OLED True-Black layout) */}
      <div className="flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
            <Clock size={13} className="text-neutral-500" />
            <span>{timeStr}</span>
          </div>

          <div className="h-3 w-px bg-neutral-800" />

          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
            <Battery size={13} className={isCharging ? 'text-emerald-500' : 'text-neutral-400'} />
            <span>{batteryLevel !== null ? `${batteryLevel}%` : 'OLED Battery Saver'}</span>
            {isCharging && <Zap size={11} className="text-emerald-400 animate-pulse" />}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSubtitles(!showSubtitles)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono border transition-all cursor-pointer ${
              showSubtitles 
                ? 'bg-neutral-900 text-neutral-300 border-neutral-800' 
                : 'bg-transparent text-neutral-600 border-neutral-900'
            }`}
          >
            {showSubtitles ? 'CC ON' : 'CC OFF'}
          </button>

          <button
            onClick={onClose}
            title="Exit Screen-Off Mode"
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-xs font-mono transition-all cursor-pointer"
          >
            <X size={13} />
            <span>Wake Screen</span>
          </button>
        </div>
      </div>

      {/* Center Ambient Breathing Hub (True Black Zero-Power Canvas) */}
      <div className="flex flex-col items-center justify-center text-center my-auto space-y-6">
        
        {/* Core Breathing Orb Ring */}
        <div className="relative flex items-center justify-center">
          {/* Animated low-light aura */}
          <div 
            className={`absolute rounded-full transition-all duration-700 pointer-events-none ${
              sessionState === 'speaking'
                ? 'w-44 h-44 bg-purple-950/40 border border-purple-500/30 animate-pulse'
                : sessionState === 'processing'
                ? 'w-40 h-40 bg-blue-950/40 border border-blue-500/30 animate-ping'
                : 'w-36 h-36 bg-emerald-950/20 border border-emerald-500/20'
            }`}
          />

          <div className={`relative flex h-24 w-24 items-center justify-center rounded-full border shadow-2xl transition-all duration-500 ${
            sessionState === 'speaking'
              ? 'border-purple-500/60 bg-[#0A0512] text-purple-400'
              : sessionState === 'processing'
              ? 'border-blue-500/60 bg-[#040A14] text-blue-400'
              : 'border-emerald-500/40 bg-[#020D08] text-emerald-400'
          }`}>
            {sessionState === 'speaking' ? (
              <Volume2 size={36} className="animate-bounce" />
            ) : sessionState === 'processing' ? (
              <Radio size={36} className="animate-spin" />
            ) : (
              <Mic size={36} className="animate-pulse" />
            )}
          </div>
        </div>

        {/* State Label */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <span className={`h-2 w-2 rounded-full ${
              sessionState === 'speaking' 
                ? 'bg-purple-400 animate-ping' 
                : sessionState === 'processing' 
                ? 'bg-blue-400 animate-pulse' 
                : 'bg-emerald-400'
            }`} />
            <h3 className="text-sm font-medium tracking-wide text-neutral-300 font-mono">
              {sessionState === 'speaking'
                ? 'Speaking Audio Answer...'
                : sessionState === 'processing'
                ? 'Analyzing Question...'
                : 'Always-Listening (Screen-Off Mode)'}
            </h3>
          </div>

          <p className="text-[11px] text-neutral-500 font-mono">
            {activeTrigger ? `Active Trigger: "${activeTrigger}"` : 'Say "Hey Examix", "Teacher", "Poco", or "Nightwave"'}
          </p>
        </div>

        {/* Live Audio Subtitle Card (Low Glare) */}
        {showSubtitles && (liveTranscript || mentorResponse) && (
          <div className="max-w-lg w-full px-4 py-3 rounded-2xl bg-neutral-950/80 border border-neutral-900 text-left space-y-1.5 animate-in fade-in duration-300">
            {liveTranscript && (
              <div className="text-xs text-neutral-400 font-mono flex items-start gap-2">
                <span className="text-emerald-400 shrink-0">You:</span>
                <span className="text-neutral-200">{liveTranscript}</span>
              </div>
            )}
            {mentorResponse && sessionState === 'speaking' && (
              <div className="text-xs text-purple-300/90 font-mono flex items-start gap-2 pt-1 border-t border-neutral-900">
                <span className="text-purple-400 shrink-0">AI:</span>
                <span className="text-neutral-300 leading-relaxed">{mentorResponse}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Wake Matrix Pills */}
      <div className="flex flex-col items-center space-y-3 opacity-60 hover:opacity-100 transition-opacity">
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
          {settings.hotwords.filter(h => h.enabled).map((hw) => (
            <div 
              key={hw.id}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border transition-all ${
                activeTrigger === hw.keyword
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(74,222,128,0.2)]'
                  : 'bg-neutral-950 text-neutral-500 border-neutral-900'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{hw.keyword}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 text-[10px] text-neutral-600 font-mono">
          <span>OLED 100% True-Black (0W Pixels)</span>
          <span>•</span>
          <span>Double-tap anywhere or tap Wake Screen to exit</span>
        </div>
      </div>
    </div>
  );
}
