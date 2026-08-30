import { ImageAnnotationModal, Marker } from "./components/ImageAnnotationModal";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Camera,
  Layout,
  GraduationCap,
  Folder,
  BrainCircuit,
  MessageSquare,
  HardDrive,
  MonitorUp,
  Mic,
  Radio,
  Headphones,
  Plus,
  Send,
  ArrowUp,
  Loader2,
  FileText,
  Copy,
  Check,
  X,
  Image as ImageIcon,
  ZoomIn,
  Menu,
  Sparkles,
  ChevronDown,
  Trash2,
  Search,
  Volume2,
  VolumeX,
  RefreshCw,
  Cpu,
  Zap,
  BookOpen,
  ArrowRight,
  ArrowDown,
  Download,
  FileDown,
  Film,
  Share2,
  ScanText,
  Tag,
  Filter,
  Settings,
  Moon,
  User as UserIcon,
  LogIn,
  LogOut,
  Cloud
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import MarkdownRenderer, { normalizeDecorativeUnicode } from './components/MarkdownRenderer';
import { ImageLightboxModal } from './components/SvgDiagramCard';
import DrivePickerModal from './components/DrivePickerModal';
import VoiceMentorModal from './components/VoiceMentorModal';
import MasteryDashboard, { ConceptMastery } from './components/MasteryDashboard';
import PdfSlideModal, { UploadedNoteFile } from './components/PdfSlideModal';
import { ApiKeySettingsModal } from './components/ApiKeySettingsModal';
import HotwordControlCenterModal from './components/HotwordControlCenterModal';
import ScreenOffOledOverlay from './components/ScreenOffOledOverlay';
import {
  HotwordConfig,
  HotwordEngineSettings,
  DEFAULT_HOTWORD_SETTINGS,
  detectHotwordMatch,
  playWakeChime,
  isWithinStudySchedule
} from './utils/hotwordEngine';
import {
  PRESET_SUBJECTS,
  detectSubjectTag,
  getSubjectTagStyle,
  renderSubjectIcon,
  TagPickerDropdown
} from './components/SubjectTagSelector';
import { initAuth, getStoredProfile, StoredUserProfile, googleSignIn, logout, VAULT_FOLDER_NAME } from './lib/firebase';
import { exportChatToPDF } from './lib/pdfExport';
import { safeFetchJson, ChatApiResponse } from './lib/apiClient';
import { cleanTextForSpeech, getOptimalVoice, createSpeechBoundaryTracker, SpeechBoundaryTracker } from './utils/speechConverter';
import {
  loadLocalCognitiveGraph,
  saveLocalCognitiveGraph,
  syncToDrive,
  StudentCognitiveGraph,
  applyDiagnosticUpdate
} from './utils/neuroSyncEngine';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';

// Types for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface AIModel {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  icon: any;
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'auto',
    name: 'Gemini 3.7 Flash',
    badge: 'Auto Default',
    badgeColor: 'bg-[#4ADE80]/20 text-[#4ADE80] border-[#4ADE80]/40',
    description: 'Smart routing to Gemini 3.7 Flash with automatic fallback and rate-limit recovery.',
    icon: Sparkles
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    badge: 'Fast & Smart',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Next-gen reasoning, lightning-fast speed & multimodal vision.',
    icon: Sparkles
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    badge: 'Deep Reasoning',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description: 'Advanced STEM math derivations, multi-step problem solving & code.',
    icon: Cpu
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    badge: 'Ultra Fast',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    description: 'Instant doubt resolution, formula lookup & micro-quizzing.',
    icon: Zap
  },
  {
    id: 'gemini-3.1-flash-image',
    name: 'Nano Banana (Visual AI)',
    badge: 'Diagram Gen',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    description: 'Creates state-of-the-art educational visual diagrams & illustrations.',
    icon: ImageIcon
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash',
    badge: 'High Throughput',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Solid balanced performance for general revision & notes.',
    icon: BrainCircuit
  },
  {
    id: 'gpt-4o',
    name: 'ChatGPT 4o',
    badge: 'OpenAI',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    description: 'High-speed reasoning and deep thinking from OpenAI.',
    icon: Sparkles
  }
];

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  isImage: boolean;
  dataUrl: string;
  textContent?: string;
  markers?: Array<{x: number, y: number, label: string}>;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  isHidden?: boolean;
  modelUsed?: string;
  images?: Array<{
    data: string;
    mimeType: string;
    name?: string;
    markers?: Array<{x: number, y: number, label: string}>;
  }>;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  modelId: string;
  tag?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Helper to extract next steps from message content
function extractNextSteps(content: string): string[] {
  if (!content) return [];
  const normalized = normalizeDecorativeUnicode(content);
  const match = /\[NEXT_STEPS\]([\s\S]*?)\[\/NEXT_STEPS\]/i.exec(normalized);
  if (match) {
    const lines = match[1]
      .split('\n')
      .map(line => normalizeDecorativeUnicode(line.replace(/^[-*•\d.]+\s*/, '').replace(/^\[|\]$/g, '').trim()))
      .filter(line => line.length > 0 && !line.startsWith('[') && line.length < 80);
    if (lines.length > 0) return lines.slice(0, 3);
  }

  // Fallback pattern: [Practice 1 Tough Trap] [Derive Step 2 in Vector Form]
  const bracketMatches = [...normalized.matchAll(/\[([^[\]]{4,80})\]/g)]
    .map(m => normalizeDecorativeUnicode(m[1].trim()))
    .filter(
      p =>
        !p.toUpperCase().startsWith('VIDEO_SCENE') &&
        !p.toUpperCase().startsWith('WHITEBOARD') &&
        !p.toUpperCase().startsWith('NEXT_STEPS') &&
        !p.toUpperCase().startsWith('/NEXT_STEPS') &&
        !p.startsWith('http') &&
        !p.includes('://')
    );

  return bracketMatches.slice(0, 3);
}

// Full-screen Assistant Message with Gemini UI Styling
const AssistantMessage = ({
  msg,
  index,
  onRegenerate,
  onPromptClick,
  isLastMessage
}: {
  msg: ChatMessage;
  index: number;
  onRegenerate?: () => void;
  onPromptClick?: (prompt: string) => void;
  isLastMessage?: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechCharIndex, setSpeechCharIndex] = useState<number>(0);
  const [spokenText, setSpokenText] = useState<string>('');
  const speechIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackerRef = useRef<SpeechBoundaryTracker | null>(null);

  const nextSteps = extractNextSteps(msg.content);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = msg.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (speechIntervalRef.current) {
      clearInterval(speechIntervalRef.current);
      speechIntervalRef.current = null;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setSpeechCharIndex(0);
      trackerRef.current = null;
      return;
    }

    window.speechSynthesis.cancel();

    // Clean text thoroughly for natural mentor speech (convert LaTeX formulas into spoken phonetics, strip SVG/Markdown)
    const cleanText = cleanTextForSpeech(msg.content);
    if (!cleanText) return;

    setSpokenText(cleanText);
    setSpeechCharIndex(0);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Initialize granular boundary tracker
    const tracker = createSpeechBoundaryTracker(cleanText, utterance.rate);
    trackerRef.current = tracker;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = getOptimalVoice(voices, cleanText);

    if (naturalVoice) {
      utterance.voice = naturalVoice;
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
      setIsSpeaking(false);
      setSpeechCharIndex(0);
    };

    utterance.onend = stopSpeech;
    utterance.onerror = stopSpeech;

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div className="group w-full py-4 transition-colors">
      <div className="flex items-start max-w-full">
        {/* Content Body */}
        <div className="min-w-0 flex-1">
          <MarkdownRenderer
            content={msg.content}
            isSpeaking={isSpeaking}
            speechCharIndex={speechCharIndex}
            spokenText={spokenText}
          />

          {/* Dynamic Contextual Next Step Pills */}
          {nextSteps.length > 0 && onPromptClick && (
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-1 animate-fade-in">
              <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1 mr-1">
                <Sparkles size={12} className="text-[#4ADE80]" />
                Next steps:
              </span>
              {nextSteps.map((step, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => onPromptClick(step)}
                  className="flex items-center gap-1.5 rounded-full border border-[#1C382E] bg-[#10221B] hover:bg-[#152E24] hover:border-[#4ADE80]/50 px-3.5 py-1.5 text-xs font-medium text-gray-200 hover:text-white transition-all active:scale-95 shadow-xs cursor-pointer group/pill"
                >
                  <span>{step}</span>
                  <ArrowUp size={12} className="rotate-45 text-gray-500 group-hover/pill:text-[#4ADE80] transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* Action Toolbar */}
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 text-gray-400">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-[#1C382E] bg-[#0D1C17] px-2.5 py-1.5 text-xs font-medium text-gray-300 transition-all hover:border-[#4ADE80]/40 hover:bg-[#12271F] hover:text-[#4ADE80] active:scale-95 cursor-pointer"
              title="Copy to Clipboard"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-[#4ADE80]" />
                  <span className="text-[#4ADE80] text-[11px] font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </button>

            {/* Prominent Listen / AI Talk Button */}
            <button
              id={'listen-ai-response-' + index}
              onClick={toggleSpeech}
              className={'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 cursor-pointer ' + (
                isSpeaking
                  ? 'border-[#4ADE80] bg-[#4ADE80]/20 text-[#4ADE80] shadow-[0_0_12px_rgba(74,222,128,0.3)]'
                  : 'border-[#4ADE80]/30 bg-[#0D1C17] text-gray-200 hover:border-[#4ADE80]/60 hover:bg-[#12271F] hover:text-[#4ADE80]'
              )}
              title={isSpeaking ? 'Stop speaking' : 'Listen to AI explanation aloud'}
            >
              {isSpeaking ? (
                <>
                  <VolumeX size={14} className="text-[#4ADE80] animate-pulse" />
                  <span className="text-[11px] font-semibold text-[#4ADE80]">Stop Audio</span>
                  {/* Mini Sound Equalizer animation */}
                  <span className="flex items-center gap-0.5 ml-1">
                    <span className="h-2 w-0.5 bg-[#4ADE80] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-3 w-0.5 bg-[#4ADE80] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-0.5 bg-[#4ADE80] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </>
              ) : (
                <>
                  <Volume2 size={14} className="text-[#4ADE80]" />
                  <span className="text-[11px] font-semibold">Listen</span>
                </>
              )}
            </button>

            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1.5 rounded-lg border border-[#1C382E] bg-[#0D1C17] px-2.5 py-1.5 text-xs font-medium text-gray-300 transition-all hover:border-[#4ADE80]/30 hover:bg-[#12271F] hover:text-white active:scale-95 cursor-pointer"
                title="Regenerate response"
              >
                <RefreshCw size={13} />
                <span className="text-[11px]">Retry</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// User Message Bubble
const UserMessage = ({
  msg,
  onImageClick
}: {
  msg: ChatMessage;
  onImageClick: (url: string) => void;
}) => {
  const hasImages = msg.images && msg.images.length > 0;

  return (
    <div className="w-full flex flex-col items-end py-3 group">
      {hasImages && (
        <div className="flex flex-wrap justify-end gap-2.5 mb-2.5 max-w-[90%] sm:max-w-[75%]">
          {msg.images!.map((img, i) => {
            const isPdf = img.mimeType === 'application/pdf' || img.name?.toLowerCase().endsWith('.pdf') || img.data?.startsWith('data:application/pdf');
            return (
              <div
                key={i}
                onClick={() => onImageClick(img.data)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/15 bg-black/40 shadow-lg transition-all hover:border-[#4ADE80]/70 hover:scale-105"
              >
                {isPdf ? (
                  <div className="flex h-32 w-32 sm:h-36 sm:w-36 flex-col items-center justify-center rounded-2xl border border-red-500/30 bg-gradient-to-b from-[#221316] to-[#121214] p-3 text-center shadow-lg">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-red-400 mb-2 border border-red-500/30 font-bold text-xs">
                      PDF
                    </div>
                    <span className="truncate w-full text-xs font-semibold text-gray-200">
                      {img.name || 'School Notes.pdf'}
                    </span>
                    <span className="text-[10px] text-emerald-400 mt-1 font-medium">
                      Handwritten OCR
                    </span>
                  </div>
                ) : (
                  <img
                    src={img.data}
                    alt={img.name || `Attachment ${i + 1}`}
                    className="h-32 w-32 sm:h-40 sm:w-40 object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
                {img.markers && img.markers.map((marker, idx) => (
                  <div 
                    key={idx}
                    className="absolute w-4 h-4 sm:w-5 sm:h-5 -ml-2 -mt-2 sm:-ml-2.5 sm:-mt-2.5 bg-green-500 rounded-full border border-white flex items-center justify-center text-[8px] sm:text-[9px] font-bold text-white shadow-md pointer-events-none"
                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                  >
                    {marker.label}
                  </div>
                ))}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn size={22} className="text-white drop-shadow" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {msg.content && (
        <div className="flex items-center gap-3 max-w-[90%] sm:max-w-[75%] justify-end">
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button 
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(msg.content);
                } catch {
                  const textarea = document.createElement('textarea');
                  textarea.value = msg.content;
                  document.body.appendChild(textarea);
                  textarea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textarea);
                }
              }} 
              className="text-gray-400 hover:text-white transition-colors" 
              title="Copy text"
            >
              <Copy size={14} />
            </button>
          </div>
          <div className="text-gray-200 text-[15px] sm:text-base leading-relaxed text-right bg-[#10221B] border border-[#1C382E] px-5 py-3 rounded-3xl rounded-tr-sm shadow-md">
            {msg.content}
          </div>
        </div>
      )}
    </div>
  );
};

const DEFAULT_CONCEPT_MEMORY: ConceptMastery[] = [
  {
    concept: 'Quantization of Charge (q = ne)',
    topic: 'Electrostatics',
    status: 'Needs Revision',
    lastUpdated: Date.now() - 16 * 86400000,
    last_tested_date: new Date(Date.now() - 16 * 86400000).toISOString(),
    streak_count: 0,
    retention_level: 'DECAYED',
    lastError: 'Forgot that n must be an integer (e = 1.6 x 10^-19 C)',
    confidenceScore: 0.6
  },
  {
    concept: 'Dielectric Constant (K or ε_r)',
    topic: 'Electrostatics',
    status: 'Needs Revision',
    lastUpdated: Date.now() - 5 * 86400000,
    last_tested_date: new Date(Date.now() - 5 * 86400000).toISOString(),
    streak_count: 1,
    retention_level: 'WARM',
    lastError: 'Forgot that electrostatic force in medium decreases by factor K: F_m = F_0 / K',
    confidenceScore: 0.55
  },
  {
    concept: "Coulomb's Law Vector Form",
    topic: 'Electrostatics',
    status: 'Needs Revision',
    lastUpdated: Date.now() - 2 * 86400000,
    last_tested_date: new Date(Date.now() - 2 * 86400000).toISOString(),
    streak_count: 1,
    retention_level: 'FRESH',
    lastError: 'Inverted sign convention of unit vector r_hat direction',
    confidenceScore: 0.65
  },
  {
    concept: 'Electric Field of a Point Charge',
    topic: 'Electrostatics',
    status: 'Mastered',
    lastUpdated: Date.now() - 1 * 86400000,
    last_tested_date: new Date(Date.now() - 1 * 86400000).toISOString(),
    streak_count: 3,
    retention_level: 'PERMANENT_LOCK',
    lastError: null,
    confidenceScore: 1.0
  }
];

export default function App() {
  useEffect(() => {
    initAuth();
  }, []);

  // Chat state & sessions
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('examix_saved_chats_v2');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load saved chats', e);
    }
    return [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    return localStorage.getItem('examix_active_chat_id') || null;
  });

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const saved = localStorage.getItem('examix_selected_model');
    if (!saved || saved === 'image-generation-model') return 'auto';
    return saved;
  });

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('All');
  const [activeTagMenuSessionId, setActiveTagMenuSessionId] = useState<string | null>(null);
  const [isHeaderTagMenuOpen, setIsHeaderTagMenuOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [canvasText, setCanvasText] = useState('');
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeMode, setActiveMode] = useState<string>('Standard Mode');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [waveformLevels, setWaveformLevels] = useState<number[]>([35, 70, 95, 60, 40]);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);
  const [annotatingImage, setAnnotatingImage] = useState<Attachment | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showPdfSlideModal, setShowPdfSlideModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showMasteryModal, setShowMasteryModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'account' | 'api_keys' | 'academic' | 'preferences' | 'hotwords'>('account');
  const [currentUserProfile, setCurrentUserProfile] = useState<StoredUserProfile | null>(() => getStoredProfile());
  const [showHotwordModal, setShowHotwordModal] = useState(false);
  const [showOledScreenOffMode, setShowOledScreenOffMode] = useState(false);
  const [activeWakeHotword, setActiveWakeHotword] = useState<string | null>(null);

  // Synchronize Google Auth & Profile state
  useEffect(() => {
    const unsubscribe = initAuth((user) => {
      if (user) {
        setCurrentUserProfile({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL
        });
      } else {
        const stored = getStoredProfile();
        setCurrentUserProfile(stored);
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const [hotwordSettings, setHotwordSettings] = useState<HotwordEngineSettings>(() => {
    try {
      const saved = localStorage.getItem('examix_hotword_settings_v1');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading hotword settings', e);
    }
    return DEFAULT_HOTWORD_SETTINGS;
  });

  // Save hotword settings on change
  const handleUpdateHotwordSettings = (newSettings: HotwordEngineSettings) => {
    setHotwordSettings(newSettings);
    try {
      localStorage.setItem('examix_hotword_settings_v1', JSON.stringify(newSettings));
    } catch (e) {}
  };

  // Background / Screen-Off Multi-Hotword Wake Listener
  useEffect(() => {
    if (!hotwordSettings.enabled) return;

    let recognition: any = null;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    const startBackgroundListening = () => {
      try {
        if (!isWithinStudySchedule(hotwordSettings)) return;

        // If inverted power mode is enabled and screen is active, pause listening to preserve battery
        if (hotwordSettings.invertedPowerMode && !document.hidden && !showOledScreenOffMode && !showVoiceModal) {
          return;
        }

        if (recognition) {
          try { recognition.stop(); } catch (e) {}
        }

        recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN';

        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            const match = detectHotwordMatch(transcript, hotwordSettings.hotwords);
            if (match.triggered && match.hotword) {
              playWakeChime('wake');
              setActiveWakeHotword(match.hotword.keyword);
              showToast(`🎙️ Wake-Up Hotword: "${match.hotword.keyword}"`);

              if (document.hidden || hotwordSettings.invertedPowerMode) {
                setShowOledScreenOffMode(true);
              } else {
                setShowVoiceModal(true);
              }
              break;
            }
          }
        };

        recognition.onend = () => {
          if (hotwordSettings.enabled && isWithinStudySchedule(hotwordSettings)) {
            try { recognition.start(); } catch (e) {}
          }
        };

        recognition.start();
      } catch (err) {
        console.warn('Background hotword recognition error:', err);
      }
    };

    startBackgroundListening();

    const handleVisibility = () => {
      if (hotwordSettings.invertedPowerMode) {
        if (document.hidden) {
          startBackgroundListening();
        } else if (!showOledScreenOffMode && !showVoiceModal) {
          try { if (recognition) recognition.stop(); } catch (e) {}
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (recognition) {
        try { recognition.stop(); } catch (e) {}
      }
    };
  }, [hotwordSettings, showOledScreenOffMode, showVoiceModal]);

  // Screen-off voice query processor with automated Spaced Repetition score persistence
  const handleProcessScreenOffVoiceQuery = async (query: string, hotword?: HotwordConfig): Promise<string> => {
    try {
      const res = await safeFetchJson<ChatApiResponse>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: query }],
          mode: 'screen_off_voice',
          memory: conceptMemory,
          model: selectedModel
        })
      });

      const reply = res.response || 'Main aapki baat sun raha hoon. Kripya apna prashn dobara boliye.';

      // Automatically sync oral checks / decay updates into concept memory and student profile
      if (res.system_sync && Array.isArray(res.system_sync)) {
        setConceptMemory(prev => {
          let updated = [...prev];
          res.system_sync!.forEach((u: any) => {
            const conceptName = u.concept_name || u.concept;
            if (!conceptName) return;
            const status = u.status === 'CRITICAL_WEAKNESS' ? 'Critical Weakness' : (u.status === 'MASTERED' ? 'Mastered' : 'Needs Revision');
            const existing = updated.find(m => m.concept.toLowerCase() === conceptName.toLowerCase());
            if (existing) {
              existing.status = status;
              existing.lastUpdated = Date.now();
              existing.last_tested_date = new Date().toISOString();
              if (status === 'Mastered') {
                existing.lastError = null;
                existing.confidenceScore = 1.0;
                const nextStreak = (existing.streak_count || 0) + 1;
                existing.streak_count = nextStreak;
                existing.retention_level = nextStreak >= 3 ? 'PERMANENT_LOCK' : 'FRESH';
              } else {
                existing.lastError = u.last_error || existing.lastError;
                existing.streak_count = 0;
                existing.retention_level = 'DECAYED';
              }
            } else {
              const nextStreak = status === 'Mastered' ? 1 : 0;
              updated.push({
                concept: conceptName,
                topic: u.topic || 'General',
                status,
                lastUpdated: Date.now(),
                last_tested_date: new Date().toISOString(),
                streak_count: nextStreak,
                retention_level: status === 'Mastered' ? 'FRESH' : 'DECAYED',
                lastError: status === 'Mastered' ? null : (u.last_error || null),
                confidenceScore: status === 'Mastered' ? 1.0 : 0.6
              });
            }
          });
          try {
            localStorage.setItem('examix_concept_memory', JSON.stringify(updated));
            localStorage.setItem('student_profile.json', JSON.stringify({
              updatedAt: new Date().toISOString(),
              conceptMemory: updated
            }));
          } catch (e) {}
          return updated;
        });
      }

      return reply;
    } catch (err: any) {
      console.error('Screen-off voice query error:', err);
      return 'Voice connection me thoda issue aaya. Ek baar phir boliye.';
    }
  };
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [conceptMemory, setConceptMemory] = useState<ConceptMastery[]>(() => {
    try {
      const saved = localStorage.getItem('examix_concept_memory');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading concept memory', e);
    }
    return DEFAULT_CONCEPT_MEMORY;
  });
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [showBottomGlow, setShowBottomGlow] = useState(false);
  const [hasNewResponseBelow, setHasNewResponseBelow] = useState(false);
  const mainScrollRef = useRef<HTMLElement>(null);
  const isUserScrolledUpRef = useRef(false);
  const userInitiatedSendRef = useRef(false);
  const prevMessagesLengthRef = useRef(0);
  const glowTimeoutRef = useRef<any>(null);

  const triggerBottomGlow = (duration = 2400) => {
    if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
    setShowBottomGlow(true);
    glowTimeoutRef.current = setTimeout(() => {
      setShowBottomGlow(false);
    }, duration);
  };

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const target = e.currentTarget;
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    const isUp = distanceFromBottom > 100;
    setIsUserScrolledUp(isUp);
    isUserScrolledUpRef.current = isUp;
    if (!isUp) {
      setHasNewResponseBelow(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    setIsUserScrolledUp(false);
    isUserScrolledUpRef.current = false;
    setHasNewResponseBelow(false);
  };

  const handleExportChat = async (customSubject?: string, customTitle?: string) => {
    if (!messages || messages.length === 0) {
      showToast('No messages in this chat to export yet.');
      return;
    }
    setIsExportingPDF(true);
    showToast('Generating Study Notes PDF...');
    try {
      await exportChatToPDF(currentSession, messages, customSubject, customTitle);
      showToast('Study Notes PDF downloaded successfully!');
      setShowPdfSlideModal(false);
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      showToast('Failed to export PDF. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleImportAndSendNotes = async ({
    files,
    userPrompt,
    analysisPreset,
    launchVoiceTutor
  }: {
    files: UploadedNoteFile[];
    userPrompt: string;
    analysisPreset: string;
    launchVoiceTutor?: boolean;
  }) => {
    const newAttachments: Attachment[] = files.map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      type: f.type,
      isImage: !f.isPdf,
      dataUrl: f.dataUrl
    }));

    showToast(`Sending ${files.length > 0 ? `${files.length} document(s)` : 'notes'} to Examix AI...`);
    await handleSend(userPrompt, false, newAttachments);

    if (launchVoiceTutor) {
      setTimeout(() => {
        setShowVoiceModal(true);
      }, 900);
    }
  };

  const handleShareSession = () => {
    if (!messages || messages.length === 0) {
      showToast('No messages in this chat to share yet.');
      return;
    }
    const sessionId = currentSessionId || Math.random().toString(36).substring(2, 9);
    const shareLink = `${window.location.origin}/share/${sessionId}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      showToast('Share link copied to clipboard!');
    }).catch(() => {
      showToast('Failed to copy link.');
    });
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Active messages derived from current session
  const currentSession = sessions.find((s) => s.id === currentSessionId) || null;
  const messages = currentSession ? currentSession.messages : [];

  // Active Model definition
  const currentModelDef = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('examix_saved_chats_v2', JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save sessions to localStorage', e);
    }
  }, [sessions]);

  // Save active chat ID to localStorage
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('examix_active_chat_id', currentSessionId);
    } else {
      localStorage.removeItem('examix_active_chat_id');
    }
  }, [currentSessionId]);

  // Save selected model
  useEffect(() => {
    localStorage.setItem('examix_selected_model', selectedModel);
  }, [selectedModel]);

  // Save concept memory
  useEffect(() => {
    localStorage.setItem('examix_concept_memory', JSON.stringify(conceptMemory));
  }, [conceptMemory]);

  // Close model dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const createNewChat = () => {
    setCurrentSessionId(null);
    setPendingAttachments([]);
    setInputValue('');
    setActiveMode('Standard Mode');
    setIsSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
    }
    showToast('Chat removed.');
  };

  const updateSessionTag = (sessionId: string, newTag: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            tag: newTag,
            updatedAt: Date.now()
          };
        }
        return s;
      })
    );
    setActiveTagMenuSessionId(null);
    setIsHeaderTagMenuOpen(false);
    showToast(`Tagged as ${newTag}`);
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      const el = document.getElementById('multi-file-upload-input') as HTMLInputElement | null;
      el?.click();
    }
  };

  // Clipboard Paste support for screenshots/images
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const filesToProcess: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) filesToProcess.push(blob);
      }
    }

    if (filesToProcess.length > 0) {
      const dt = new DataTransfer();
      filesToProcess.forEach((f) => dt.items.add(f));
      handleFilesSelected(dt.files);
      showToast(`Attached ${filesToProcess.length} image(s) from clipboard.`);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
      showToast(`Added ${e.dataTransfer.files.length} file(s).`);
    }
  };

  // Smart Scroll Management: Preserve user reading position & display ambient bottom glow
  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    const lastMessage = messages[messages.length - 1];
    prevMessagesLengthRef.current = messages.length;

    // If user just sent a message, auto-scroll down to see question and reasoning indicator
    if (userInitiatedSendRef.current) {
      userInitiatedSendRef.current = false;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return;
    }

    if (isNewMessage && lastMessage?.role === 'assistant') {
      // Trigger the gentle bottom light glow (halki si roshni)
      triggerBottomGlow(2500);

      // If user is currently scrolled up reading earlier content, DO NOT force scroll down!
      if (isUserScrolledUpRef.current) {
        setHasNewResponseBelow(true);
      } else {
        // If already near bottom, smoothly scroll to reveal the complete answer
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    } else if (isSubmitting && !isUserScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isSubmitting]);

  // Web Speech API initialization
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Dynamic Animated Waveform simulation for real-time microphone feedback
  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        setWaveformLevels([
          Math.floor(Math.random() * 55) + 25,
          Math.floor(Math.random() * 80) + 30,
          Math.floor(Math.random() * 95) + 40,
          Math.floor(Math.random() * 75) + 30,
          Math.floor(Math.random() * 50) + 20,
        ]);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isListening]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      showToast('Voice input is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition error:', err);
      }
    }
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    fileArray.forEach((file) => {
      if (file.size > 25 * 1024 * 1024) {
        showToast(`File ${file.name} is too large. Please keep files under 25MB.`);
        return;
      }

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/');
      
      if (isPdf) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const newAttachment: Attachment = {
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            size: file.size,
            type: 'application/pdf',
            isImage: false,
            dataUrl
          };
          setPendingAttachments((prev) => [...prev, newAttachment]);
        };
        reader.readAsDataURL(file);
      } else if (isImage) {
        // Compress image using canvas
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round((width * MAX_HEIGHT) / height);
                height = MAX_HEIGHT;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Convert to JPEG with 0.8 quality
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            const newAttachment: Attachment = {
              id: Math.random().toString(36).substring(2, 9),
              name: file.name,
              size: Math.round((dataUrl.length * 3) / 4), // Approximate size
              type: 'image/jpeg',
              isImage: true,
              dataUrl
            };
            setPendingAttachments((prev) => [...prev, newAttachment]);
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const newAttachment: Attachment = {
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            isImage: false,
            dataUrl
          };
          setPendingAttachments((prev) => [...prev, newAttachment]);
        };
        reader.readAsDataURL(file);
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const addSystemMessage = (messageText: string, modelName: string = 'System') => {
    const sysMessage: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'assistant',
      content: messageText,
      modelUsed: modelName
    };

    let targetSessionId = currentSessionId;
    let updatedSessionList = [...sessions];

    if (!targetSessionId) {
      const newId = 'chat_' + Date.now();
      const detectedTag = detectSubjectTag(messageText);
      const newSession: ChatSession = {
        id: newId,
        title: 'New Session',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [sysMessage],
        modelId: selectedModel,
        tag: detectedTag
      };
      updatedSessionList = [newSession, ...updatedSessionList];
      setSessions(updatedSessionList);
      setCurrentSessionId(newId);
    } else {
      updatedSessionList = updatedSessionList.map((s) => {
        if (s.id === targetSessionId) {
          return {
            ...s,
            updatedAt: Date.now(),
            messages: [...s.messages, sysMessage]
          };
        }
        return s;
      });
      setSessions(updatedSessionList);
    }
  };

  const removeAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const handleSend = async (
    customPrompt?: string,
    isHidden: boolean = false,
    overrideAttachments?: Attachment[]
  ) => {
    const rawText = (customPrompt ?? inputValue).trim();
    const effectiveAttachments = overrideAttachments || pendingAttachments;
    const hasAttachments = effectiveAttachments.length > 0;

    if (!rawText && !hasAttachments) return;

    let promptText =
      rawText ||
      (hasAttachments
        ? 'Please analyze these attached study notes, formulas, or questions in detail and explain step-by-step.'
        : '');

    const textAttachments = effectiveAttachments.filter(a => a.textContent);
    if (textAttachments.length > 0) {
      promptText += '\n\n' + textAttachments.map(a => `--- [Attached File: ${a.name}] ---\n${a.textContent}\n----------------`).join('\n\n');
    }

    const mediaAttachments = effectiveAttachments.filter(
      (att) => (att.isImage || att.type === 'application/pdf' || att.name.toLowerCase().endsWith('.pdf')) && att.dataUrl
    );
    
    // Add textual descriptions of markers so the AI knows exactly where the user clicked
    const markerDescriptions = mediaAttachments.filter(a => a.markers && a.markers.length > 0)
      .map(a => {
        const marks = a.markers!.map(m => `${m.label} at (X:${m.x.toFixed(1)}%, Y:${m.y.toFixed(1)}%)`).join(', ');
        return `Annotations on image "${a.name}": ${marks}`;
      });
      
    if (markerDescriptions.length > 0) {
      promptText += '\n\n[USER ANNOTATIONS ON UPLOADED IMAGES]\n' + markerDescriptions.join('\n');
    }

    const attachedImages = mediaAttachments.map((att) => ({
      data: att.dataUrl,
      mimeType: att.type || (att.isImage ? 'image/jpeg' : 'application/pdf'),
      name: att.name,
      markers: att.markers
    }));

    const newUserMessage: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      content: promptText,
      isHidden,
      ...(attachedImages.length > 0 ? { images: attachedImages } : {})
    };

    let targetSessionId = currentSessionId;
    let updatedSessionList = [...sessions];

    if (!targetSessionId) {
      // Create new session with smart title and auto-detected subject tag
      const newId = 'chat_' + Date.now();
      const firstTitle = isHidden ? `${activeMode} Session` : (promptText.length > 38 ? promptText.substring(0, 38) + '...' : promptText);
      const detectedTag = detectSubjectTag(promptText);
      const newSession: ChatSession = {
        id: newId,
        title: firstTitle || 'Study Session',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [newUserMessage],
        modelId: selectedModel,
        tag: detectedTag
      };

      updatedSessionList = [newSession, ...updatedSessionList];
      setSessions(updatedSessionList);
      setCurrentSessionId(newId);
      targetSessionId = newId;
    } else {
      // Append to existing session
      updatedSessionList = updatedSessionList.map((s) => {
        if (s.id === targetSessionId) {
          return {
            ...s,
            updatedAt: Date.now(),
            messages: [...s.messages, newUserMessage]
          };
        }
        return s;
      });
      setSessions(updatedSessionList);
    }

    const currentMessagesForAPI = [
      ...(currentSession ? currentSession.messages : []),
      newUserMessage
    ];

    userInitiatedSendRef.current = true;
    setInputValue('');
    setPendingAttachments([]);
    setIsSubmitting(true);

    try {
      const data = await safeFetchJson<ChatApiResponse>('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessagesForAPI,
          model: selectedModel,
          memory: conceptMemory,
          cognitive_graph: loadLocalCognitiveGraph(),
          mode: activeMode
        })
      });

      const resolvedModelName = data.model
        ? AVAILABLE_MODELS.find((m) => m.id === data.model)?.name || data.model
        : currentModelDef.name;

      let responseText = data.response || data.text || 'No response received from model.';

      // Parse and extract mastery updates
      const newMasteryRegex = /\`\`\`json\s*(\{[\s\S]*?"system_sync"[\s\S]*?\})\s*\`\`\`/gi;
      const oldMasteryRegex = /\[MASTERY_UPDATE:\s*(\{.*?\})\s*\]/gi;
      let match;
      const updates: any[] = [];
      let toastAlerts: string[] = [];

      while ((match = newMasteryRegex.exec(responseText)) !== null) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed.system_sync) {
            if (parsed.system_sync.db_update) updates.push(parsed.system_sync.db_update);
            if (parsed.system_sync.heatmap_ui_trigger?.alert_toast) {
              toastAlerts.push(parsed.system_sync.heatmap_ui_trigger.alert_toast);
            }
          }
        } catch (e) {
          console.error('Failed to parse new mastery update', e);
        }
      }

      while ((match = oldMasteryRegex.exec(responseText)) !== null) {
        try {
          const parsed = JSON.parse(match[1]);
          if (parsed.student_state_update) {
            updates.push(parsed.student_state_update);
          } else {
            updates.push(parsed); // Fallback for previous format
          }
        } catch (e) {
          console.error('Failed to parse mastery update', e);
        }
      }

      // Strip the tags from the user-facing text
      responseText = responseText.replace(/\`\`\`json\s*\{[\s\S]*?"system_sync"[\s\S]*?\}\s*\`\`\`/gi, '').trim();
      responseText = responseText.replace(/\[MASTERY_UPDATE:\s*\{.*?\}\s*\]/gi, '').trim();

      if (toastAlerts.length > 0) {
        // Just show the first one or combine them
        const alertMsg = toastAlerts[0];
        if (alertMsg && alertMsg.trim() !== '' && alertMsg !== 'null') {
          setToastMessage(alertMsg);
          setTimeout(() => setToastMessage(null), 3500);
        }
      }

      if (updates.length > 0) {
        // Update Cognitive Graph
        try {
          const currentGraph = loadLocalCognitiveGraph();
          updates.forEach(u => {
            const conceptName = u.concept_evaluated || u.concept;
            if (conceptName) {
              applyDiagnosticUpdate(currentGraph, {
                concept_id: conceptName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                concept_name: conceptName,
                topic: u.topic || 'General',
                is_correct: u.status === 'MASTERED' || u.status === 'Mastered',
                traps_triggered: u.last_error ? [u.last_error] : [],
                confidence: u.status === 'MASTERED' || u.status === 'Mastered' ? 1.0 : (u.status === 'CRITICAL_WEAKNESS' ? 0.3 : 0.6)
              });
            }
          });
          saveLocalCognitiveGraph(currentGraph);

          const isAutoSync = localStorage.getItem('examix_auto_sync_drive') !== 'false';
          if (isAutoSync) {
            syncToDrive(currentGraph).catch(() => {});
          }
        } catch (e) {
          console.error('Failed to update cognitive graph', e);
        }

        setConceptMemory(prev => {
          const newMemory = [...prev];
          updates.forEach(u => {
            const conceptName = u.concept_evaluated || u.concept;
            let status = u.status;
            
            // Map uppercase formats to UI formats
            if (status === 'MASTERED') status = 'Mastered';
            if (status === 'REVISION_NEEDED') status = 'Needs Revision';
            if (status === 'CRITICAL_WEAKNESS') status = 'Critical Weakness';
            
            if (!conceptName || !status) return;
            
            const existing = newMemory.find(m => m.concept.toLowerCase() === conceptName.toLowerCase());
            if (existing) {
              existing.status = status;
              if (status === 'Mastered') {
                existing.lastError = null;
                existing.confidenceScore = 1.0;
                const nextStreak = (existing.streak_count || 0) + 1;
                existing.streak_count = nextStreak;
                existing.retention_level = nextStreak >= 3 ? 'PERMANENT_LOCK' : 'FRESH';
                existing.last_tested_date = new Date().toISOString();
                if (!toastAlerts.length) {
                  showToast(nextStreak >= 3 
                    ? `🛡️ Permanent Lock: ${conceptName} locked with Gold Shield (3+ streak)!` 
                    : `🎯 Concept Mastered: ${conceptName} is now 100/100 (🔥 Streak: ${nextStreak}/3)!`);
                }
              } else {
                existing.lastError = u.last_error || existing.lastError || 'Needs Socratic drill';
                existing.confidenceScore = status === 'Critical Weakness' ? 0.3 : 0.6;
                existing.streak_count = 0; // reset on error as per Ebbinghaus rule
                existing.retention_level = 'DECAYED';
                existing.last_tested_date = new Date().toISOString();
              }
              existing.lastUpdated = Date.now();
            } else {
              const initialStreak = status === 'Mastered' ? 1 : 0;
              newMemory.push({ 
                concept: conceptName, 
                topic: u.topic || 'General',
                status, 
                lastUpdated: Date.now(),
                last_tested_date: new Date().toISOString(),
                streak_count: initialStreak,
                retention_level: status === 'Mastered' ? 'FRESH' : 'DECAYED',
                lastError: status === 'Mastered' ? null : (u.last_error || null),
                confidenceScore: status === 'Mastered' ? 1.0 : (status === 'Critical Weakness' ? 0.3 : 0.6)
              });
              if (status === 'Mastered' && !toastAlerts.length) {
                showToast(`🎯 Concept Mastered: ${conceptName} is now 100/100!`);
              }
            }
          });
          return newMemory;
        });
      }

      const assistantMessage: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'assistant',
        content: responseText,
        modelUsed: resolvedModelName
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              updatedAt: Date.now(),
              messages: [...s.messages, assistantMessage]
            };
          }
          return s;
        })
      );
    } catch (error: any) {
      console.error('Chat error:', error);
      let errorDesc = error.message || 'Please check your connection and try again.';
      if (errorDesc === 'Failed to fetch') {
        errorDesc = 'Network connection failed. The server might be restarting or temporarily offline. Please wait a moment and try again.';
      }
      const errorMessage: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'assistant',
        content: `**⚠️ Unable to reach AI Model**\n\n${errorDesc}`,
        modelUsed: 'Error'
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              updatedAt: Date.now(),
              messages: [...s.messages, errorMessage]
            };
          }
          return s;
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateLast = () => {
    if (!currentSession || currentSession.messages.length === 0) return;
    const lastUserMsg = [...currentSession.messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      handleSend(lastUserMsg.content);
    }
  };

  const canSend = inputValue.trim().length > 0 || pendingAttachments.length > 0;

  // Extract unique custom tags created by user across all sessions
  const userCustomTags = Array.from(
    new Set(
      sessions
        .map((s) => s.tag)
        .filter((t): t is string => Boolean(t && !PRESET_SUBJECTS.some((p) => p.id.toLowerCase() === t.toLowerCase())))
    )
  );

  const allSubjectFilterTags = [
    'All',
    ...PRESET_SUBJECTS.map((p) => p.id),
    ...userCustomTags
  ];

  const getSubjectCount = (tagId: string) => {
    if (tagId === 'All') return sessions.length;
    return sessions.filter((s) => {
      const effectiveTag = s.tag || detectSubjectTag(s.title + ' ' + (s.messages[0]?.content || ''));
      return effectiveTag.toLowerCase() === tagId.toLowerCase();
    }).length;
  };

  // Filtered sessions for sidebar (by Subject Tag and Search Query)
  const filteredSessions = sessions.filter((s) => {
    const effectiveTag = s.tag || detectSubjectTag(s.title + ' ' + (s.messages[0]?.content || ''));
    const matchesTag =
      selectedTagFilter === 'All' || effectiveTag.toLowerCase() === selectedTagFilter.toLowerCase();

    const query = chatSearchQuery.trim().toLowerCase();
    if (!query) return matchesTag;

    const matchesTitle = s.title.toLowerCase().includes(query);
    const matchesTagText = effectiveTag.toLowerCase().includes(query);
    const matchesMessages = s.messages.some((m) => m.content.toLowerCase().includes(query));

    return matchesTag && (matchesTitle || matchesTagText || matchesMessages);
  });

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className="relative flex h-screen w-full overflow-hidden bg-[#081511] text-white font-sans selection:bg-[#4ADE80]/30"
    >
      {/* Hidden File Input */}
      <input
        id="multi-file-upload-input"
        type="file"
        multiple
        ref={fileInputRef}
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="sr-only fixed -top-[1000px] -left-[1000px] opacity-0 pointer-events-none"
        accept="image/*,.pdf,.doc,.docx"
      />

      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md border-4 border-dashed border-[#4ADE80] m-4 rounded-3xl pointer-events-none animate-pulse">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#4ADE80]/20 text-[#4ADE80] mb-4">
            <Camera size={40} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">Drop study photos or notes here</h3>
          <p className="text-sm text-gray-400">Examix AI will stage them for interactive analysis</p>
        </div>
      )}

      {/* Full Image & Diagram Lightbox Modal */}
      {activeLightboxImg && (
        <ImageLightboxModal
          src={activeLightboxImg}
          alt="Expanded study diagram"
          onClose={() => setActiveLightboxImg(null)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 rounded-2xl border border-[#4ADE80]/40 bg-[#0D1C17]/95 px-4 py-3 text-sm text-[#4ADE80] shadow-2xl backdrop-blur-xl animate-fade-in flex items-center gap-2">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Backdrop on Mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Gemini-Style Collapsible Sidebar (3 lines / hamburger menu drawer) */}
      <aside
        id="gemini-chat-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-40 flex w-72 sm:w-80 flex-col border-r border-[#1C382E]/70 bg-[#0A1713] transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-72 lg:w-80'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1C382E]/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4ADE80] shadow-[0_0_12px_rgba(74,222,128,0.4)]">
              <Camera size={18} className="text-black" />
            </div>
            <span className="font-bold tracking-tight text-white uppercase text-base">
              Examix <span className="text-[#4ADE80]">AI</span>
            </span>
          </div>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            id="sidebar-new-chat-btn"
            onClick={createNewChat}
            className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border border-[#1C382E] bg-[#0D1C17] px-4 py-3 text-sm font-medium text-white transition-all hover:border-[#4ADE80]/50 hover:bg-[#12271F] active:scale-[0.98]"
          >
            <div className="flex items-center gap-2.5">
              <Plus size={18} className="text-[#4ADE80]" />
              <span>New chat</span>
            </div>
            <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
              Ctrl+K
            </span>
          </button>
        </div>

        {/* Search Chats */}
        <div className="px-3 pb-1.5">
          <div className="relative flex items-center rounded-xl border border-[#1C382E]/60 bg-[#081511]/70 px-3 py-2 text-xs text-gray-300">
            <Search size={14} className="text-gray-500 mr-2 shrink-0" />
            <input
              type="text"
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              placeholder="Search saved chats or tags..."
              className="w-full bg-transparent outline-none placeholder:text-gray-500 text-xs"
            />
            {chatSearchQuery && (
              <button onClick={() => setChatSearchQuery('')} className="text-gray-500 hover:text-white cursor-pointer">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Subject Tag Filter Bar */}
        <div className="px-3 pb-2.5 pt-1 border-b border-[#1C382E]/50">
          <div className="flex items-center justify-between px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <span className="flex items-center gap-1.5">
              <Filter size={11} className="text-[#4ADE80]" />
              <span>Subjects</span>
            </span>
            {selectedTagFilter !== 'All' && (
              <button
                onClick={() => setSelectedTagFilter('All')}
                className="text-[10px] font-medium text-emerald-400 hover:underline cursor-pointer"
              >
                Show All
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {allSubjectFilterTags.map((tagId) => {
              const count = getSubjectCount(tagId);
              const isSelected = selectedTagFilter.toLowerCase() === tagId.toLowerCase();
              const config = tagId === 'All' ? null : getSubjectTagStyle(tagId);

              return (
                <button
                  key={tagId}
                  onClick={() => setSelectedTagFilter(tagId)}
                  className={`group flex shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-all ${
                    isSelected
                      ? tagId === 'All'
                        ? 'bg-[#4ADE80] text-black font-bold shadow-[0_0_10px_rgba(74,222,128,0.4)]'
                        : `${config?.activeFilterBg} ${config?.activeFilterText} font-bold shadow-xs`
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/20 hover:text-white'
                  }`}
                  title={`Filter by ${tagId}`}
                >
                  {tagId !== 'All' && renderSubjectIcon(config?.iconName, 'w-3 h-3')}
                  <span>{tagId}</span>
                  <span
                    className={`rounded-full px-1 py-0.2 text-[9px] font-mono ${
                      isSelected
                        ? 'bg-black/20 text-current'
                        : 'bg-white/10 text-gray-400 group-hover:text-white'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-3 py-1 scrollbar-thin">
          <div className="mb-2 px-2 flex items-center justify-between text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
            <span>Conversations</span>
            {selectedTagFilter !== 'All' && (
              <span className="text-[10px] text-[#4ADE80] lowercase font-normal">
                ({filteredSessions.length} in {selectedTagFilter})
              </span>
            )}
          </div>

          {filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 px-4">
              <MessageSquare size={28} className="mb-2 opacity-40" />
              <p className="text-xs">No chats found for this filter.</p>
              {selectedTagFilter !== 'All' && (
                <button
                  onClick={() => setSelectedTagFilter('All')}
                  className="mt-2 text-xs text-[#4ADE80] hover:underline cursor-pointer"
                >
                  Clear Subject Filter
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredSessions.map((s) => {
                const isActive = s.id === currentSessionId;
                const effectiveTag = s.tag || detectSubjectTag(s.title + ' ' + (s.messages[0]?.content || ''));
                const tagStyle = getSubjectTagStyle(effectiveTag);

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setCurrentSessionId(s.id);
                      setActiveMode('Standard Mode');
                      setIsSidebarOpen(false);
                    }}
                    className={`group relative flex cursor-pointer flex-col rounded-xl p-2.5 text-xs transition-all ${
                      isActive
                        ? 'bg-[#4ADE80]/15 text-white font-semibold border border-[#4ADE80]/30 shadow-[0_0_15px_rgba(74,222,128,0.1)]'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare
                          size={13}
                          className={`shrink-0 ${isActive ? 'text-[#4ADE80]' : 'text-gray-500 group-hover:text-gray-300'}`}
                        />
                        <span className="truncate font-medium">{s.title}</span>
                      </div>

                      {/* Actions on hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTagMenuSessionId(activeTagMenuSessionId === s.id ? null : s.id);
                          }}
                          className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                          title="Change subject tag"
                        >
                          <Tag size={12} />
                        </button>
                        <button
                          onClick={(e) => deleteSession(e, s.id)}
                          className="rounded-lg p-1 text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-all cursor-pointer"
                          title="Delete chat"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 mt-0.5">
                      <span>{s.messages.length} msg{s.messages.length !== 1 ? 's' : ''}</span>

                      {/* Subject Tag Pill with Click to Change Dropdown */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTagMenuSessionId(activeTagMenuSessionId === s.id ? null : s.id);
                          }}
                          className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 border text-[10px] font-semibold transition-all cursor-pointer ${
                            tagStyle.badgeBg
                          } ${tagStyle.badgeText} ${tagStyle.badgeBorder} hover:scale-105`}
                          title="Click to change subject tag"
                        >
                          {renderSubjectIcon(tagStyle.iconName, 'w-2.5 h-2.5')}
                          <span>{effectiveTag}</span>
                        </button>

                        {activeTagMenuSessionId === s.id && (
                          <TagPickerDropdown
                            currentTag={effectiveTag}
                            onSelectTag={(newTag) => updateSessionTag(s.id, newTag)}
                            onClose={() => setActiveTagMenuSessionId(null)}
                            customTags={userCustomTags}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#1C382E]/50 text-xs text-gray-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#4ADE80] animate-pulse"></span>
            <span className="text-[11px] text-gray-300 font-medium">Examix AI Online</span>
          </div>
          <button
            id="sidebar-settings-btn"
            onClick={() => setShowSettingsModal(true)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#1C382E] bg-[#0D1C17] text-gray-300 transition-all hover:border-[#4ADE80]/50 hover:bg-[#12271F] hover:text-[#4ADE80] active:scale-95 cursor-pointer shadow-xs"
            title="API Keys & Settings"
            aria-label="Settings"
          >
            <Settings size={17} />
          </button>
        </div>
      </aside>

      {/* Main Conversation Canvas */}
      <div className={`flex ${isCanvasOpen ? 'hidden lg:flex lg:flex-1' : 'flex-1'} flex-col h-screen overflow-hidden transition-all duration-300 bg-[#081511]`}>
        {/* Top Header with Hamburger, Compact Model Selector & Controls */}
        <header className="relative z-30 flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-[#1C382E]/80 bg-[#081511]/95 px-2.5 sm:px-4 md:px-6 backdrop-blur-md gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            {/* Hamburger Menu Button */}
            <button
              id="examix-hamburger-menu-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex h-8.5 w-8.5 sm:h-9 sm:w-9 cursor-pointer items-center justify-center rounded-xl border border-[#1C382E] bg-[#0D1C17] text-gray-300 transition-all hover:border-[#4ADE80]/40 hover:bg-[#12271F] hover:text-white active:scale-95 shrink-0"
              title="Toggle Chat Sidebar"
              aria-label="Toggle Sidebar"
            >
              <Menu size={17} />
            </button>

            {/* Compact Model Selector Dropdown: [ ✦ 3.7 Flash ˅ ] */}
            <div className="relative flex items-center shrink-0" ref={dropdownRef}>
              <button
                id="examix-model-selector-btn"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="group flex cursor-pointer items-center gap-1.5 rounded-full border border-[#1C382E] bg-[#0D1C17] px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all hover:border-[#4ADE80]/40 hover:bg-[#12271F] active:scale-95 shrink-0"
                title="Switch AI Model"
                aria-label="Switch AI Model"
              >
                <Sparkles size={13} className="text-[#4ADE80] shrink-0" />
                <span className="truncate tracking-tight font-semibold">
                  {currentModelDef.name.replace(/^Gemini\s+/i, '')}
                </span>
                <ChevronDown
                  size={12}
                  className={`text-gray-400 transition-transform duration-200 group-hover:text-white shrink-0 ${isModelDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Minimalist Model Dropdown Menu */}
              {isModelDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-[#1C382E] bg-[#0D1C17]/98 p-2 shadow-2xl backdrop-blur-2xl z-50 animate-fade-in">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[#1C382E]/60">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      AI Models
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Ready
                    </span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {AVAILABLE_MODELS.map((model) => {
                      const isSelected = model.id === selectedModel;
                      const Icon = model.icon;
                      return (
                        <button
                          key={model.id}
                          onClick={() => {
                            setSelectedModel(model.id);
                            setIsModelDropdownOpen(false);
                            showToast(`Switched to ${model.name}`);
                          }}
                          className={`flex w-full cursor-pointer flex-col rounded-xl p-2.5 text-left transition-all ${
                            isSelected
                              ? 'bg-white/10 border border-[#4ADE80]/40 text-white'
                              : 'hover:bg-white/5 text-gray-300 hover:text-white border border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <Icon
                                size={15}
                                className={isSelected ? 'text-[#4ADE80]' : 'text-gray-400'}
                              />
                              <span className="font-medium text-sm text-white">{model.name}</span>
                            </div>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${model.badgeColor}`}
                            >
                              {model.badge}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                            {model.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Current Session Subject Tag Pill (Desktop only, prevents overflow on mobile) */}
            {currentSession && (
              <div className="relative hidden xl:flex items-center shrink-0">
                {(() => {
                  const effectiveTag = currentSession.tag || detectSubjectTag(currentSession.title + ' ' + (currentSession.messages[0]?.content || ''));
                  const tagStyle = getSubjectTagStyle(effectiveTag);
                  return (
                    <>
                      <button
                        id="header-session-tag-btn"
                        onClick={() => setIsHeaderTagMenuOpen(!isHeaderTagMenuOpen)}
                        className={`group flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] ${
                          tagStyle.badgeBg
                        } ${tagStyle.badgeText} ${tagStyle.badgeBorder}`}
                        title="Click to change chat subject"
                      >
                        {renderSubjectIcon(tagStyle.iconName, 'w-3.5 h-3.5')}
                        <span>{effectiveTag}</span>
                        <ChevronDown size={11} className="opacity-70 group-hover:opacity-100 transition-transform" />
                      </button>

                      {isHeaderTagMenuOpen && (
                        <TagPickerDropdown
                          currentTag={effectiveTag}
                          onSelectTag={(newTag) => updateSessionTag(currentSession.id, newTag)}
                          onClose={() => setIsHeaderTagMenuOpen(false)}
                          customTags={userCustomTags}
                        />
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Quick New Chat Button (Desktop) */}
            <button
              id="header-new-chat-btn"
              onClick={createNewChat}
              className="hidden sm:flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border border-[#1C382E] bg-[#0D1C17] px-2 sm:px-2.5 text-xs font-medium text-gray-300 transition-all hover:border-[#4ADE80]/40 hover:bg-[#12271F] hover:text-white shrink-0"
              title="Start a new chat"
            >
              <Plus size={14} className="text-[#4ADE80]" />
              <span className="hidden xl:inline">New</span>
            </button>

            {/* Active Mode Indicator */}
            {activeMode !== 'Standard Mode' && (
              <div className="flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[11px] font-semibold text-blue-300 shadow-xs transition-all shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                <span className="truncate max-w-[70px] sm:max-w-none">{activeMode.replace(' Mode', '')}</span>
                <button 
                  onClick={() => setActiveMode('Standard Mode')} 
                  className="ml-0.5 hover:text-white transition-colors cursor-pointer"
                  title="Exit Mode"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Right Header: Actions & Account Profile */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
            {/* OCR Document Scanner & Handwritten Notes Hub (ICON ONLY) */}
            <button
              id="header-ocr-scanner-btn"
              onClick={() => setShowPdfSlideModal(true)}
              className="flex h-8.5 w-8.5 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-[#4ADE80]/40 bg-[#0D1C17] text-[#4ADE80] transition-all hover:border-[#4ADE80] hover:bg-[#12271F] hover:text-white active:scale-95 cursor-pointer shadow-xs shrink-0"
              title="PDF & Study Notes Hub (Import, Export & Share)"
              aria-label="PDF & Study Notes Hub"
            >
              <ScanText size={15} className="text-[#4ADE80]" />
            </button>

            {/* Concept Memory Dashboard Button */}
            <button
              id="toggle-mastery-dashboard-btn"
              onClick={() => setShowMasteryModal(true)}
              className="flex h-8.5 w-8.5 sm:h-9 sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-[#1C382E] bg-[#0D1C17] px-2 sm:px-2.5 text-xs font-medium text-gray-300 transition-all hover:border-[#4ADE80]/50 hover:bg-[#12271F] hover:text-[#4ADE80] active:scale-95 shadow-xs shrink-0 cursor-pointer"
              title="Concept Memory & Knowledge Graph"
              aria-label="Concept Memory"
            >
              <BrainCircuit size={15} className="text-[#4ADE80]" />
              <span className="hidden lg:inline text-xs">Memory</span>
            </button>

            {/* User Profile Avatar with Dynamic Google Auth State & Dropdown */}
            <div className="relative shrink-0">
              <button
                id="account-profile-btn"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`relative flex h-8.5 w-8.5 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-all hover:scale-105 shrink-0 cursor-pointer ${
                  currentUserProfile?.photoURL
                    ? 'p-[1.5px] bg-gradient-to-tr from-[#4ADE80] via-emerald-400 to-teal-300 shadow-[0_0_12px_rgba(74,222,128,0.3)]'
                    : currentUserProfile
                    ? 'p-[1.5px] bg-gradient-to-tr from-[#4ADE80] to-[#1C382E] shadow-xs'
                    : 'bg-[#1E293B] border border-white/15 text-gray-300 hover:text-white shadow-xs'
                }`}
                title={currentUserProfile?.displayName ? `${currentUserProfile.displayName} (Google Account)` : "Student Account & Settings"}
                aria-label="Student Account"
              >
                {currentUserProfile?.photoURL ? (
                  <>
                    <img
                      src={currentUserProfile.photoURL}
                      alt={currentUserProfile.displayName || 'User'}
                      className="h-full w-full rounded-full object-cover bg-[#0D1C17]"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0D1C17] bg-[#4ADE80]" />
                  </>
                ) : currentUserProfile ? (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0D1C17]">
                    <span className="text-[11px] sm:text-xs font-bold text-[#4ADE80]">
                      {currentUserProfile.displayName
                        ? currentUserProfile.displayName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase()
                        : 'ST'}
                    </span>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0D1C17] bg-[#4ADE80]" />
                  </div>
                ) : (
                  <UserIcon size={16} className="text-gray-300" />
                )}
              </button>

              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-3xl border border-[#1C382E] bg-[#0D1C17] p-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                    {/* User Info Header */}
                    <div className="px-3.5 py-3 border-b border-[#1C382E]/70 mb-1.5 bg-white/[0.02] rounded-2xl">
                      <div className="flex items-center gap-3">
                        {currentUserProfile?.photoURL ? (
                          <div className="relative h-10 w-10 shrink-0 rounded-full p-[1px] bg-gradient-to-tr from-[#4ADE80] to-teal-300">
                            <img
                              src={currentUserProfile.photoURL}
                              alt="Profile"
                              className="h-full w-full rounded-full object-cover bg-[#0D1C17]"
                              referrerPolicy="no-referrer"
                            />
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-[#0D1C17] bg-[#4ADE80]" />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1E293B] text-gray-400">
                            <UserIcon size={20} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-white">
                            {currentUserProfile?.displayName || 'Guest Student / Aspirant'}
                          </div>
                          <div className="truncate text-[10px] text-gray-400 font-mono">
                            {currentUserProfile?.email || 'Not connected to Google'}
                          </div>
                        </div>
                      </div>

                      {/* Status pill */}
                      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-white/5 text-[10px]">
                        <span className="text-gray-400">Mastery Vault</span>
                        {currentUserProfile ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#4ADE80]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80] animate-pulse"></span>
                            <span>Live Synced (📁 {VAULT_FOLDER_NAME})</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 font-medium">Guest Mode</span>
                        )}
                      </div>
                    </div>

                    {/* Menu Actions */}
                    <div className="space-y-0.5">
                      <button
                        id="profile-menu-account-vault-btn"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setSettingsInitialTab('account');
                          setShowSettingsModal(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-[#12271F] hover:text-[#4ADE80] transition-colors cursor-pointer"
                      >
                        <Cloud size={14} className="text-[#4ADE80]" />
                        <span>Google Account & Mastery Vault</span>
                      </button>

                      <button
                        id="profile-menu-settings-btn"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setSettingsInitialTab('api_keys');
                          setShowSettingsModal(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-gray-200 hover:bg-[#12271F] hover:text-[#4ADE80] transition-colors cursor-pointer"
                      >
                        <Settings size={14} className="text-[#4ADE80]" />
                        <span>API Keys & Preferences</span>
                      </button>

                      <button
                        id="profile-menu-hotwords-btn"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowHotwordModal(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-gray-200 hover:bg-[#12271F] hover:text-[#4ADE80] transition-colors cursor-pointer"
                      >
                        <Mic size={14} className="text-[#4ADE80]" />
                        <span>Hotword Matrix & Android OS</span>
                      </button>

                      <button
                        id="profile-menu-memory-btn"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowMasteryModal(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-gray-200 hover:bg-[#12271F] hover:text-[#4ADE80] transition-colors cursor-pointer"
                      >
                        <BrainCircuit size={14} className="text-[#4ADE80]" />
                        <span>Concept Knowledge Graph</span>
                      </button>

                      <button
                        id="profile-menu-ocr-btn"
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowPdfSlideModal(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-gray-200 hover:bg-[#12271F] hover:text-[#4ADE80] transition-colors cursor-pointer"
                      >
                        <ScanText size={14} className="text-[#4ADE80]" />
                        <span>Handwritten Notes Scanner</span>
                      </button>
                    </div>

                    {/* Quick Auth Trigger Footer */}
                    <div className="mt-2 pt-2 border-t border-[#1C382E]/70">
                      {currentUserProfile ? (
                        <button
                          id="profile-menu-signout-btn"
                          onClick={async () => {
                            setShowProfileMenu(false);
                            await logout();
                            setCurrentUserProfile(null);
                            showToast('Signed out of Google Account');
                          }}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-all cursor-pointer"
                        >
                          <LogOut size={13} />
                          <span>Sign Out</span>
                        </button>
                      ) : (
                        <button
                          id="profile-menu-signin-btn"
                          onClick={async () => {
                            setShowProfileMenu(false);
                            try {
                              const res = await googleSignIn();
                              if (res?.user) {
                                setCurrentUserProfile({
                                  uid: res.user.uid,
                                  displayName: res.user.displayName,
                                  email: res.user.email,
                                  photoURL: res.user.photoURL
                                });
                                showToast(`Welcome, ${res.user.displayName || 'Student'}!`);
                              }
                            } catch (e: any) {
                              showToast('Sign in failed: ' + e.message);
                            }
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2 text-xs font-bold text-gray-900 shadow hover:bg-gray-100 transition-all cursor-pointer"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                          </svg>
                          <span>Sign in with Google</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Full-Screen Scrollable Messages Area */}
        <main ref={mainScrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 scrollbar-thin relative">
          <div className="mx-auto max-w-4xl w-full">
            {messages.length === 0 ? (
              /* Welcome Screen when no messages */
              <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-2">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#4ADE80] to-emerald-200 shadow-[0_0_30px_rgba(74,222,128,0.3)]">
                  <Sparkles size={32} className="fill-black text-black" />
                </div>

                <h1 className="mb-2 text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                  Meet <span className="text-[#4ADE80]">Examix AI</span>
                </h1>
                <p className="mb-8 max-w-lg text-sm sm:text-base text-gray-400">
                  Powered by {currentModelDef.name}. Upload textbook diagrams, audit handwritten solutions, or ask deep concept doubts.
                </p>

                {/* Prompt Suggestion Cards */}
                <div className="grid w-full max-w-2xl grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <button
                    onClick={() =>
                      handleSend(
                        'Generate an Exam Quick Revision Sheet on Coulomb\'s Law and Electrostatic Force in Vector Form.'
                      )
                    }
                    className="group flex flex-col justify-between rounded-2xl border border-[#4ADE80]/30 bg-[#161618] p-4 transition-all hover:border-[#4ADE80] hover:bg-[#4ADE80]/5 active:scale-[0.99] cursor-pointer shadow-[0_0_15px_rgba(74,222,128,0.1)]"
                  >
                    <div className="flex items-center justify-between text-xs text-[#4ADE80] mb-2 font-medium">
                      <span>Exam Revision Sheet</span>
                      <Download size={14} className="transition-transform group-hover:translate-y-0.5 text-[#4ADE80]" />
                    </div>
                    <span className="text-sm font-semibold text-gray-200">
                      Coulomb's Law Quick Sheet
                    </span>
                    <span className="text-xs text-gray-400 mt-1">Definition, LaTeX formulas, traps & 1-page PDF notes</span>
                  </button>

                  <button
                    onClick={() => {
                      triggerFileUpload();
                    }}
                    className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#161618] p-4 transition-all hover:border-[#4ADE80]/50 hover:bg-white/5 active:scale-[0.99] cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs text-[#4ADE80] mb-2 font-medium">
                      <span>Multimodal Vision</span>
                      <Camera size={14} className="transition-transform group-hover:scale-110" />
                    </div>
                    <span className="text-sm font-semibold text-gray-200">
                      Scan Handwritten Solution
                    </span>
                    <span className="text-xs text-gray-400 mt-1">Upload notebook photos for line-by-line audit</span>
                  </button>

                  <button
                    onClick={() =>
                      handleSend(
                        'Generate an Exam Quick Revision Sheet on Newton\'s Laws of Motion with free-body diagrams and common exam traps.'
                      )
                    }
                    className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#161618] p-4 transition-all hover:border-[#4ADE80]/50 hover:bg-white/5 active:scale-[0.99] cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs text-[#4ADE80] mb-2 font-medium">
                      <span>Physics Intuition</span>
                      <Zap size={14} className="transition-transform group-hover:translate-x-1" />
                    </div>
                    <span className="text-sm font-semibold text-gray-200">
                      Newton's 2nd Law & Derivations
                    </span>
                    <span className="text-xs text-gray-400 mt-1">Breakdown with proportionality rules & solutions</span>
                  </button>

                  <button
                    onClick={() =>
                      handleSend(
                        'Generate an Exam Quick Revision Sheet on Calculus Integration by Parts with standard formulas and pitfalls.'
                      )
                    }
                    className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#161618] p-4 transition-all hover:border-[#4ADE80]/50 hover:bg-white/5 active:scale-[0.99] cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs text-[#4ADE80] mb-2 font-medium">
                      <span>Math Deep Dive</span>
                      <BookOpen size={14} className="transition-transform group-hover:translate-x-1" />
                    </div>
                    <span className="text-sm font-semibold text-gray-200">
                      Calculus Integration by Parts
                    </span>
                    <span className="text-xs text-gray-400 mt-1">Spot common substitution and sign traps</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Full-Screen Stream of Messages */
              <div id="full-chat-stream" className="flex flex-col gap-4 pb-36">
                {messages.filter(msg => !msg.isHidden).map((msg, idx) =>
                  msg.role === 'user' ? (
                    <UserMessage
                      key={msg.id || idx}
                      msg={msg}
                      onImageClick={(url) => setActiveLightboxImg(url)}
                    />
                  ) : (
                    <AssistantMessage
                      key={msg.id || idx}
                      msg={msg}
                      index={idx}
                      onRegenerate={idx === messages.filter(m => !m.isHidden).length - 1 ? handleRegenerateLast : undefined}
                      onPromptClick={(prompt) => handleSend(prompt)}
                      isLastMessage={idx === messages.filter(m => !m.isHidden).length - 1}
                    />
                  )
                )}

                {/* Gemini-Style Thinking Indicator */}
                {isSubmitting && (
                  <div className="flex items-start py-4">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#161618] px-4 py-3 text-sm text-gray-300 shadow-md">
                      <Loader2 size={16} className="animate-spin text-[#4ADE80]" />
                      <span>Reasoning...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </div>
        </main>

        {/* Ambient Bottom Light Wave (Halki si roshni jab response aata hai) */}
        <div
          className={`pointer-events-none absolute bottom-20 left-0 right-0 h-36 bg-gradient-to-t from-[#4ADE80]/20 via-[#4ADE80]/5 to-transparent transition-opacity duration-1000 ease-out z-20 ${
            showBottomGlow ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-[2px] bg-gradient-to-r from-transparent via-[#4ADE80] to-transparent blur-[2px] opacity-80" />
        </div>

        {/* Floating Jump to New Response Pill (Visible when user was reading above) */}
        {hasNewResponseBelow && isUserScrolledUp && (
          <button
            id="jump-to-new-response-btn"
            onClick={scrollToBottom}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border border-[#4ADE80]/50 bg-[#0D1C17]/95 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(74,222,128,0.35)] backdrop-blur-md transition-all hover:scale-105 hover:bg-[#12271F] active:scale-95 animate-bounce cursor-pointer"
            title="Click to jump down to the new response"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4ADE80]"></span>
            </span>
            <span>New response below</span>
            <ArrowDown size={14} className="text-[#4ADE80]" />
          </button>
        )}

        {/* Gemini-Style Floating Bottom Input Dock */}
        <footer className="relative z-30 flex shrink-0 justify-center bg-gradient-to-t from-[#081511] via-[#081511]/95 to-transparent px-4 sm:px-8 pb-5 sm:pb-6 pt-2">
          <div className="flex w-full max-w-3xl flex-col items-center gap-2">
            {/* Real-Time Live Voice Input Activity Bar */}
            {isListening && (
              <div className="flex items-center gap-2.5 rounded-full border border-blue-500/40 bg-[#0D1C17]/95 px-3.5 py-1.5 text-xs font-semibold text-blue-300 shadow-[0_0_25px_rgba(59,130,246,0.35)] backdrop-blur-xl animate-fade-in transition-all">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
                <span>Listening to your voice... Speak clearly</span>
                <div className="flex items-center gap-1 pl-1">
                  {waveformLevels.map((lvl, idx) => (
                    <span
                      key={idx}
                      className="w-1 rounded-full bg-gradient-to-t from-blue-500 via-cyan-400 to-[#4ADE80] transition-all duration-100 ease-out"
                      style={{ height: `${Math.max(4, Math.min(16, (lvl / 100) * 16))}px` }}
                    />
                  ))}
                </div>
                <button
                  onClick={toggleListening}
                  className="ml-1 text-gray-400 hover:text-white text-[11px] underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Attached Photos Preview Tray */}
            {pendingAttachments.length > 0 && (
              <div
                id="pending-attachments-tray"
                className="flex w-full items-center gap-2.5 overflow-x-auto rounded-2xl border border-[#1C382E] bg-[#0D1C17]/95 p-2.5 shadow-2xl backdrop-blur-xl scrollbar-thin"
              >
                {pendingAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="group relative flex shrink-0 items-center gap-2.5 rounded-xl border border-[#1C382E]/80 bg-[#12271F]/60 p-1.5 pr-3 shadow transition-all hover:border-[#4ADE80]/50"
                  >
                    {att.type === 'application/pdf' || att.name.toLowerCase().endsWith('.pdf') ? (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-400 font-bold text-xs border border-red-500/30">
                        PDF
                      </div>
                    ) : att.isImage ? (
                      <div 
                        className="relative cursor-pointer group/img"
                        onClick={() => setAnnotatingImage(att)}
                      >
                        <img
                          src={att.dataUrl}
                          alt={att.name}
                          className="h-12 w-12 rounded-lg object-cover border border-white/10"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
                          <Plus size={16} className="text-white" />
                        </div>
                        {att.markers && att.markers.length > 0 && (
                          <div className="absolute -top-2 -right-2 bg-green-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-black">
                            {att.markers.length}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4ADE80]/15 text-[#4ADE80]">
                        <FileText size={20} />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span
                        className="max-w-[110px] truncate text-xs font-medium text-gray-200"
                        title={att.name}
                      >
                        {att.name}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatFileSize(att.size)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors ml-1"
                      title="Remove attachment"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                <label
                  htmlFor="multi-file-upload-input"
                  onClick={triggerFileUpload}
                  className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-[#1C382E] bg-transparent px-3 py-3 text-xs font-medium text-gray-400 hover:border-[#4ADE80] hover:text-[#4ADE80] transition-all active:scale-95"
                  title="Add more photos"
                >
                  <Plus size={14} />
                  <span>Add More</span>
                </label>
              </div>
            )}

            {/* Main Gemini-style Input Capsule */}
            <div className="relative flex h-14 sm:h-16 w-full items-center gap-2 sm:gap-3 rounded-full border border-[#1C382E] bg-[#0D1C17] px-3 sm:px-4 shadow-2xl focus-within:border-[#4ADE80]/40 transition-all">
              <div className="relative">
                <button
                  id="attach-file-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowAttachMenu(!showAttachMenu);
                  }}
                  className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-400 hover:bg-white/5 hover:text-white transition-colors active:scale-95 z-[51]"
                  title="Attach file"
                >
                  {showAttachMenu ? (
                    <X size={22} className="text-white transition-transform duration-200" />
                  ) : (
                    <Plus size={22} className="transition-transform duration-200" />
                  )}
                </button>
                
                {/* Gemini-style Bottom Sheet Modal */}
                {showAttachMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
                      onClick={() => setShowAttachMenu(false)}
                    />
                    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D1C17] border-t border-[#1C382E] rounded-t-[24px] p-4 sm:p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                      
                      {/* Voice-to-Voice Talk to Mentor Spotlight Button */}
                      <div className="max-w-md mx-auto mb-4">
                        <button
                          id="talk-to-mentor-plus-btn"
                          onClick={() => {
                            setShowAttachMenu(false);
                            setShowVoiceModal(true);
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#4ADE80]/40 bg-gradient-to-r from-[#12271F] via-[#0D1C17] to-[#0A1713] p-3.5 shadow-[0_0_20px_rgba(74,222,128,0.15)] hover:border-[#4ADE80] transition-all hover:scale-[1.01] active:scale-[0.99] text-left cursor-pointer group"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/40 group-hover:scale-110 transition-transform">
                              <Radio size={22} className="animate-pulse text-[#4ADE80]" />
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#4ADE80]"></span>
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-[15px] font-bold text-white group-hover:text-[#4ADE80] transition-colors">
                                  Talk with Mentor
                                </span>
                                <span className="rounded-full bg-[#4ADE80]/20 px-2 py-0.5 text-[10px] font-semibold text-[#4ADE80] border border-[#4ADE80]/40 uppercase tracking-wider">
                                  Live Voice
                                </span>
                              </div>
                              <span className="text-[12px] text-gray-300">
                                Voice-to-voice tutoring & instant concept clearance
                              </span>
                            </div>
                          </div>
                          <ArrowRight size={18} className="text-[#4ADE80] transition-transform group-hover:translate-x-1" />
                        </button>
                      </div>

                      {/* Top Row - Horizontal Grid of Quick Capture/Upload Buttons */}
                      <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-md mx-auto mb-6">
                        {/* Photos */}
                        <button 
                          onClick={() => {
                            setShowAttachMenu(false);
                            setInputValue("");
                            addSystemMessage("Please upload your document or photo. I will run a line-by-line step-mark analysis to check steps and solution accuracy.", "Homework & Answer Audit Mode");
                            triggerFileUpload();
                          }}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-[#12271F] text-blue-400 group-hover:bg-[#1C382E] transition-colors active:scale-95">
                            <ImageIcon size={26} />
                          </div>
                          <span className="text-[11px] sm:text-[12px] font-medium text-gray-300">Photos</span>
                        </button>
                        
                        {/* Camera */}
                        <button 
                          onClick={() => {
                            setShowAttachMenu(false);
                            setShowVoiceModal(true);
                          }}
                          className="flex flex-col items-center gap-2 group cursor-pointer"
                        >
                          <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-[#12271F] text-white group-hover:bg-[#1C382E] transition-colors active:scale-95">
                            <Camera size={26} />
                          </div>
                          <span className="text-[11px] sm:text-[12px] font-medium text-gray-300">Camera</span>
                        </button>
                        
                        {/* Files */}
                        <button 
                          onClick={() => {
                            setShowAttachMenu(false);
                            setInputValue("");
                            addSystemMessage("Please upload your document or photo. I will run a line-by-line step-mark analysis to check steps and solution accuracy.", "Homework & Answer Audit Mode");
                            triggerFileUpload();
                          }}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-[#12271F] text-purple-400 group-hover:bg-[#1C382E] transition-colors active:scale-95">
                            <Folder size={26} />
                          </div>
                          <span className="text-[11px] sm:text-[12px] font-medium text-gray-300">Files</span>
                        </button>

                        {/* Drive */}
                        <button 
                          onClick={() => {
                            setShowAttachMenu(false);
                            setInputValue("");
                            addSystemMessage("Please select a file from Drive. I will run a line-by-line step-mark analysis to check steps and solution accuracy.", "Homework & Answer Audit Mode");
                            setShowDriveModal(true);
                          }}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-[#12271F] text-[#4ADE80] group-hover:bg-[#1C382E] transition-colors active:scale-95">
                            <HardDrive size={26} />
                          </div>
                          <span className="text-[11px] sm:text-[12px] font-medium text-gray-300">Drive</span>
                        </button>
                      </div>

                      {/* Bottom Section - Specialized Study Tools & Modes (Vertical List) */}
                      <div className="max-w-md mx-auto space-y-1 sm:space-y-2">
                        <button 
                          className="flex w-full items-center gap-4 rounded-2xl p-2 sm:p-3 hover:bg-white/5 transition-colors group text-left"
                          onClick={() => {
                            setShowAttachMenu(false);
                            setInputValue("");
                            setActiveMode("Visual & Diagram Mode");
                            setSelectedModel('image-generation-model');
                            addSystemMessage("What concept or word problem would you like me to visualize with a 2D/3D diagram?", "Visual Explainer & Diagram Mode");
                            handleSend("I am activating Visual & Diagram Mode.", true);
                            setTimeout(() => inputRef.current?.focus(), 50);
                          }}
                        >
                          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-[#12271F] text-blue-400">
                            <ImageIcon size={20} className="sm:h-6 sm:w-6" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] sm:text-[15px] font-semibold text-white">Images</span>
                            <span className="text-[12px] sm:text-[13px] text-gray-400">Create and edit</span>
                          </div>
                        </button>
                        
                        <button 
                          className="flex w-full items-center gap-4 rounded-2xl p-2 sm:p-3 hover:bg-white/5 transition-colors group text-left"
                          onClick={() => {
                            setShowAttachMenu(false);
                            setInputValue("");
                            setActiveMode("Canvas Mode");
                            setIsCanvasOpen(true);
                            addSystemMessage("**Interactive Canvas Workspace Activated!**\n\nI've opened a dedicated view for lengthy multi-step derivations, code debugging, or exam note drafting. What shall we work on?", "Canvas Mode");
                            handleSend("I am activating Canvas Mode.", true);
                            setTimeout(() => inputRef.current?.focus(), 50);
                          }}
                        >
                          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-[#12271F] text-yellow-400">
                            <Layout size={20} className="sm:h-6 sm:w-6" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] sm:text-[15px] font-semibold text-white">Canvas</span>
                            <span className="text-[12px] sm:text-[13px] text-gray-400">Code, write or make slides</span>
                          </div>
                        </button>

                        <button 
                          className="flex w-full items-center gap-4 rounded-2xl p-2 sm:p-3 hover:bg-white/5 transition-colors group text-left"
                          onClick={() => {
                            setShowAttachMenu(false);
                            setInputValue("");
                            setActiveMode("Guided Learning");
                            setSelectedModel('gemini-3.1-pro-preview'); // Socratic tutor mode is best with Pro
                            addSystemMessage("Which topic or chapter are we mastering today? (I will guide you step-by-step with interactive questions).", "Socratic Exam Tutor");
                            handleSend("I am activating Guided Learning Mode.", true);
                            setTimeout(() => inputRef.current?.focus(), 50);
                          }}
                        >
                          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-[#12271F] text-purple-400">
                            <GraduationCap size={20} className="sm:h-6 sm:w-6" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] sm:text-[15px] font-semibold text-white">Guided Learning</span>
                            <span className="text-[12px] sm:text-[13px] text-gray-400">Get step-by-step help</span>
                          </div>
                        </button>

                        <button 
                          className="flex w-full items-center gap-4 rounded-2xl p-2 sm:p-3 hover:bg-white/5 transition-colors group text-left"
                          onClick={() => {
                            setShowAttachMenu(false);
                            setInputValue("");
                            setActiveMode("Teaching Mode");
                            addSystemMessage("Initializing 1-on-1 AI Tutor...", "1-on-1 AI Tutor");
                            // Auto-send prompt to trigger 1-on-1 AI Tutor mode hiddenly
                            handleSend("I am activating Teaching Mode as my 1-on-1 AI Tutor to reach 100% mastery. Please begin by asking for my Class, Board/Exam, and Subject/Chapter.", true);
                          }}
                        >
                          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-[#12271F] text-[#4ADE80]">
                            <BrainCircuit size={20} className="sm:h-6 sm:w-6" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] sm:text-[15px] font-semibold text-white">Teaching Mode</span>
                            <span className="text-[12px] sm:text-[13px] text-gray-400">Proactive AI-led classroom</span>
                          </div>
                        </button>

                        <button 
                          className="flex w-full items-center gap-4 rounded-2xl p-2 sm:p-3 hover:bg-white/5 transition-colors group text-left"
                          onClick={() => {
                            setShowAttachMenu(false);
                            setInputValue("");
                            setActiveMode("Whiteboard & Video");
                            addSystemMessage("Visual Video & Whiteboard Explanation Mode active. Ask any math, physics, biology, or chemistry concept to see dynamic animations, timed whiteboard sequences, and cinematic video scenes.", "Whiteboard & Video Mode");
                            handleSend("Please explain with Visual Video & Whiteboard Explanation Mode: generate a dynamic Manim animation or SVG code, a timed [WHITEBOARD_SEQUENCE] step-by-step drawing with spoken narration, and a realistic [VIDEO_SCENE: ...] high-fidelity prompt for the visual engine.", true);
                          }}
                        >
                          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-[#12271F] text-cyan-400">
                            <Film size={20} className="sm:h-6 sm:w-6" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] sm:text-[15px] font-semibold text-white">Whiteboard & Video</span>
                            <span className="text-[12px] sm:text-[13px] text-gray-400">Timed steps & video scenes</span>
                          </div>
                        </button>
                      </div>
                      
                      {/* Extra spacing at the bottom for mobile safe area */}
                      <div className="h-4 w-full"></div>
                    </div>
                  </>
                )}
              </div>

              <input
                id="chat-input-field"
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  pendingAttachments.length > 0
                    ? 'Ask Examix AI about these files...'
                    : 'Ask Examix AI anything... (Formulas, concepts, diagrams)'
                }
                className="min-w-0 flex-1 bg-transparent px-1 sm:px-2 text-sm sm:text-base font-medium text-white outline-none placeholder:text-gray-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSend && !isSubmitting) {
                    handleSend();
                  }
                }}
              />

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 pr-0.5 sm:pr-1">
                {/* Real-time Animated Waveform Visualizer on Active Input */}
                {isListening && (
                  <div className="hidden sm:flex items-center gap-0.5 px-2 py-1 bg-black/40 rounded-full border border-blue-500/30 backdrop-blur-sm">
                    {waveformLevels.map((lvl, idx) => (
                      <span
                        key={idx}
                        className="w-0.5 sm:w-1 rounded-full bg-gradient-to-t from-blue-500 via-cyan-400 to-[#4ADE80] transition-all duration-100 ease-out"
                        style={{
                          height: `${Math.max(4, Math.min(18, (lvl / 100) * 18))}px`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Animated Waveform & Visual Pulse Container */}
                <div className="relative flex items-center justify-center">
                  {isListening && (
                    <>
                      {/* Outermost Concentric Pulse Ring 1 */}
                      <span className="pointer-events-none absolute -inset-2.5 rounded-full border border-blue-400/40 bg-blue-500/10 animate-mic-ring-1" />
                      {/* Inner Concentric Pulse Ring 2 */}
                      <span className="pointer-events-none absolute -inset-1.5 rounded-full border border-[#4ADE80]/50 bg-[#4ADE80]/15 animate-mic-ring-2" />
                      {/* Radiant Glow Aura */}
                      <span className="pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500/40 via-cyan-400/30 to-[#4ADE80]/40 blur-sm animate-mic-glow" />
                    </>
                  )}

                  <button
                    id="voice-mic-btn"
                    onClick={toggleListening}
                    className={`relative z-10 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full transition-all duration-300 cursor-pointer ${
                      isListening
                        ? 'bg-gradient-to-tr from-blue-600 via-cyan-500 to-[#4ADE80] text-black shadow-[0_0_20px_rgba(59,130,246,0.6)] scale-105'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                    title={isListening ? "Listening... Click to stop" : "Voice Input"}
                  >
                    <Mic 
                      size={18} 
                      className={`transition-all duration-200 ${
                        isListening 
                          ? 'text-black stroke-[2.5] animate-pulse' 
                          : 'text-gray-400'
                      }`} 
                    />
                  </button>
                </div>

                <button
                  id="send-message-btn"
                  className={`group flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-white transition-all ${
                    isSubmitting || !canSend
                      ? 'bg-[#12271F] text-gray-500 cursor-not-allowed opacity-50'
                      : 'bg-[#4ADE80] hover:bg-[#34d399] active:scale-95 text-black'
                  }`}
                  onClick={() => handleSend()}
                  disabled={isSubmitting || !canSend}
                  title="Send Message"
                >
                  {isSubmitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ArrowUp size={20} className="transition-transform group-hover:-translate-y-0.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="text-center text-[11px] text-gray-500">
              Examix AI can make mistakes. Verify critical exam facts, formulas, and derivations.
            </div></div></footer></div>

      {/* Interactive Canvas Workspace Panel */}
      {isCanvasOpen && (
        <div className="flex flex-1 flex-col h-screen border-l border-[#1C382E] bg-[#081511] overflow-hidden transition-all duration-300 z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between border-b border-[#1C382E]/50 bg-[#0A1713] px-6 h-16 shrink-0">
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                <Layout size={16} />
              </div>
              <h2 className="font-semibold text-[15px] tracking-wide text-gray-200">Interactive Canvas</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono font-bold text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/10 mr-2">Drafting Mode</span>
              <button 
                onClick={() => setIsCanvasOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Close Canvas"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-[#121212] relative custom-scrollbar">
            <Editor
              value={canvasText}
              onValueChange={code => setCanvasText(code)}
              highlight={code => Prism.highlight(code, Prism.languages.markdown || Prism.languages.javascript, 'markdown')}
              padding={24}
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: 13,
                lineHeight: 1.6,
                minHeight: '100%',
              }}
              className="text-gray-300 outline-none"
              textareaClassName="outline-none placeholder:text-gray-600"
              placeholder="# Scratchpad & Notes&#10;&#10;Use this workspace to draft multi-step derivations, take exam notes, or debug code alongside Examix.&#10;&#10;This space is persistent during your session..."
            />
          </div>
        </div>
      )}

      <MasteryDashboard 
        isOpen={showMasteryModal} 
        onClose={() => setShowMasteryModal(false)} 
        memory={conceptMemory} 
        onUpdateMemory={setConceptMemory}
        onQuizConcept={(concept) => {
          setShowMasteryModal(false);
          handleSend(`Pehle mujhe ${concept} ka quick 10-second Socratic memory recall check do taki mai ise master kar saku.`);
        }}
      />

      {/* Voice-to-Voice Mentor Learning Modal */}
      <VoiceMentorModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        modelId={selectedModel}
        memory={conceptMemory}
        onMasteryUpdate={(updates) => {
          setConceptMemory(prev => {
            const newMemory = [...prev];
            updates.forEach(u => {
              const conceptName = u.concept_evaluated || u.concept;
              let status = u.status;
              
              if (status === 'MASTERED') status = 'Mastered';
              if (status === 'REVISION_NEEDED') status = 'Needs Revision';
              if (status === 'CRITICAL_WEAKNESS') status = 'Critical Weakness';

              if (!conceptName || !status) return;
              
              const existing = newMemory.find(m => m.concept.toLowerCase() === conceptName.toLowerCase());
              if (existing) {
                existing.status = status;
                if (status === 'Mastered') {
                  existing.lastError = null;
                  existing.confidenceScore = 1.0;
                  showToast(`🎯 Concept Mastered: ${conceptName} is now 100/100!`);
                } else {
                  existing.lastError = u.last_error || existing.lastError || 'Needs Socratic drill';
                  existing.confidenceScore = status === 'Critical Weakness' ? 0.3 : 0.6;
                }
                existing.lastUpdated = Date.now();
              } else {
                newMemory.push({ 
                  concept: conceptName, 
                  topic: u.topic || 'General',
                  status, 
                  lastUpdated: Date.now(),
                  lastError: status === 'Mastered' ? null : (u.last_error || null),
                  confidenceScore: status === 'Mastered' ? 1.0 : (status === 'Critical Weakness' ? 0.3 : 0.6)
                });
                if (status === 'Mastered') {
                  showToast(`🎯 Concept Mastered: ${conceptName} is now 100/100!`);
                }
              }
            });
            return newMemory;
          });
        }}
        onSendVoiceMessageToChat={(userText, assistantReply) => {
          // Sync voice conversation to current chat session
          const userMsg: ChatMessage = {
            id: Math.random().toString(36).substring(2, 9),
            role: 'user',
            content: userText
          };
          const aiMsg: ChatMessage = {
            id: Math.random().toString(36).substring(2, 9),
            role: 'assistant',
            content: assistantReply,
            modelUsed: currentModelDef.name
          };

          let targetSessionId = currentSessionId;
          let updatedSessionList = [...sessions];

          if (!targetSessionId) {
            const newId = 'chat_' + Date.now();
            const detectedTag = detectSubjectTag(userText);
            const newSession: ChatSession = {
              id: newId,
              title: userText.length > 35 ? userText.substring(0, 35) + '...' : userText,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              messages: [userMsg, aiMsg],
              modelId: selectedModel,
              tag: detectedTag
            };
            setSessions([newSession, ...updatedSessionList]);
            setCurrentSessionId(newId);
          } else {
            setSessions((prev) =>
              prev.map((s) => {
                if (s.id === targetSessionId) {
                  return {
                    ...s,
                    updatedAt: Date.now(),
                    messages: [...s.messages, userMsg, aiMsg]
                  };
                }
                return s;
              })
            );
          }
        }}
      />

      {showDriveModal && (
        <DrivePickerModal
          onClose={() => setShowDriveModal(false)}
          onSelect={(files) => {
            const newAttachments = files.map(file => ({
              id: Math.random().toString(36).substring(2, 9),
              name: file.name,
              size: file.content.length || (file.dataUrl ? file.dataUrl.length : 0),
              type: file.mimeType,
              isImage: file.mimeType.startsWith('image/'),
              dataUrl: file.dataUrl || '',
              textContent: file.content
            }));
            setPendingAttachments(prev => [...prev, ...newAttachments]);
            setShowDriveModal(false);
          }}
        />
      )}

      {annotatingImage && (
        <ImageAnnotationModal
          isOpen={!!annotatingImage}
          onClose={() => setAnnotatingImage(null)}
          imageUrl={annotatingImage.dataUrl}
          initialMarkers={annotatingImage.markers || []}
          onSave={(markers) => {
            setPendingAttachments(prev => 
              prev.map(a => a.id === annotatingImage.id ? { ...a, markers } : a)
            );
          }}
        />
      )}

      {/* PDF Notes & School Handwritten Notes Hub (Slide Drawer) */}
      <PdfSlideModal
        isOpen={showPdfSlideModal}
        onClose={() => setShowPdfSlideModal(false)}
        currentSession={currentSession}
        messages={messages}
        onImportAndSendNotes={handleImportAndSendNotes}
        onExportPdf={handleExportChat}
        onShareSession={handleShareSession}
        isExporting={isExportingPDF}
      />

      {/* Settings & API Key Configuration Modal */}
      <ApiKeySettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        initialTab={settingsInitialTab}
        onSettingsSaved={() => showToast('Settings & API configuration saved')}
        hotwordSettings={hotwordSettings}
        onUpdateHotwordSettings={handleUpdateHotwordSettings}
        onOpenHotwordControlCenter={() => setShowHotwordModal(true)}
        onLaunchOledMode={() => setShowOledScreenOffMode(true)}
      />

      {/* Examix OS Multi-Hotword Matrix & Screen-Off Control Center */}
      <HotwordControlCenterModal
        isOpen={showHotwordModal}
        onClose={() => setShowHotwordModal(false)}
        settings={hotwordSettings}
        onUpdateSettings={handleUpdateHotwordSettings}
        onLaunchOledMode={() => setShowOledScreenOffMode(true)}
      />

      {/* OLED Deep-Black True Screen-Off Mode Canvas */}
      <ScreenOffOledOverlay
        isOpen={showOledScreenOffMode}
        onClose={() => {
          setShowOledScreenOffMode(false);
          setActiveWakeHotword(null);
        }}
        settings={hotwordSettings}
        onUpdateSettings={handleUpdateHotwordSettings}
        onProcessVoiceQuery={handleProcessScreenOffVoiceQuery}
        activeHotword={activeWakeHotword}
      />
    </div>
  );
}
