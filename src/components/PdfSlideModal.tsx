import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  UploadCloud,
  Download,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Send,
  Mic,
  BookOpen,
  PencilLine,
  FileCheck,
  HelpCircle,
  Layers,
  FileUp,
  Loader2,
  Trash2,
  Plus,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { ChatMessage, ChatSession, formatFileSize } from '../App';

export interface UploadedNoteFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  isPdf: boolean;
}

interface PdfSlideModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  onImportAndSendNotes: (payload: {
    files: UploadedNoteFile[];
    userPrompt: string;
    analysisPreset: string;
    launchVoiceTutor?: boolean;
  }) => Promise<void> | void;
  onExportPdf: (customSubject?: string, customTitle?: string) => Promise<void> | void;
  onShareSession?: () => void;
  isExporting: boolean;
}

const ANALYSIS_PRESETS = [
  {
    id: 'handwritten_ocr_structure',
    title: 'Transcribe & Format Handwritten Notes',
    desc: 'Converts messy handwriting into clean headings, structured bullet points & standard LaTeX math.',
    icon: PencilLine,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-400',
    prompt: 'Transcribe and organize these handwritten school notes into a clean, structured study guide with standard display LaTeX formulas ($$...$$), clear headings, and concise explanations.'
  },
  {
    id: 'trap_and_error_spotter',
    title: 'Spot Calculation Traps & Derivation Errors',
    desc: 'Scans your handwritten steps/homework for sign mistakes, formula errors, and unit traps.',
    icon: AlertTriangle,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:border-amber-400',
    prompt: 'Carefully examine every handwritten step in these notes/homework. Check for calculation mistakes, sign errors, wrong formula applications, or unit conversion traps, and provide the exact corrected step-by-step derivation.'
  },
  {
    id: 'exam_revision_sheet',
    title: 'Convert to 1-Page Exam Quick Revision Sheet',
    desc: 'Condenses raw lecture notes into Examix standardized 5-point high-yield cheat sheet.',
    icon: FileCheck,
    color: 'text-sky-400 border-sky-500/30 bg-sky-500/10 hover:border-sky-400',
    prompt: 'Convert these school notes into a standardized 1-Page Exam Quick Revision Sheet with: 1. Core Definition, 2. Mathematical Formula & Units, 3. Exam Traps, 4. Memory Lock Rules, and 5. Practice Problem.'
  },
  {
    id: 'solve_exercise_questions',
    title: 'Solve Questions & Numericals on Page',
    desc: 'Extracts all written problem statements/exercises and outputs full step-by-step solutions.',
    icon: HelpCircle,
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10 hover:border-purple-400',
    prompt: 'Identify all question statements, numericals, and practice exercises written in these school notes, and solve each of them with step-by-step working, formula citations, and highlighted final answers.'
  }
];

export default function PdfSlideModal({
  isOpen,
  onClose,
  currentSession,
  messages,
  onImportAndSendNotes,
  onExportPdf,
  onShareSession,
  isExporting
}: PdfSlideModalProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedNoteFile[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('handwritten_ocr_structure');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [launchVoice, setLaunchVoice] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [hasCopiedShare, setHasCopiedShare] = useState<boolean>(false);

  // Custom export form states
  const [exportSubject, setExportSubject] = useState<string>('');
  const [exportTitle, setExportTitle] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleShareClick = () => {
    if (onShareSession) {
      onShareSession();
      setHasCopiedShare(true);
      setTimeout(() => setHasCopiedShare(false), 2500);
    } else {
      const sessionId = currentSession?.id || Math.random().toString(36).substring(2, 9);
      const shareLink = `${window.location.origin}/share/${sessionId}`;
      navigator.clipboard.writeText(shareLink).then(() => {
        setHasCopiedShare(true);
        setTimeout(() => setHasCopiedShare(false), 2500);
      });
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessingFiles(true);

    const fileArray = Array.from(files);
    const promises = fileArray.map((file) => {
      return new Promise<UploadedNoteFile | null>((resolve) => {
        if (file.size > 25 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Please keep files under 25MB.`);
          resolve(null);
          return;
        }

        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isImg = file.type.startsWith('image/');

        if (!isPdf && !isImg) {
          alert(`Please upload PDF or image files (scanned notes, photos, handwritten notebooks).`);
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve({
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            size: file.size,
            type: isPdf ? 'application/pdf' : (file.type || 'image/jpeg'),
            dataUrl,
            isPdf
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then((results) => {
      const validFiles = results.filter((f): f is UploadedNoteFile => f !== null);
      setUploadedFiles((prev) => [...prev, ...validFiles]);
      setIsProcessingFiles(false);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

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
    if (e.dataTransfer?.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleSendToAI = async () => {
    if (uploadedFiles.length === 0 && !customPrompt.trim()) return;

    setIsSending(true);
    try {
      const activePresetObj = ANALYSIS_PRESETS.find((p) => p.id === selectedPreset);
      const effectivePrompt = customPrompt.trim()
        ? customPrompt.trim()
        : activePresetObj?.prompt || 'Please analyze these uploaded school notes.';

      await onImportAndSendNotes({
        files: uploadedFiles,
        userPrompt: effectivePrompt,
        analysisPreset: selectedPreset,
        launchVoiceTutor: launchVoice
      });

      // Clear state and close modal on successful dispatch
      setUploadedFiles([]);
      setCustomPrompt('');
      onClose();
    } catch (err) {
      console.error('Error submitting notes:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Stats calculation for active chat session
  const totalAssistantMessages = messages.filter((m) => m.role === 'assistant').length;
  const formulaCount = messages.reduce((acc, m) => {
    const displayMath = (m.content.match(/\$\$[\s\S]*?\$\$/g) || []).length;
    const inlineMath = (m.content.match(/\$[^$]+\$/g) || []).length;
    return acc + displayMath + inlineMath;
  }, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Glassmorphic Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
          />

          {/* Slide-over Drawer Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative z-10 flex h-full w-full max-w-2xl flex-col bg-[#081511] border-l border-[#1C382E] shadow-[-20px_0_50px_rgba(0,0,0,0.8)] text-white overflow-hidden"
          >
            {/* Slide Header */}
            <div className="flex items-center justify-between border-b border-[#1C382E]/70 px-6 py-4 bg-[#0D1C17]/90 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#4ADE80] to-emerald-300 shadow-[0_0_15px_rgba(74,222,128,0.3)]">
                  <FileText size={20} className="text-black font-bold" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                    PDF & Study Notes Hub
                    <span className="rounded-full bg-[#4ADE80]/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#4ADE80] border border-[#4ADE80]/30 uppercase">
                      OCR & LaTeX
                    </span>
                  </h2>
                  <p className="text-xs text-gray-400">Import school notes & export exam revision sheets</p>
                </div>
              </div>

              <button
                id="close-pdf-slide-btn"
                onClick={onClose}
                className="rounded-xl border border-[#1C382E] bg-white/5 p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                title="Close slide"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs & Side Share Button */}
            <div className="flex items-center justify-between border-b border-[#1C382E]/70 bg-[#0A1713] px-4 sm:px-6">
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  id="tab-import-school-notes"
                  onClick={() => setActiveTab('import')}
                  className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                    activeTab === 'import'
                      ? 'border-[#4ADE80] text-[#4ADE80] bg-[#4ADE80]/5'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                  title="Import Notes & Handwriting"
                >
                  <FileUp size={16} />
                  <span>Import Notes</span>
                  <span className="hidden sm:inline-block rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-bold text-emerald-400">
                    OCR
                  </span>
                </button>

                <button
                  id="tab-export-pdf-sheet"
                  onClick={() => setActiveTab('export')}
                  className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                    activeTab === 'export'
                      ? 'border-[#4ADE80] text-[#4ADE80] bg-[#4ADE80]/5'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                  title="Export Chat as PDF"
                >
                  <Download size={16} />
                  <span>Export PDF</span>
                  {messages.length > 0 && (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] font-semibold text-gray-300">
                      {messages.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Side Share Button right in the Hub tab bar */}
              <button
                id="hub-share-session-btn"
                onClick={handleShareClick}
                disabled={messages.length === 0}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                  hasCopiedShare
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                    : messages.length === 0
                    ? 'border-[#1C382E]/50 bg-white/5 text-gray-600 opacity-50 cursor-not-allowed'
                    : 'border-[#1C382E] bg-[#0D1C17] text-gray-200 hover:border-[#4ADE80]/60 hover:bg-[#12271F] hover:text-[#4ADE80] active:scale-95'
                }`}
                title={messages.length === 0 ? "No active chat to share" : "Share chat session link"}
              >
                {hasCopiedShare ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 size={14} className={messages.length > 0 ? "text-[#4ADE80]" : "text-gray-500"} />
                    <span>Share</span>
                  </>
                )}
              </button>
            </div>

            {/* Tab Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {activeTab === 'import' ? (
                /* TAB 1: IMPORT SCHOOL NOTES (PDF / HANDWRITING) */
                <div className="space-y-6">
                  {/* Informational Banner */}
                  <div className="rounded-2xl border border-[#4ADE80]/20 bg-gradient-to-r from-[#4ADE80]/10 via-emerald-950/20 to-transparent p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles size={18} className="text-[#4ADE80] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-white">AI Multimodal Handwriting & PDF Reader</h4>
                        <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                          Upload handwritten school notebooks, textbook exercise PDFs, blackboard scans, or tuition sheets. Examix AI automatically transcribes formulas into LaTeX, pinpoints calculation mistakes, and solves numericals.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Drag & Drop Upload Box */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                      isDragging
                        ? 'border-[#4ADE80] bg-[#4ADE80]/15 scale-[1.01]'
                        : 'border-[#1C382E] bg-[#0D1C17]/70 hover:border-[#4ADE80]/60 hover:bg-[#0D1C17]'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,image/*"
                      onChange={(e) => handleFiles(e.target.files)}
                      className="hidden"
                    />

                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4ADE80]/15 text-[#4ADE80] group-hover:scale-110 transition-transform">
                      {isProcessingFiles ? (
                        <Loader2 size={28} className="animate-spin text-[#4ADE80]" />
                      ) : (
                        <UploadCloud size={28} />
                      )}
                    </div>

                    <h4 className="text-base font-semibold text-white">
                      Drop school notes PDF or handwritten photos here
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm">
                      Supports PDF documents, scanned notebooks, classroom blackboard photos (<span className="text-emerald-400 font-medium">up to 25MB</span>)
                    </p>

                    <button
                      type="button"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-[#4ADE80] hover:text-black px-4 py-2 text-xs font-bold text-white transition-all shadow-sm"
                    >
                      <Plus size={14} />
                      <span>Browse School Notes (PDF / Photos)</span>
                    </button>
                  </div>

                  {/* Uploaded Files Tray */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-400 font-medium px-1">
                        <span>Attached Notes ({uploadedFiles.length})</span>
                        <button
                          type="button"
                          onClick={() => setUploadedFiles([])}
                          className="text-red-400 hover:underline cursor-pointer"
                        >
                          Clear all
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {uploadedFiles.map((file) => (
                          <div
                            key={file.id}
                            className="relative flex items-center gap-3 rounded-xl border border-[#1C382E] bg-[#0D1C17] p-3 shadow-sm group hover:border-[#4ADE80]/40 transition-all"
                          >
                            {file.isPdf ? (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-400 font-bold text-xs border border-red-500/30">
                                PDF
                              </div>
                            ) : (
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                                <img
                                  src={file.dataUrl}
                                  alt={file.name}
                                  className="h-full w-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-gray-200" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {formatFileSize(file.size)} • {file.isPdf ? 'PDF Document' : 'Photo Note'}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(file.id);
                              }}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-red-400 transition-colors cursor-pointer"
                              title="Remove file"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Analysis Presets */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Choose AI Action for These Notes:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {ANALYSIS_PRESETS.map((preset) => {
                        const Icon = preset.icon;
                        const isSelected = selectedPreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setSelectedPreset(preset.id)}
                            className={`flex flex-col text-left rounded-2xl border p-3.5 transition-all cursor-pointer relative ${
                              isSelected
                                ? 'border-[#4ADE80] bg-[#4ADE80]/15 shadow-[0_0_16px_rgba(74,222,128,0.2)]'
                                : 'border-[#1C382E] bg-[#0D1C17] hover:border-white/20 hover:bg-[#12271F]'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1.5">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
                                    isSelected
                                      ? 'border-[#4ADE80] bg-[#4ADE80]/20 text-[#4ADE80]'
                                      : 'border-white/10 bg-white/5 text-gray-300'
                                  }`}
                                >
                                  <Icon size={14} />
                                </div>
                                <span
                                  className={`text-xs font-bold ${
                                    isSelected ? 'text-[#4ADE80]' : 'text-gray-200'
                                  }`}
                                >
                                  {preset.title}
                                </span>
                              </div>
                              {isSelected && <CheckCircle2 size={14} className="text-[#4ADE80]" />}
                            </div>
                            <p className="text-[11px] text-gray-400 leading-snug">{preset.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Prompt / Student Doubt Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                      <span>Specific Doubt / Custom Instruction (Optional):</span>
                      <span className="text-[11px] font-normal text-gray-500">Hinglish / Hindi / English</span>
                    </label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="e.g., Sir, please check the derivation on page 2 and explain why minus sign appears in step 3... or convert these into high-scoring exam notes."
                      rows={3}
                      className="w-full rounded-xl border border-[#1C382E] bg-[#0D1C17] px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:border-[#4ADE80] focus:outline-none focus:ring-1 focus:ring-[#4ADE80] transition-all resize-none"
                    />
                  </div>

                  {/* Voice Mentor Toggle */}
                  <div className="flex items-center justify-between rounded-xl border border-[#1C382E] bg-[#0D1C17] p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                        <Mic size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-200">1-on-1 Voice Mentor Explainer</p>
                        <p className="text-[11px] text-gray-400">
                          Automatically launch voice audio session after notes are ingested
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={launchVoice}
                        onChange={(e) => setLaunchVoice(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4ADE80]"></div>
                    </label>
                  </div>

                  {/* Primary Send Button */}
                  <button
                    id="submit-school-notes-btn"
                    type="button"
                    onClick={handleSendToAI}
                    disabled={isSending || (uploadedFiles.length === 0 && !customPrompt.trim())}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      uploadedFiles.length === 0 && !customPrompt.trim()
                        ? 'border border-white/10 bg-white/5 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#4ADE80] to-emerald-400 text-black hover:brightness-110 active:scale-[0.99] shadow-[0_0_20px_rgba(74,222,128,0.35)]'
                    }`}
                  >
                    {isSending ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-black" />
                        <span>Processing & Sending Notes...</span>
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        <span>Send School Notes to Examix AI</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* TAB 2: EXPORT CHAT AS PDF REVISION SHEET */
                <div className="space-y-6">
                  {/* Overview Card */}
                  <div className="rounded-2xl border border-[#1C382E] bg-[#0D1C17] p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          Active Chat Session
                        </span>
                        <h4 className="text-sm font-bold text-white mt-0.5">
                          {currentSession?.title || 'Current Study Session'}
                        </h4>
                      </div>
                      <span className="rounded-full bg-white/5 border border-[#1C382E] px-2.5 py-1 text-xs text-gray-300 font-medium">
                        {messages.length} Messages
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Tutor Answers</p>
                        <p className="text-lg font-bold text-white mt-0.5">{totalAssistantMessages}</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">LaTeX Formulas</p>
                        <p className="text-lg font-bold text-[#4ADE80] mt-0.5">{formulaCount}</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Format</p>
                        <p className="text-lg font-bold text-sky-400 mt-0.5">A4 Clean PDF</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Share Link Box */}
                  <div className="rounded-2xl border border-[#1C382E] bg-gradient-to-r from-[#0D1C17] via-[#12271F] to-[#0D1C17] p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30">
                        <Share2 size={16} />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-white truncate">Share Study Session Link</h5>
                        <p className="text-[11px] text-gray-400 truncate">Share notes & LaTeX formulas with classmates</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleShareClick}
                      disabled={messages.length === 0}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        hasCopiedShare
                          ? 'bg-emerald-400 text-black font-bold'
                          : messages.length === 0
                          ? 'bg-white/5 text-gray-600 cursor-not-allowed opacity-50'
                          : 'bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/40 hover:bg-[#4ADE80] hover:text-black active:scale-95'
                      }`}
                    >
                      {hasCopiedShare ? (
                        <>
                          <Check size={13} />
                          <span>Copied Link!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Export Customization Inputs */}
                  <div className="space-y-4 rounded-2xl border border-[#1C382E] bg-[#0D1C17] p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      PDF Document Details:
                    </h4>

                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-300 font-medium">Subject / Target Exam Tag:</label>
                      <input
                        type="text"
                        value={exportSubject}
                        onChange={(e) => setExportSubject(e.target.value)}
                        placeholder="e.g., Physics - Class 12 / JEE Main & NEET"
                        className="w-full rounded-xl border border-[#1C382E] bg-[#081511] px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-[#4ADE80] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-300 font-medium">Revision Sheet Title:</label>
                      <input
                        type="text"
                        value={exportTitle}
                        onChange={(e) => setExportTitle(e.target.value)}
                        placeholder={currentSession?.title || 'Exam Quick Revision Sheet'}
                        className="w-full rounded-xl border border-[#1C382E] bg-[#081511] px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-[#4ADE80] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Export Feature Bullets */}
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-4 space-y-2">
                    <p className="text-xs font-semibold text-gray-200">What is included in the exported PDF:</p>
                    <ul className="text-[11px] text-gray-400 space-y-1 list-disc list-inside">
                      <li>Standardized high-yield Exam Revision layout with 5 core sections.</li>
                      <li>Clean printable mathematical symbols and fractions.</li>
                      <li>Highlighting for Exam Traps and Socratic practice problems.</li>
                    </ul>
                  </div>

                  {/* Primary Export Button */}
                  <button
                    id="confirm-export-pdf-btn"
                    type="button"
                    onClick={() => onExportPdf(exportSubject, exportTitle)}
                    disabled={isExporting || messages.length === 0}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      messages.length === 0
                        ? 'border border-white/10 bg-white/5 text-gray-500 cursor-not-allowed'
                        : 'bg-[#4ADE80] text-black hover:bg-emerald-300 active:scale-[0.99] shadow-[0_0_20px_rgba(74,222,128,0.3)]'
                    }`}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-black" />
                        <span>Generating Exam Sheet PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        <span>Download High-Yield PDF Sheet</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
