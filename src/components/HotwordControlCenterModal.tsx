import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Radio, 
  Sparkles, 
  ShieldCheck, 
  Moon, 
  Zap, 
  Clock, 
  Battery, 
  Volume2, 
  VolumeX, 
  Settings, 
  Sliders, 
  Smartphone, 
  Code, 
  Copy, 
  Check, 
  Play, 
  Square, 
  AlertTriangle,
  BrainCircuit,
  Flame,
  Info
} from 'lucide-react';
import { 
  HotwordConfig, 
  HotwordEngineSettings, 
  DEFAULT_HOTWORDS, 
  DEFAULT_HOTWORD_SETTINGS, 
  playWakeChime, 
  isWithinStudySchedule 
} from '../utils/hotwordEngine';

interface HotwordControlCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: HotwordEngineSettings;
  onUpdateSettings: (newSettings: HotwordEngineSettings) => void;
  onLaunchOledMode: () => void;
  isBackgroundListeningActive?: boolean;
}

export default function HotwordControlCenterModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onLaunchOledMode,
  isBackgroundListeningActive = false
}: HotwordControlCenterModalProps) {
  const [activeTab, setActiveTab] = useState<'matrix' | 'power_schedule' | 'auditory' | 'android_native'>('matrix');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [liveDbLevel, setLiveDbLevel] = useState(0);
  const [testDetectionResult, setTestDetectionResult] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Live Audio Level Visualizer for Mic Testing
  const startMicTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsMicTesting(true);
      setTestDetectionResult('Listening for wake words: Say "Hey Examix", "Teacher", "Poco", or "Nightwave"...');

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setLiveDbLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      // Hook temporary SpeechRecognition for testing
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'hi-IN';
        rec.onresult = (evt: any) => {
          for (let i = evt.resultIndex; i < evt.results.length; ++i) {
            const transcript = evt.results[i][0].transcript.toLowerCase();
            for (const hw of settings.hotwords) {
              if (hw.aliases.some(a => transcript.includes(a.toLowerCase())) || transcript.includes(hw.keyword.toLowerCase())) {
                setTestDetectionResult(`✅ Detected Hotword: "${hw.keyword}" (Matched: "${transcript}")`);
                playWakeChime('wake');
                break;
              }
            }
          }
        };
        rec.start();
      }
    } catch (e) {
      console.warn('Mic access error during test:', e);
      setIsMicTesting(false);
    }
  };

  const stopMicTest = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsMicTesting(false);
    setLiveDbLevel(0);
    setTestDetectionResult(null);
  };

  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, []);

  const handleToggleHotword = (id: string) => {
    const updated = settings.hotwords.map(hw => {
      if (hw.id === id) return { ...hw, enabled: !hw.enabled };
      return hw;
    });
    onUpdateSettings({ ...settings, hotwords: updated });
  };

  const handleSensitivityChange = (id: string, val: number) => {
    const updated = settings.hotwords.map(hw => {
      if (hw.id === id) return { ...hw, sensitivity: val };
      return hw;
    });
    onUpdateSettings({ ...settings, hotwords: updated });
  };

  const copyToClipboard = (code: string, key: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-white/10 bg-[#0E1513] text-white shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-[#4ADE80] border border-emerald-500/30 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
              <Radio size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Examix OS — Multi-Hotword & Screen-Off Engine</h3>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-[#4ADE80] border border-emerald-500/30 font-mono">
                  v3.0 KWS
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Always-listening wake matrix, inverted power scheduling & zero-screen oral mastery
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 border-b border-white/10 bg-black/20 overflow-x-auto">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'matrix'
                ? 'border-[#4ADE80] text-[#4ADE80]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Mic size={14} />
            <span>Wake-Up Matrix (5 Hotwords)</span>
          </button>

          <button
            onClick={() => setActiveTab('power_schedule')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'power_schedule'
                ? 'border-[#4ADE80] text-[#4ADE80]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Zap size={14} />
            <span>Inverted Power & Sleep Schedule</span>
          </button>

          <button
            onClick={() => setActiveTab('auditory')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'auditory'
                ? 'border-[#4ADE80] text-[#4ADE80]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Volume2 size={14} />
            <span>Auditory Cadence & Spoken Math</span>
          </button>

          <button
            onClick={() => setActiveTab('android_native')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'android_native'
                ? 'border-[#4ADE80] text-[#4ADE80]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Smartphone size={14} />
            <span>Android Native Service Arch</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* TAB 1: MULTI-HOTWORD WAKE-UP MATRIX */}
          {activeTab === 'matrix' && (
            <div className="space-y-6">
              
              {/* Quick Status & Live Mic Testing Bar */}
              <div className="p-4 rounded-2xl border border-white/10 bg-black/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Radio size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">On-Device Zero-Latency KWS Engine</h4>
                    <p className="text-xs text-gray-400">
                      Sub-150ms keyword spotting running directly on local audio stream.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => playWakeChime('wake')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Volume2 size={13} />
                    <span>Test Chime</span>
                  </button>

                  <button
                    onClick={isMicTesting ? stopMicTest : startMicTest}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer ${
                      isMicTesting
                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                    }`}
                  >
                    {isMicTesting ? (
                      <>
                        <Square size={13} />
                        <span>Stop Mic Test</span>
                      </>
                    ) : (
                      <>
                        <Play size={13} />
                        <span>Live Mic KWS Test</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Live Test Feedback Visualizer */}
              {isMicTesting && (
                <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-300">Live Audio Input Decibel Level:</span>
                    <span className="font-mono text-emerald-400 font-bold">{liveDbLevel}% dB</span>
                  </div>

                  {/* Audio Meter Bar */}
                  <div className="h-3 w-full rounded-full bg-black/60 overflow-hidden border border-emerald-500/30 p-0.5">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 transition-all duration-75"
                      style={{ width: `${liveDbLevel}%` }}
                    />
                  </div>

                  {testDetectionResult && (
                    <div className="p-2.5 rounded-xl bg-black/60 border border-emerald-500/20 text-xs font-mono text-emerald-300">
                      {testDetectionResult}
                    </div>
                  )}
                </div>
              )}

              {/* 5 Registered Hotwords Matrix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    5 Registered Wake-Up Hotwords
                  </h4>
                  <span className="text-[11px] text-gray-500 font-mono">
                    {settings.hotwords.filter(h => h.enabled).length} of 5 Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {settings.hotwords.map((hw) => (
                    <div 
                      key={hw.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        hw.enabled 
                          ? 'border-white/15 bg-white/5 hover:border-emerald-500/40' 
                          : 'border-white/5 bg-black/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white font-mono">
                              "{hw.keyword}"
                            </span>
                            <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                              hw.category === 'core'
                                ? 'bg-emerald-500/20 text-[#4ADE80] border-emerald-500/30'
                                : hw.category === 'classroom'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : hw.category === 'callout'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                : hw.category === 'night'
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}>
                              {hw.category}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed">
                            {hw.description}
                          </p>
                        </div>

                        {/* Toggle Switch */}
                        <button
                          onClick={() => handleToggleHotword(hw.id)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            hw.enabled ? 'bg-emerald-500' : 'bg-neutral-800'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              hw.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Aliases & Sensitivity Slider */}
                      {hw.enabled && (
                        <div className="mt-3 pt-3 border-t border-white/5 space-y-2.5">
                          <div className="flex items-center justify-between text-[11px] text-gray-400">
                            <span>Aliases: <span className="font-mono text-gray-300">{hw.aliases.slice(0, 3).join(', ')}</span></span>
                            <span className="font-mono">{Math.round(hw.sensitivity * 100)}% Sensitivity</span>
                          </div>

                          <input
                            type="range"
                            min="0.4"
                            max="1.0"
                            step="0.05"
                            value={hw.sensitivity}
                            onChange={(e) => handleSensitivityChange(hw.id, parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVERTED POWER & STUDY SCHEDULE */}
          {activeTab === 'power_schedule' && (
            <div className="space-y-6">
              
              {/* Inverted Logic Hero Box */}
              <div className="p-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-[#12271F] via-[#0D1C17] to-[#081511] space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-[#4ADE80] border border-emerald-500/30 shadow-[0_0_20px_rgba(74,222,128,0.25)]">
                      <Zap size={24} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">Inverted Power Assistant Protocol</h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#4ADE80] border border-emerald-500/30 text-[10px] font-bold font-mono">
                          Zero Screen Battery Waste
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        Unlike traditional assistants that keep the screen on, Examix AI listens <strong className="text-emerald-300">ONLY when the display is sleeping/off</strong>, and auto-pauses when the screen is active to preserve 100% battery for visual tasks.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onUpdateSettings({ ...settings, invertedPowerMode: !settings.invertedPowerMode })}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.invertedPowerMode ? 'bg-emerald-500' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings.invertedPowerMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* OLED Launcher */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 rounded-2xl bg-black/60 border border-emerald-500/20 gap-3">
                  <div className="flex items-center gap-2.5">
                    <Moon size={16} className="text-purple-400" />
                    <span className="text-xs font-medium text-gray-200">
                      Want to simulate true screen-off right now on web/desktop?
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onLaunchOledMode();
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
                  >
                    <Moon size={13} />
                    <span>Launch OLED True-Black Mode</span>
                  </button>
                </div>
              </div>

              {/* Study Window Scheduling */}
              <div className="p-5 rounded-3xl border border-white/10 bg-black/30 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-amber-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Adaptive Study Window (Anti-Battery Drain Guardrail)</h4>
                      <p className="text-xs text-gray-400">
                        Restricts background listening to your designated study hours.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onUpdateSettings({ ...settings, studyScheduleEnabled: !settings.studyScheduleEnabled })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.studyScheduleEnabled ? 'bg-amber-500' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings.studyScheduleEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {settings.studyScheduleEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-2xl border border-white/5 bg-black/40 space-y-1">
                      <label className="text-[11px] font-bold text-gray-400">Study Start Time</label>
                      <input
                        type="time"
                        value={settings.studyScheduleStart}
                        onChange={(e) => onUpdateSettings({ ...settings, studyScheduleStart: e.target.value })}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-amber-400 outline-none"
                      />
                    </div>

                    <div className="p-3.5 rounded-2xl border border-white/5 bg-black/40 space-y-1">
                      <label className="text-[11px] font-bold text-gray-400">Study End Time</label>
                      <input
                        type="time"
                        value={settings.studyScheduleEnd}
                        onChange={(e) => onUpdateSettings({ ...settings, studyScheduleEnd: e.target.value })}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-amber-400 outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* 15-Min Auto-Hibernate Rule */}
                <div className="p-3.5 rounded-2xl border border-white/5 bg-black/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-gray-300">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>Auto-Hibernate after 15 minutes of idle silence</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">Active (15m Guard)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUDITORY CADENCE & SPOKEN MATH */}
          {activeTab === 'auditory' && (
            <div className="space-y-6">
              
              <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-950/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Volume2 size={18} className="text-purple-400" />
                  <h4 className="text-sm font-bold text-white">Screen-Off Conversational Cadence (25–45 Words)</h4>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Because the user cannot see the screen, all voice answers are tightly constrained to <strong className="text-purple-300">15–30 seconds max</strong> using conversational phonetics for equations.
                </p>
              </div>

              {/* Spoken Phonetics Examples Table */}
              <div className="p-4 rounded-2xl border border-white/10 bg-black/40 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Mathematical Phonetic Conversion Examples
                </h4>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-black/60 border border-white/5 space-y-1">
                    <div className="text-gray-400 font-mono">LaTeX Equation: <span className="text-emerald-300">{"$$F = \\frac{1}{4\\pi\\varepsilon_0}\\frac{q_1 q_2}{r^2}$$"}</span></div>
                    <div className="text-purple-300 font-medium">Spoken Audio: "Coulomb force is equal to 9 into 10 to the power 9, multiplied by q1 into q2, divided by r-square."</div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/60 border border-white/5 space-y-1">
                    <div className="text-gray-400 font-mono">LaTeX Equation: <span className="text-emerald-300">{"$$q = ne \\implies n = \\frac{q}{e}$$"}</span></div>
                    <div className="text-purple-300 font-medium">Spoken Audio: "Charge is equal to n into e, which means n equals q divided by e."</div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/60 border border-white/5 space-y-1">
                    <div className="text-gray-400 font-mono">LaTeX Equation: <span className="text-emerald-300">{"$$E = \\frac{k q}{r^2}\\hat{r}$$"}</span></div>
                    <div className="text-purple-300 font-medium">Spoken Audio: "Electric field equals k into q divided by r-square in the direction of r-cap."</div>
                  </div>
                </div>
              </div>

              {/* Hands-Free Socratic Interruption & Recall */}
              <div className="p-4 rounded-2xl border border-white/10 bg-black/40 space-y-2">
                <div className="flex items-center gap-2">
                  <BrainCircuit size={16} className="text-[#4ADE80]" />
                  <h4 className="text-xs font-bold text-white">Instant Barge-In & Hands-Free Oral Recall</h4>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  The audio engine automatically cuts speech output the millisecond student starts talking. If an answer to a 15-day check is missed, Examix delivers a 15-second oral hint and prompts the student to say the missing constant aloud.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: ANDROID NATIVE SERVICE ARCHITECTURE */}
          {activeTab === 'android_native' && (
            <div className="space-y-5">
              
              <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-950/20 flex items-start gap-3">
                <Smartphone size={20} className="text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-gray-300 space-y-1">
                  <h4 className="font-bold text-white">Android Native Foreground Service Architecture</h4>
                  <p className="leading-relaxed">
                    For native Android deployment (APK/AAB), Examix AI uses <code className="text-blue-300">VoiceMentorBackgroundService</code> with partial <code className="text-blue-300">WAKE_LOCK</code> and BroadcastReceivers for <code className="text-blue-300">ACTION_SCREEN_OFF</code>.
                  </p>
                </div>
              </div>

              {/* Snippet 1: VoiceMentorBackgroundService.kt */}
              <div className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 border-b border-white/10">
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-300">
                    <Code size={14} className="text-emerald-400" />
                    <span>VoiceMentorBackgroundService.kt</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(KOTLIN_SERVICE_CODE, 'service_kt')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 font-mono transition-colors cursor-pointer"
                  >
                    {copiedKey === 'service_kt' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedKey === 'service_kt' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-4 text-[11px] font-mono text-gray-300 overflow-x-auto max-h-56 leading-relaxed">
                  {KOTLIN_SERVICE_CODE}
                </pre>
              </div>

              {/* Snippet 2: AndroidManifest.xml */}
              <div className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 border-b border-white/10">
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-300">
                    <Code size={14} className="text-blue-400" />
                    <span>AndroidManifest.xml (Permissions & Receivers)</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(ANDROID_MANIFEST_CODE, 'manifest_xml')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 font-mono transition-colors cursor-pointer"
                  >
                    {copiedKey === 'manifest_xml' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedKey === 'manifest_xml' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-4 text-[11px] font-mono text-gray-300 overflow-x-auto max-h-48 leading-relaxed">
                  {ANDROID_MANIFEST_CODE}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3.5 bg-black/40">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Hotwords Active: Examix, Teacher, Poco, Nightwave, Hello</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Save & Close
          </button>
        </div>

      </div>
    </div>
  );
}

const KOTLIN_SERVICE_CODE = `package com.examix.ai.service

import android.app.*
import android.content.*
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import ai.picovoice.porcupine.PorcupineManager

class VoiceMentorBackgroundService : Service() {
    private var wakeLock: PowerManager.WakeLock? = null
    private var porcupineManager: PorcupineManager? = null
    private val screenReceiver = ScreenStateReceiver()

    override fun onCreate() {
        super.onCreate()
        val powerManager = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Examix::VoiceKWS")

        // Register Dynamic Broadcast Receiver for Inverted Logic
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
        }
        registerReceiver(screenReceiver, filter)
    }

    fun startHotwordListening() {
        wakeLock?.acquire(15 * 60 * 1000L) // 15-min auto-hibernate guard
        porcupineManager = PorcupineManager.Builder()
            .setKeywords(arrayOf("examix", "teacher", "picu", "nightwave"))
            .setSensitivities(floatArrayOf(0.8f, 0.85f, 0.8f, 0.75f))
            .build(applicationContext) { keywordIndex ->
                // Sub-150ms wake trigger
                onHotwordTriggered(keywordIndex)
            }
        porcupineManager?.start()
    }

    fun pauseHotwordListening() {
        porcupineManager?.stop()
        if (wakeLock?.isHeld == true) wakeLock?.release()
    }

    private fun onHotwordTriggered(index: Int) {
        // Trigger voice recognition & synthesize oral answer without turning on screen
        ExamixOralPipeline.processScreenOffQuery(applicationContext)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}`;

const ANDROID_MANIFEST_CODE = `<!-- Examix AI Android Manifest Permissions -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.examix.ai">

    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

    <application ...>
        <service
            android:name=".service.VoiceMentorBackgroundService"
            android:foregroundServiceType="microphone"
            android:exported="false" />

        <receiver
            android:name=".service.ScreenStateReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.SCREEN_OFF" />
                <action android:name="android.intent.action.SCREEN_ON" />
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>
    </application>
</manifest>`;
