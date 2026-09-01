import React, { useState, useRef, useEffect } from 'react';
import { 
  Radio, 
  X, 
  Sparkles, 
  Headphones, 
  BookOpen, 
  Flame, 
  ArrowRight,
  Clock,
  Languages,
  Download,
  Play,
  Pause,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Music,
  Mic,
  Share2,
  Volume2,
  VolumeX,
  FileAudio,
  Sliders
} from 'lucide-react';
import { 
  generateFullPodcastAndDownloadMp3, 
  triggerAudioDownload, 
  GeneratedPodcastAudioResult 
} from '../utils/audioExporter';
import {
  autoAudioEngine,
  AUTO_MOODS,
  detectStoryAtmosphere,
  MoodProfile
} from '../utils/autoAtmosphereEngine';

interface PodcastStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGeneratePodcast: (topicPrompt: string) => void;
}

const SAMPLE_PODCAST_TOPICS = [
  {
    title: 'पंचलाइट: गोधन, मुनरी और महतो टोली',
    subject: '12th UP Board / CBSE Hindi',
    duration: '8-10 Min',
    topic: 'पंचलाइट (फणीश्वरनाथ रेणु) - गोधन और महतो टोली की संपूर्ण कहानी',
    prompt: 'Role: You are Examix AI Master Storyteller & Audio Studio. Convert 12th Hindi literature masterpiece "पंचलाइट (फणीश्वरनाथ रेणु) - गोधन और महतो टोली की कहानी" into an immersive 8-12 minute audio podcast story in rich Devanagari Hindi with complete narrative flow, character dynamics (गोधन, मुनरी, गुलरी काकी, सरदार), setting, conflict, climax, [EPISODE_META], [AUDIO_SCRIPT_HINDI], and [MEMORY_ANCHOR_NOTES] with 📌 सारांश, 🎭 मुख्य पात्र, 📝 परीक्षा उपयोगी प्रश्न-उत्तर, 💡 मेमोरी ट्रिक।'
  },
  {
    title: 'कफन: घीसू और माधव का यथार्थ',
    subject: '12th Hindi (मुंशी प्रेमचंद)',
    duration: '8-10 Min',
    topic: 'कफन (मुंशी प्रेमचंद) - घीसू और माधव का मनोवैज्ञानिक द्वंद्व',
    prompt: 'Role: You are Examix AI Master Storyteller & Audio Studio. Convert "कफन (मुंशी प्रेमचंद) - घीसू और माधव की कहानी" into a profound 8-10 minute educational podcast story in Devanagari Hindi with [EPISODE_META], [AUDIO_SCRIPT_HINDI], and [MEMORY_ANCHOR_NOTES] featuring exam analysis, character psychology, and board Q&A.'
  },
  {
    title: '1857 Revolt: The Spark of Freedom',
    subject: 'Class 10/12 History',
    duration: '6-8 Min',
    topic: '1857 Revolt (Mangal Pandey, Jhansi Rani & Meerut uprising)',
    prompt: 'Convert History topic "1857 Revolt - The First War of Indian Independence" into an epic educational podcast story episode with [EPISODE_META], [AUDIO_SCRIPT_HINDI], and [MEMORY_ANCHOR_NOTES].'
  },
  {
    title: 'French Revolution: Fall of Bastille',
    subject: 'Class 10 CBSE History',
    duration: '5-8 Min',
    topic: 'French Revolution and Storming of the Bastille in 1789',
    prompt: 'Convert Class 10 History topic "French Revolution and Storming of the Bastille in 1789" into an immersive educational podcast story episode with [EPISODE_META], [AUDIO_SCRIPT_HINDI], and [MEMORY_ANCHOR_NOTES].'
  },
  {
    title: "Newton's 2nd Law & Rocket Propulsion",
    subject: 'Physics / Mechanics',
    duration: '5 Min',
    topic: "Newton's Second Law of Motion (F=ma) and Momentum",
    prompt: 'Convert Physics topic "Newton\'s Second Law of Motion (F=ma) and Momentum" into an exciting educational podcast story episode using everyday analogies, with [EPISODE_META], [AUDIO_SCRIPT_HINDI], and [MEMORY_ANCHOR_NOTES].'
  },
  {
    title: 'Photosynthesis: Sun-Light Kitchen',
    subject: 'Biology / Life Processes',
    duration: '5 Min',
    topic: 'Photosynthesis and Light Reaction vs Dark Reaction',
    prompt: 'Convert Biology chapter "Photosynthesis and Light Reaction vs Dark Reaction" into a thrilling educational podcast story episode with [EPISODE_META], [AUDIO_SCRIPT_HINDI], and [MEMORY_ANCHOR_NOTES].'
  }
];

const VOICE_OPTIONS = [
  { id: 'Kore', name: 'Kore (Balanced & Natural)', tone: 'Clear & Storytelling' },
  { id: 'Fenrir', name: 'Fenrir (Deep & Authoritative)', tone: 'Academic & Grounded' },
  { id: 'Puck', name: 'Puck (Energetic & Fast)', tone: 'Lively & Engaging' },
  { id: 'Zephyr', name: 'Zephyr (Smooth & Calm)', tone: 'Gentle & Conversational' }
];

export function PodcastStudioModal({ isOpen, onClose, onGeneratePodcast }: PodcastStudioModalProps) {
  const [topicInput, setTopicInput] = useState('');
  const [targetExam, setTargetExam] = useState('');
  const [targetLang, setTargetLang] = useState<'hinglish' | 'hindi' | 'english'>('hinglish');
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  
  // Auto Story SFX & Atmospheric Music State
  const [selectedMood, setSelectedMood] = useState<string>('auto_smart');
  const [bgmVolume, setBgmVolume] = useState<number>(0.28);
  const [isAuditioningBgm, setIsAuditioningBgm] = useState<boolean>(false);
  
  // MP3 Generation & Audio Preview States
  const [isGeneratingMp3, setIsGeneratingMp3] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationPercent, setGenerationPercent] = useState(0);
  const [generatedAudio, setGeneratedAudio] = useState<GeneratedPodcastAudioResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Audio Playback state inside modal
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      autoAudioEngine.stop();
    };
  }, []);

  if (!isOpen) return null;

  // Auto-detect current atmosphere for the topic
  const activeDetectedMood = selectedMood === 'auto_smart' 
    ? detectStoryAtmosphere(topicInput || 'पंचलाइट')
    : selectedMood;
  const currentMoodObj = AUTO_MOODS[activeDetectedMood] || AUTO_MOODS.village_nostalgia;

  // Handle Auditioning Auto Story BGM in Modal
  const handleToggleAuditionBgm = (moodId?: string) => {
    const target = moodId || selectedMood;
    if (isAuditioningBgm && selectedMood === target) {
      autoAudioEngine.stop();
      setIsAuditioningBgm(false);
    } else {
      setSelectedMood(target);
      const effectiveMood = target === 'auto_smart' ? detectStoryAtmosphere(topicInput || 'पंचलाइट') : target;
      autoAudioEngine.playMood(effectiveMood, bgmVolume);
      setIsAuditioningBgm(true);
    }
  };

  const handleBgmVolumeChange = (newVol: number) => {
    setBgmVolume(newVol);
    autoAudioEngine.setVolume(newVol);
  };

  // Direct MP3 Podcast Generation and Download
  const handleDownloadMp3 = async (customTopic?: string) => {
    const rawTopic = customTopic || topicInput;
    if (!rawTopic.trim() || isGeneratingMp3) return;

    setIsGeneratingMp3(true);
    setGenerationError(null);
    setGeneratedAudio(null);
    setGenerationPercent(15);
    setGenerationStep('Initiating Story Studio Engine...');

    // Stop bgm audition while generating
    if (isAuditioningBgm) {
      autoAudioEngine.stop();
      setIsAuditioningBgm(false);
    }

    try {
      const result = await generateFullPodcastAndDownloadMp3(rawTopic.trim(), {
        targetExam: targetExam.trim(),
        language: targetLang,
        voice: selectedVoice,
        onProgress: (status, percent) => {
          setGenerationStep(status);
          setGenerationPercent(percent);
        }
      });

      setGeneratedAudio(result);
      setGenerationStep('MP3 Downloaded to your device!');
      setGenerationPercent(100);

      // Setup audio preview element
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(result.audioUrl);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        setPreviewDuration(audio.duration || result.durationSeconds || 0);
      };

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPreviewCurrentTime(audio.currentTime);
          setPreviewProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setIsPlayingPreview(false);
        setPreviewProgress(0);
        setPreviewCurrentTime(0);
        autoAudioEngine.stop();
      };
    } catch (err: any) {
      console.error('MP3 Generation Error:', err);
      setGenerationError(err?.message || 'Failed to synthesize MP3 podcast audio. Please try again.');
    } finally {
      setIsGeneratingMp3(false);
    }
  };

  const handleTogglePreviewPlay = () => {
    if (!audioRef.current) return;
    if (isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
      autoAudioEngine.stop();
    } else {
      audioRef.current.play().catch(err => console.warn('Audio play failed:', err));
      setIsPlayingPreview(true);
      // Automatically trigger synchronized atmospheric BGM matching the story
      const effectiveMood = selectedMood === 'auto_smart' 
        ? detectStoryAtmosphere(generatedAudio?.episode?.title || topicInput)
        : selectedMood;
      autoAudioEngine.playMood(effectiveMood, bgmVolume);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || !previewDuration) return;
    const targetPercent = parseFloat(e.target.value);
    const targetTime = (targetPercent / 100) * previewDuration;
    audioRef.current.currentTime = targetTime;
    setPreviewCurrentTime(targetTime);
    setPreviewProgress(targetPercent);
  };

  const handleOpenInChat = () => {
    if (audioRef.current) audioRef.current.pause();
    autoAudioEngine.stop();
    
    let languageDirective = 'Hindi / Hinglish';
    if (targetLang === 'hindi') languageDirective = 'pure conversational Hindi';
    if (targetLang === 'english') languageDirective = 'immersive spoken English';

    const examSnippet = targetExam.trim() ? ` (Target Exam/Class: ${targetExam.trim()})` : '';
    const activeTopic = generatedAudio?.episode?.title || topicInput.trim();
    const moodName = currentMoodObj.name;
    
    const fullPrompt = `Convert the following topic/notes into an immersive educational podcast episode in ${languageDirective}${examSnippet} [Auto Story BGM & Soundscape: ${moodName}]:
"${activeTopic}"

Please format strictly with [EPISODE_META], [AUDIO_SCRIPT_HINDI], and [MEMORY_ANCHOR_NOTES] so the audio player and revision notes render automatically.`;

    onGeneratePodcast(fullPrompt);
    onClose();
  };

  const handleSubmitToChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim()) return;
    autoAudioEngine.stop();

    let languageDirective = 'Hindi / Hinglish';
    if (targetLang === 'hindi') languageDirective = 'pure conversational Hindi';
    if (targetLang === 'english') languageDirective = 'immersive spoken English';

    const examSnippet = targetExam.trim() ? ` (Target Exam/Class: ${targetExam.trim()})` : '';
    const moodName = currentMoodObj.name;
    
    const fullPrompt = `Convert the following topic/notes into an immersive educational podcast episode in ${languageDirective}${examSnippet} [Auto Story BGM & Soundscape: ${moodName}]:
"${topicInput.trim()}"

Please format strictly with [EPISODE_META], [AUDIO_SCRIPT_HINDI], and [MEMORY_ANCHOR_NOTES] so the audio player and revision notes render automatically.`;

    onGeneratePodcast(fullPrompt);
    onClose();
  };

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-emerald-500/30 bg-[#0A1713] shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
        {/* Ambient Glow */}
        <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-teal-500/15 blur-3xl" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1C382E] bg-[#0E241B]/90 px-5 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black shadow-[0_0_20px_rgba(74,222,128,0.4)]">
              <Radio size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Story Studio & Podcast</h3>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1">
                  <FileAudio size={10} /> MP3 Export
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Transform any topic or notes into high-yield educational audio stories & download as MP3
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (audioRef.current) audioRef.current.pause();
              onClose();
            }}
            className="rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[82vh] overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Active Generation Progress Indicator */}
          {isGeneratingMp3 && (
            <div className="rounded-2xl border border-emerald-500/40 bg-[#0E241B]/95 p-5 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Loader2 size={18} className="animate-spin text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Generating Studio Audio Podcast
                    </h4>
                    <p className="text-sm font-semibold text-white">
                      {generationStep || 'Processing storytelling narration...'}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {generationPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-black/40 border border-emerald-500/20">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${generationPercent}%` }}
                />
              </div>

              {/* Real-time audio waveform animation */}
              <div className="flex items-center justify-center gap-1 h-6">
                {[40, 75, 100, 60, 90, 45, 80, 100, 70, 50, 85, 65, 95, 40].map((h, i) => (
                  <div 
                    key={i}
                    className="w-1 rounded-full bg-emerald-400 animate-pulse"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${i * 0.08}s`
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Generated Audio Preview & Download Success Card */}
          {generatedAudio && !isGeneratingMp3 && (
            <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-[#0E241B] to-[#07140F] p-5 shadow-2xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-black shadow-[0_0_15px_rgba(74,222,128,0.5)]">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">
                      {generatedAudio.episode?.title || 'Educational Podcast Episode'}
                    </h4>
                    <p className="text-[11px] text-emerald-300 font-mono">
                      {generatedAudio.filename} • Ready for offline study
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => triggerAudioDownload(generatedAudio.audioBlob, generatedAudio.filename)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black shadow-md hover:bg-emerald-400 transition-colors cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download MP3</span>
                </button>
              </div>

              {/* In-Modal Audio Player Controls */}
              <div className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-2.5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTogglePreviewPlay}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-black shadow-[0_0_15px_rgba(74,222,128,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    {isPlayingPreview ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                  </button>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                      <span>{formatSeconds(previewCurrentTime)}</span>
                      <span>{formatSeconds(previewDuration || 180)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={previewProgress || 0}
                      onChange={handleSeek}
                      className="w-full h-1.5 bg-[#1C382E] rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                  </div>
                </div>

                {/* Ambient Sound Layer status during preview */}
                <div className="flex items-center justify-between text-[11px] px-2 py-1.5 bg-black/40 rounded-xl border border-white/5">
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <span className="text-sm">{currentMoodObj.emoji}</span>
                    <span className="font-semibold text-emerald-400">Auto Story BGM:</span>
                    <span>{currentMoodObj.name}</span>
                    <span className="text-gray-500 font-mono">({Math.round(bgmVolume * 100)}% vol)</span>
                  </div>
                  {isPlayingPreview && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> AUTO-SYNC ACTIVE
                    </span>
                  )}
                </div>

                {/* Podcast Key Insight snippet if available */}
                {generatedAudio.episode?.mnemonic && (
                  <div className="text-[11px] text-gray-300 bg-emerald-950/30 rounded-xl p-2.5 border border-emerald-500/20">
                    <span className="font-bold text-emerald-400">💡 Memory Anchor: </span>
                    <span>{generatedAudio.episode.mnemonic}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleOpenInChat}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2 text-xs font-semibold text-white transition-colors cursor-pointer border border-white/10"
                >
                  <Sparkles size={14} className="text-emerald-400" />
                  <span>Open Full Script & Karaoke in Chat</span>
                </button>
                <button
                  onClick={() => {
                    setGeneratedAudio(null);
                    setTopicInput('');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-black/40 px-3 py-2 text-xs font-medium text-gray-400 hover:text-white transition-colors cursor-pointer border border-white/5"
                >
                  <RotateCcw size={13} />
                  <span>Create Another</span>
                </button>
              </div>
            </div>
          )}

          {generationError && (
            <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-3.5 text-xs text-red-200 space-y-1 animate-fade-in">
              <span className="font-bold text-red-400">⚠️ Audio Generation Notice:</span>
              <p>{generationError}</p>
            </div>
          )}

          {/* Custom Input Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Enter Topic, Chapter or Paste Study Notes</span>
                <span className="text-[11px] text-emerald-400 lowercase font-mono">storytelling format</span>
              </label>
              <textarea
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g., Photosynthesis light & dark reactions, French Revolution, Newton's laws, or paste your notebook text..."
                rows={3}
                className="w-full rounded-2xl border border-[#1C382E] bg-[#07130F] p-3.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 resize-none"
                autoFocus
              />
            </div>

            {/* Language & Exam Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Target Exam / Class (Optional)
                </label>
                <input
                  type="text"
                  value={targetExam}
                  onChange={(e) => setTargetExam(e.target.value)}
                  placeholder="e.g. Class 10, JEE, NEET, UPSC"
                  className="w-full rounded-xl border border-[#1C382E] bg-[#07130F] px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Narration Language
                </label>
                <div className="flex rounded-xl border border-[#1C382E] bg-[#07130F] p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setTargetLang('hinglish')}
                    className={`flex-1 rounded-lg py-1 text-center font-medium transition-colors cursor-pointer ${
                      targetLang === 'hinglish' ? 'bg-emerald-500 text-black font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Hinglish
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetLang('hindi')}
                    className={`flex-1 rounded-lg py-1 text-center font-medium transition-colors cursor-pointer ${
                      targetLang === 'hindi' ? 'bg-emerald-500 text-black font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Hindi
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetLang('english')}
                    className={`flex-1 rounded-lg py-1 text-center font-medium transition-colors cursor-pointer ${
                      targetLang === 'english' ? 'bg-emerald-500 text-black font-bold' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>
            </div>

            {/* Voice Model Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Studio Voice Profile (Gemini Audio)</span>
                <span className="text-[10px] text-emerald-400 font-mono">24kHz Studio Quality</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {VOICE_OPTIONS.map((voice) => (
                  <button
                    key={voice.id}
                    type="button"
                    onClick={() => setSelectedVoice(voice.id)}
                    className={`rounded-xl border p-2 text-left transition-all cursor-pointer ${
                      selectedVoice === voice.id
                        ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-sm'
                        : 'border-[#1C382E] bg-[#07130F] text-gray-400 hover:border-gray-600 hover:text-gray-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-emerald-300">{voice.id}</div>
                    <div className="text-[10px] text-gray-400 truncate">{voice.tone}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Automatic Story Atmospheric Music & Cinematic SFX Engine */}
            <div className="rounded-2xl border border-[#1C382E] bg-[#07130F]/90 p-3.5 sm:p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Sparkles size={15} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Automatic Story-Sync Music & SFX</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span> AUTO-DETECTED
                      </span>
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      Story context ke hisaab se realistic background score aur cinematic sound effects automatically generate hote hain
                    </p>
                  </div>
                </div>

                {/* Audition & Volume Control */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => handleBgmVolumeChange(bgmVolume === 0 ? 0.28 : 0)}
                      className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                      title={bgmVolume === 0 ? "Unmute BGM" : "Mute BGM"}
                    >
                      {bgmVolume === 0 ? <VolumeX size={13} className="text-red-400" /> : <Volume2 size={13} className="text-emerald-400" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={bgmVolume}
                      onChange={(e) => handleBgmVolumeChange(parseFloat(e.target.value))}
                      className="w-14 sm:w-16 h-1 bg-[#1C382E] rounded-lg appearance-none cursor-pointer accent-emerald-400"
                      title={`BGM Volume: ${Math.round(bgmVolume * 100)}%`}
                    />
                    <span className="text-[10px] font-mono text-gray-400 w-6 text-right">
                      {Math.round(bgmVolume * 100)}%
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleAuditionBgm()}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                      isAuditioningBgm
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.4)]'
                        : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {isAuditioningBgm ? (
                      <>
                        <Pause size={12} />
                        <span>Stop Preview</span>
                      </>
                    ) : (
                      <>
                        <Play size={12} className="text-emerald-400" />
                        <span>Audition Atmosphere</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Detected Story Environment Highlight */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-black/40 to-black/40 border border-emerald-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{currentMoodObj.emoji}</span>
                  <div>
                    <div className="font-bold text-emerald-300 flex items-center gap-2">
                      <span>{currentMoodObj.hindiName}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                        {currentMoodObj.tag}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {currentMoodObj.description}
                    </p>
                  </div>
                </div>

                {isAuditioningBgm && (
                  <div className="flex items-center gap-0.5 h-3 bg-emerald-500/10 rounded-md px-1.5">
                    {[30, 80, 100, 60, 90, 40].map((h, i) => (
                      <span 
                        key={i} 
                        className="w-1 bg-emerald-400 rounded-full animate-pulse"
                        style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Mood Profiles / Atmospheric Themes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.values(AUTO_MOODS).map((profile) => {
                  const isSelected = selectedMood === profile.id;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => {
                        setSelectedMood(profile.id);
                        if (isAuditioningBgm) {
                          const eff = profile.id === 'auto_smart' ? detectStoryAtmosphere(topicInput || 'पंचलाइट') : profile.id;
                          autoAudioEngine.playMood(eff, bgmVolume);
                        }
                      }}
                      className={`relative flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all cursor-pointer group ${
                        isSelected
                          ? 'border-emerald-500 bg-gradient-to-b from-emerald-950/40 to-black/60 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                          : 'border-white/5 bg-black/30 hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-base">{profile.emoji}</span>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full border ${
                            isSelected 
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                              : 'bg-white/5 text-gray-400 border-white/10'
                          }`}>
                            {profile.tag}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                          {profile.name}
                        </div>
                        <p className="text-[10px] text-gray-400 leading-tight mt-0.5 line-clamp-2">
                          {profile.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dual Action Buttons: Direct MP3 Download + Interactive Studio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                disabled={!topicInput.trim() || isGeneratingMp3}
                onClick={() => handleDownloadMp3()}
                className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold shadow-lg transition-all cursor-pointer ${
                  topicInput.trim() && !isGeneratingMp3
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:scale-[1.01] active:scale-95 shadow-[0_0_20px_rgba(74,222,128,0.4)]'
                    : 'bg-[#12271F] text-gray-500 cursor-not-allowed opacity-50'
                }`}
              >
                {isGeneratingMp3 ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                <span>Download MP3 Podcast</span>
              </button>

              <button
                type="button"
                disabled={!topicInput.trim() || isGeneratingMp3}
                onClick={handleSubmitToChat}
                className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold border transition-all cursor-pointer ${
                  topicInput.trim() && !isGeneratingMp3
                    ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/40 hover:text-white'
                    : 'border-[#1C382E] bg-[#07130F] text-gray-600 cursor-not-allowed opacity-50'
                }`}
              >
                <Radio size={16} />
                <span>Create in Chat Studio</span>
              </button>
            </div>
          </div>

          {/* Quick Trending / High-Yield Sample Episodes */}
          <div className="space-y-2.5 pt-2 border-t border-[#1C382E]/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Flame size={13} className="text-amber-400" />
              <span>Or 1-Click High-Yield Episodes:</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SAMPLE_PODCAST_TOPICS.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-2xl border border-white/5 bg-white/5 p-3 text-left transition-all hover:border-emerald-500/40 hover:bg-emerald-950/20 group"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-emerald-400 font-mono mb-1">
                      <span>{item.subject}</span>
                      <span className="flex items-center gap-0.5 text-gray-400">
                        <Clock size={10} />
                        {item.duration}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-200 group-hover:text-white leading-snug">
                      {item.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                    <button
                      type="button"
                      disabled={isGeneratingMp3}
                      onClick={() => handleDownloadMp3(item.topic)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 hover:text-black py-1.5 text-[11px] font-bold text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
                      title="Download MP3 directly"
                    >
                      <Download size={12} />
                      <span>Download MP3</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGeneratingMp3}
                      onClick={() => {
                        onGeneratePodcast(item.prompt);
                        onClose();
                      }}
                      className="flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 p-1.5 text-gray-300 hover:text-white transition-colors cursor-pointer border border-white/5"
                      title="Open in Chat Studio"
                    >
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PodcastStudioModal;
