import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  X, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Loader2, 
  RotateCcw, 
  Radio, 
  MessageSquare,
  Globe,
  Camera,
  CameraOff,
  Scan,
  Crosshair,
  SwitchCamera,
  Wifi
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { ConceptMastery } from './MasteryDashboard';
import { cleanTextForSpeech, getOptimalVoice, createSpeechBoundaryTracker, SpeechBoundaryTracker } from '../utils/speechConverter';

interface VoiceMentorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVoiceMessageToChat: (userText: string, assistantReply: string) => void;
  modelId: string;
  memory?: ConceptMastery[];
  onMasteryUpdate?: (updates: any[]) => void;
}

type SpeechLangOption = 'hi-IN' | 'en-IN' | 'en-US';
type DataSaverMode = 'saver-480p' | 'high-720p';

export default function VoiceMentorModal({
  isOpen,
  onClose,
  onSendVoiceMessageToChat,
  modelId,
  memory,
  onMasteryUpdate
}: VoiceMentorModalProps) {
  const [sessionState, setSessionState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [speechLang, setSpeechLang] = useState<SpeechLangOption>('hi-IN');
  const [dataSaverMode, setDataSaverMode] = useState<DataSaverMode>('saver-480p');
  
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [mentorResponse, setMentorResponse] = useState('');
  const [spokenText, setSpokenText] = useState('');
  const [speechCharIndex, setSpeechCharIndex] = useState(0);
  const speechIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackerRef = useRef<SpeechBoundaryTracker | null>(null);
  const [conversationHistory, setConversationHistory] = useState<{ role: 'user' | 'assistant'; text: string; imagePreview?: string }[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [speechRate] = useState<number>(1.0);
  const [audioLevel, setAudioLevel] = useState<number[]>(new Array(16).fill(10));
  
  // Camera & Vision Pipeline State (Zero-overhead local streaming)
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [lastCapturedImage, setLastCapturedImage] = useState<string | null>(null);
  const [laserTarget, setLaserTarget] = useState<{ x: number; y: number; label?: string } | null>(null);
  const [shutterAnimation, setShutterAnimation] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize Speech Synthesis & Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = speechLang;

        recognition.onstart = () => {
          setSessionState('listening');
        };

        recognition.onresult = (event: any) => {
          // Instant Barge-In: If the student speaks while AI is talking, immediately halt speech
          if (synthRef.current && synthRef.current.speaking) {
            synthRef.current.cancel();
            setSessionState('listening');
          }

          let currentInterim = '';
          let finalTrans = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTrans += event.results[i][0].transcript;
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }

          if (finalTrans.trim()) {
            setTranscript(finalTrans);
            setInterimTranscript('');
            handleVoiceSubmit(finalTrans);
          } else {
            setInterimTranscript(currentInterim);
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech') {
            console.warn('Speech recognition warning:', event.error);
          }
        };

        recognition.onend = () => {
          // Keep listening active if in modal and not speaking or thinking
          if (isOpen && sessionState === 'listening') {
            try {
              recognition.start();
            } catch (e) {}
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      stopAllAudio();
      stopCamera();
    };
  }, [speechLang]);

  // When modal opens, auto-greet
  useEffect(() => {
    if (isOpen) {
      const greeting = speechLang === 'hi-IN'
        ? "Examix Live active hai. Apna question boliye ya camera scan kijiye."
        : "Examix Live active. Speak your question or tap Scan to analyze.";
      
      setMentorResponse(greeting);
      setSessionState('speaking');
      speakText(greeting, () => {
        startListening();
      });
    } else {
      stopAllAudio();
      stopCamera();
    }
  }, [isOpen]);

  // Audio wave animation simulation
  useEffect(() => {
    const updateLevels = () => {
      if (sessionState === 'listening') {
        setAudioLevel(prev => prev.map(() => Math.floor(Math.random() * 45) + 15));
      } else if (sessionState === 'speaking') {
        setAudioLevel(prev => prev.map(() => Math.floor(Math.random() * 55) + 20));
      } else if (sessionState === 'thinking') {
        setAudioLevel(prev => prev.map((_, i) => Math.sin(Date.now() / 200 + i) * 20 + 25));
      } else {
        setAudioLevel(new Array(16).fill(8));
      }
      animationFrameRef.current = requestAnimationFrame(updateLevels);
    };

    animationFrameRef.current = requestAnimationFrame(updateLevels);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [sessionState]);

  // Camera Stream Start (100% on-device zero API calls)
  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
        }

        const constraints = {
          video: {
            facingMode: facing,
            width: dataSaverMode === 'saver-480p' ? { ideal: 640 } : { ideal: 1280 },
            height: dataSaverMode === 'saver-480p' ? { ideal: 480 } : { ideal: 720 },
            frameRate: { ideal: 15, max: 20 }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setIsCameraActive(true);
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const toggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const switchCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      startCamera(nextFacing);
    }
  };

  // Edge Frame Ingestion with Smart 480p/720p WebP/JPEG Compression (<40 KB Free-Tier Safe)
  const captureOptimizedFrame = useCallback((): string | null => {
    if (!videoRef.current || !isCameraActive) return null;
    try {
      const vid = videoRef.current;
      const vWidth = vid.videoWidth || 640;
      const vHeight = vid.videoHeight || 480;

      // Downsample to max 640px (480p) or 960px (720p)
      const maxDim = dataSaverMode === 'saver-480p' ? 640 : 960;
      let targetWidth = vWidth;
      let targetHeight = vHeight;

      if (vWidth > maxDim) {
        targetWidth = maxDim;
        targetHeight = Math.round((vHeight * maxDim) / vWidth);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;

      // Draw current video frame to canvas
      ctx.drawImage(vid, 0, 0, targetWidth, targetHeight);

      // Prefer WebP for high quality at ~20-35 KB
      let dataUrl = '';
      try {
        dataUrl = canvas.toDataURL('image/webp', 0.68);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        }
      } catch {
        dataUrl = canvas.toDataURL('image/jpeg', 0.65);
      }

      return dataUrl;
    } catch (e) {
      console.error('Frame compression error:', e);
      return null;
    }
  }, [isCameraActive, dataSaverMode]);

  const stopAllAudio = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setSessionState('idle');
  };

  const startListening = () => {
    if (isMuted) return;
    if (synthRef.current) synthRef.current.cancel();
    setTranscript('');
    setInterimTranscript('');
    try {
      if (recognitionRef.current) {
        recognitionRef.current.lang = speechLang;
        recognitionRef.current.start();
      }
      setSessionState('listening');
    } catch (e) {
      setSessionState('listening');
    }
  };

  const speakText = (text: string, onEndCallback?: () => void) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    if (speechIntervalRef.current) {
      clearInterval(speechIntervalRef.current);
      speechIntervalRef.current = null;
    }

    const cleanSpokenText = cleanTextForSpeech(text);
    if (!cleanSpokenText) {
      setSessionState('idle');
      return;
    }

    setSpokenText(cleanSpokenText);
    setSpeechCharIndex(0);

    const utterance = new SpeechSynthesisUtterance(cleanSpokenText);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    // Granular boundary tracking
    const tracker = createSpeechBoundaryTracker(cleanSpokenText, utterance.rate);
    trackerRef.current = tracker;

    const voices = synthRef.current.getVoices();
    const selectedVoice = getOptimalVoice(voices, cleanSpokenText, speechLang);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Hardware speech boundary event with granular LaTeX token snapping
    utterance.onboundary = (event) => {
      if (trackerRef.current && typeof event.charIndex === 'number') {
        const calibratedIndex = trackerRef.current.onBoundary({
          charIndex: event.charIndex,
          charLength: (event as any).charLength,
          name: (event as any).name,
          elapsedTime: (event as any).elapsedTime,
        });
        setSpeechCharIndex(calibratedIndex);
      }
    };

    // Granular interpolated progression with token phonetic weight smoothing
    speechIntervalRef.current = setInterval(() => {
      if (trackerRef.current) {
        const interpolatedIndex = trackerRef.current.getInterpolatedCharIndex();
        setSpeechCharIndex((prev) => Math.max(prev, interpolatedIndex));
      }
    }, 60);

    const stopSpeech = () => {
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
        speechIntervalRef.current = null;
      }
      trackerRef.current = null;
      setSessionState('idle');
      setSpeechCharIndex(0);
      if (onEndCallback) {
        onEndCallback();
      } else {
        setTimeout(() => {
          startListening();
        }, 300);
      }
    };

    utterance.onend = stopSpeech;
    utterance.onerror = stopSpeech;

    currentUtteranceRef.current = utterance;
    synthRef.current.speak(utterance);
    setSessionState('speaking');
  };

  // On-Demand Snapshot Trigger: only runs when student speaks or clicks shutter
  const handleVoiceSubmit = async (userInput: string, forceSnapshot?: boolean) => {
    if (!userInput.trim()) return;

    setSessionState('thinking');
    
    // Capture single snapshot on demand if camera is active
    let currentFrame: string | null = null;
    if (isCameraActive || forceSnapshot) {
      currentFrame = captureOptimizedFrame();
      if (currentFrame) {
        setLastCapturedImage(currentFrame);
      }
    }

    const newHistory = [
      ...conversationHistory, 
      { role: 'user' as const, text: userInput, imagePreview: currentFrame || undefined }
    ];
    setConversationHistory(newHistory);

    try {
      const apiMessages = newHistory.map((m, i) => {
        const isLatest = i === newHistory.length - 1;
        const imgToSend = isLatest ? (currentFrame || lastCapturedImage) : undefined;

        return {
          role: m.role,
          content: m.text,
          images: imgToSend ? [{ 
            data: imgToSend, 
            mimeType: imgToSend.includes('webp') ? 'image/webp' : 'image/jpeg', 
            name: 'Snapshot' 
          }] : undefined
        };
      });

      // Route to fast, high-speed multimodal flash model
      const chosenModel = modelId || 'gemini-3.7-flash';

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          model: chosenModel,
          mode: 'live_voice_vision',
          memory: memory
        })
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Quota cooling down, retry in 5s');
        }
        throw new Error('Network error');
      }

      const data = await res.json();
      let reply = data.response || data.text || "Main dekh raha hoon. Is step par focus karo.";

      // Check if server indicated rate limiting or cooldown
      if (reply.includes('Quota cooling down') || reply.includes('Free tier')) {
        setMentorResponse("Quota cooling down, retry in 5s.");
        speakText("Quota cooling down, retry in 5s.", () => {
          setTimeout(startListening, 5000);
        });
        return;
      }

      // Check for spatial line pointer references
      const lineMatch = /line\s*(\d+)/i.exec(reply);
      if (lineMatch) {
        const lineNum = parseInt(lineMatch[1]);
        setLaserTarget({ x: 50, y: Math.min(85, 20 + lineNum * 15), label: `Line ${lineNum}` });
        setTimeout(() => setLaserTarget(null), 4000);
      }

      // Parse and extract mastery updates
      const newMasteryRegex = /\`\`\`json\s*(\{[\s\S]*?"system_sync"[\s\S]*?\})\s*\`\`\`/gi;
      let match;
      const updates: any[] = [];
      
      while ((match = newMasteryRegex.exec(reply)) !== null) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed.system_sync && parsed.system_sync.db_update) {
            updates.push(parsed.system_sync.db_update);
          }
        } catch (e) {
          console.error('Failed to parse mastery update in live voice', e);
        }
      }

      reply = reply.replace(/\`\`\`json\s*\{[\s\S]*?"system_sync"[\s\S]*?\}\s*\`\`\`/gi, '').trim();

      if (updates.length > 0 && onMasteryUpdate) {
        onMasteryUpdate(updates);
      }

      setMentorResponse(reply);
      setConversationHistory(prev => [...prev, { role: 'assistant', text: reply }]);
      
      // Also log to main chat
      onSendVoiceMessageToChat(userInput, reply);

      // Direct spoken response
      speakText(reply);
    } catch (err: any) {
      console.warn('Live Voice error:', err);
      const isQuota = err?.message?.includes('Quota') || err?.message?.includes('429');
      const errorMsg = isQuota
        ? "Quota cooling down, retry in 5s."
        : "Could you repeat that? Camera ko steady rakhiye aur boliye.";
      
      setMentorResponse(errorMsg);
      speakText(errorMsg, () => {
        setTimeout(startListening, isQuota ? 4000 : 500);
      });
    }
  };

  // Shutter Snapshot Trigger
  const handleShutterScan = () => {
    setShutterAnimation(true);
    setTimeout(() => setShutterAnimation(false), 300);
    handleVoiceSubmit("Please scan this problem, check every step, and guide me.", true);
  };

  const handleQuickPrompt = (prompt: string) => {
    setTranscript(prompt);
    handleVoiceSubmit(prompt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col items-center justify-between w-full max-w-2xl h-[92vh] max-h-[780px] rounded-3xl border border-white/15 bg-gradient-to-b from-[#14151B] via-[#0E0F14] to-[#08090C] shadow-[0_0_60px_rgba(74,222,128,0.18)] p-4 sm:p-6 overflow-hidden box-border">
        
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-[#4ADE80]/15 rounded-full blur-3xl" />

        {/* Absolute Close Button */}
        <button
          onClick={() => {
            stopAllAudio();
            stopCamera();
            onClose();
          }}
          className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/50 text-gray-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 transition-all cursor-pointer z-30 shadow-lg backdrop-blur-md"
          title="End Live Session"
        >
          <X size={18} />
        </button>

        {/* Header Bar */}
        <div className="relative z-10 flex w-full items-center justify-between pr-10 sm:pr-12 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/30 shadow-[0_0_15px_rgba(74,222,128,0.3)]">
              <Radio size={18} className={sessionState === 'listening' || sessionState === 'speaking' ? 'animate-pulse' : ''} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Live Voice & Vision</h2>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/40 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80] animate-ping" />
                  Realtime
                </span>
              </div>
              <p className="text-[10px] text-gray-400 hidden sm:block">On-demand smart snapshot · Free Tier Safe</p>
            </div>
          </div>

          {/* Right Header Options */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Language Selector */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5 text-[10px] sm:text-xs text-gray-300">
              <Globe size={12} className="text-[#4ADE80] ml-1.5 mr-1 hidden sm:block" />
              <button
                onClick={() => {
                  setSpeechLang('hi-IN');
                  if (sessionState === 'listening') {
                    stopAllAudio();
                    setTimeout(startListening, 300);
                  }
                }}
                className={`px-2 py-1 rounded-lg font-medium transition-all ${
                  speechLang === 'hi-IN'
                    ? 'bg-[#4ADE80] text-black font-bold shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Hinglish speech recognition"
              >
                Hinglish
              </button>
              <button
                onClick={() => {
                  setSpeechLang('en-US');
                  if (sessionState === 'listening') {
                    stopAllAudio();
                    setTimeout(startListening, 300);
                  }
                }}
                className={`px-2 py-1 rounded-lg font-medium transition-all ${
                  speechLang === 'en-US'
                    ? 'bg-[#4ADE80] text-black font-bold shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="English speech recognition"
              >
                English
              </button>
            </div>

            {/* Data Saver Mode Pill */}
            <button
              onClick={() => setDataSaverMode(prev => prev === 'saver-480p' ? 'high-720p' : 'saver-480p')}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[10px] font-semibold transition-all cursor-pointer ${
                dataSaverMode === 'saver-480p'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              }`}
              title="Toggle Data-Saver Mode"
            >
              <Wifi size={12} />
              <span>{dataSaverMode === 'saver-480p' ? '480p WebP' : '720p HD'}</span>
            </button>
          </div>
        </div>

        {/* Live Camera Viewfinder (Minimalist Google Lens / Gemini Live Aesthetic) */}
        {isCameraActive ? (
          <div className="relative z-10 w-full max-w-md my-2 h-44 sm:h-52 rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black shrink-0">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Shutter White Flash Animation */}
            {shutterAnimation && (
              <div className="absolute inset-0 bg-white/70 pointer-events-none transition-opacity duration-200" />
            )}

            {/* Minimalist Google Lens Corner Guides */}
            <div className="pointer-events-none absolute inset-4 border border-white/10 rounded-xl">
              <div className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 border-t-2 border-l-2 border-[#4ADE80] rounded-tl-sm" />
              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 border-t-2 border-r-2 border-[#4ADE80] rounded-tr-sm" />
              <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 border-b-2 border-l-2 border-[#4ADE80] rounded-bl-sm" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-b-2 border-r-2 border-[#4ADE80] rounded-br-sm" />
            </div>

            {/* Top Right: Camera Controls */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
              <button
                onClick={switchCameraFacing}
                className="p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-gray-300 hover:text-white transition-all cursor-pointer active:scale-90"
                title="Flip Camera"
              >
                <SwitchCamera size={13} />
              </button>
              <button
                onClick={toggleCamera}
                className="p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-gray-400 hover:text-red-400 hover:border-red-500/40 transition-all cursor-pointer active:scale-90"
                title="Turn Off Camera"
              >
                <CameraOff size={13} />
              </button>
            </div>

            {/* Bottom Shutter "Scan / Solve" Trigger Button */}
            <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center">
              <button
                onClick={handleShutterScan}
                disabled={sessionState === 'thinking'}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#4ADE80] hover:bg-[#34d399] text-black text-xs font-bold shadow-lg shadow-[#4ADE80]/30 active:scale-95 transition-all cursor-pointer backdrop-blur-md"
              >
                {sessionState === 'thinking' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Scan size={13} />
                )}
                <span>Scan / Solve</span>
              </button>
            </div>

            {/* Spatial Laser Target Pointer (When AI references specific lines/steps) */}
            {laserTarget && (
              <div 
                className="absolute transition-all duration-500 pointer-events-none -translate-x-1/2 -translate-y-1/2 flex items-center gap-1"
                style={{ left: `${laserTarget.x}%`, top: `${laserTarget.y}%` }}
              >
                <div className="relative flex h-6 w-6 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <Crosshair size={18} className="text-red-500 relative" />
                </div>
                {laserTarget.label && (
                  <span className="bg-red-900/90 border border-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                    {laserTarget.label}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          /* When Camera is Off: Option to Enable Live Vision */
          <div className="relative z-10 flex items-center justify-between w-full max-w-md my-2 px-4 py-2.5 rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center gap-2.5">
              <Camera size={18} className="text-[#4ADE80]" />
              <div>
                <span className="text-xs font-bold text-white block">Camera Vision</span>
                <span className="text-[10px] text-gray-400">Point at textbook formulas or handwritten workings</span>
              </div>
            </div>
            <button
              onClick={() => startCamera()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4ADE80] text-black font-bold text-xs hover:bg-[#34d399] transition-all cursor-pointer shadow-md shadow-[#4ADE80]/20"
            >
              <Camera size={13} />
              Turn On Camera
            </button>
          </div>
        )}

        {/* Center Orb & Waveform */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto w-full">
          {/* Animated Futuristic Orb */}
          <div className="relative flex items-center justify-center my-1 sm:my-2">
            {/* Outer Rings */}
            <div 
              className={`absolute h-36 w-36 sm:h-44 sm:w-44 rounded-full border border-[#4ADE80]/20 transition-transform duration-700 ${
                sessionState === 'listening' ? 'scale-110 animate-ping opacity-30' :
                sessionState === 'speaking' ? 'scale-125 border-emerald-400/40' :
                sessionState === 'thinking' ? 'animate-spin border-dashed' : 'opacity-20'
              }`}
            />
            <div 
              className={`absolute h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-gradient-to-tr from-[#4ADE80]/20 via-emerald-500/10 to-transparent blur-xl transition-all duration-500 ${
                sessionState === 'listening' ? 'scale-125 opacity-80' :
                sessionState === 'speaking' ? 'scale-150 opacity-90' :
                sessionState === 'thinking' ? 'scale-100 opacity-50' : 'opacity-30'
              }`}
            />

            {/* Central Glow Core */}
            <div 
              className={`relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#1E293B] to-[#0F172A] border-2 shadow-2xl transition-all duration-300 ${
                sessionState === 'listening' ? 'border-[#4ADE80] shadow-[0_0_30px_rgba(74,222,128,0.5)] scale-105' :
                sessionState === 'speaking' ? 'border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.6)] scale-110' :
                sessionState === 'thinking' ? 'border-yellow-400/80 shadow-[0_0_20px_rgba(250,204,21,0.3)]' :
                'border-white/20'
              }`}
            >
              {sessionState === 'listening' && <Mic size={28} className="text-[#4ADE80] animate-pulse" />}
              {sessionState === 'speaking' && <Volume2 size={28} className="text-emerald-300 animate-bounce" />}
              {sessionState === 'thinking' && <Loader2 size={28} className="text-yellow-400 animate-spin" />}
              {sessionState === 'idle' && <Sparkles size={28} className="text-gray-400" />}
            </div>
          </div>

          {/* Equalizer Frequency Bars */}
          <div className="flex items-center justify-center gap-1.5 h-6 w-full max-w-xs mt-1">
            {audioLevel.map((height, idx) => (
              <div
                key={idx}
                style={{ height: `${Math.max(4, height * 0.7)}px` }}
                className={`w-1 rounded-full transition-all duration-100 ${
                  sessionState === 'listening' ? 'bg-[#4ADE80]' :
                  sessionState === 'speaking' ? 'bg-emerald-400' :
                  sessionState === 'thinking' ? 'bg-yellow-400/70' :
                  'bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Status Label */}
          <div className="mt-1 text-center">
            <span className="text-xs font-semibold tracking-wide text-gray-200">
              {sessionState === 'listening' && (isCameraActive ? 'Listening... Speak or tap Scan / Solve' : 'Listening... (Speak in Hinglish or English)')}
              {sessionState === 'speaking' && 'Explaining intuitively... (Speak to interrupt)'}
              {sessionState === 'thinking' && 'Analyzing snapshot & solving...'}
              {sessionState === 'idle' && 'Ready. Tap mic to speak.'}
            </span>
          </div>

          {/* Subtitles / Response Box */}
          <div className="mt-2 w-full max-h-24 sm:max-h-28 overflow-y-auto rounded-2xl border border-white/10 bg-black/50 p-3 text-center backdrop-blur-md scrollbar-thin">
            {interimTranscript && (
              <p className="text-xs sm:text-sm text-gray-400 italic">
                "{interimTranscript}..."
              </p>
            )}
            {transcript && !interimTranscript && (
              <p className="text-xs sm:text-sm text-gray-300 font-medium">
                You: "{transcript}"
              </p>
            )}
            {mentorResponse && sessionState === 'speaking' && (
              <div className="text-xs sm:text-sm text-emerald-300 leading-relaxed text-left px-1 font-medium">
                <MarkdownRenderer
                  content={mentorResponse}
                  isSpeaking={sessionState === 'speaking'}
                  speechCharIndex={speechCharIndex}
                  spokenText={spokenText}
                />
              </div>
            )}
            {!transcript && !interimTranscript && (!mentorResponse || sessionState !== 'speaking') && (
              <p className="text-xs text-gray-400">
                💡 Tip: "Line 2 par sign check karo" or tap "Scan / Solve"
              </p>
            )}
          </div>

          {/* Quick Action Prompt Chips */}
          <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap max-w-md">
            <button
              onClick={() => handleQuickPrompt("Is step mein meri kya mistake hai?")}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-medium text-gray-300 border border-white/10 transition-colors cursor-pointer"
            >
              Spot My Mistake
            </button>
            <button
              onClick={() => handleQuickPrompt("Step-by-step formula lagao")}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-medium text-gray-300 border border-white/10 transition-colors cursor-pointer"
            >
              Next Step Formula
            </button>
            <button
              onClick={() => handleQuickPrompt("Ek easy real-life analogy do")}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-medium text-gray-300 border border-white/10 transition-colors cursor-pointer"
            >
              Intuitive Analogy
            </button>
          </div>
        </div>

        {/* Bottom Voice & Session Control Bar */}
        <div className="relative z-10 flex w-full items-center justify-between pt-3 border-t border-white/10 mt-auto">
          {/* Pause / Re-ask */}
          <button
            onClick={() => {
              if (sessionState === 'speaking') {
                synthRef.current?.cancel();
                setSessionState('idle');
              } else if (sessionState === 'listening') {
                recognitionRef.current?.stop();
                setSessionState('idle');
              } else {
                startListening();
              }
            }}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-xl border border-white/10 bg-white/5 w-[80px] sm:w-[120px] py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            {sessionState === 'speaking' ? (
              <>
                <VolumeX size={16} className="text-red-400" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <RotateCcw size={16} />
                <span>Re-ask</span>
              </>
            )}
          </button>

          {/* Big Mic Toggle Action */}
          <button
            onClick={() => {
              if (sessionState === 'listening') {
                recognitionRef.current?.stop();
                setSessionState('idle');
              } else {
                startListening();
              }
            }}
            className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${
              sessionState === 'listening'
                ? 'bg-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.5)]'
                : 'bg-[#4ADE80] text-black shadow-[0_0_25px_rgba(74,222,128,0.5)]'
            }`}
            title={sessionState === 'listening' ? 'Mute Mic' : 'Start Speaking'}
          >
            {sessionState === 'listening' ? <MicOff size={26} /> : <Mic size={26} />}
          </button>

          {/* Transfer to Main Chat */}
          <button
            onClick={() => {
              stopAllAudio();
              stopCamera();
              onClose();
            }}
            className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-xl border border-[#4ADE80]/30 bg-[#4ADE80]/15 w-[80px] sm:w-[120px] py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-semibold text-[#4ADE80] hover:bg-[#4ADE80]/25 transition-all cursor-pointer"
          >
            <MessageSquare size={16} />
            <span>In Chat</span>
          </button>
        </div>

      </div>
    </div>
  );
}
