import { useState } from 'react';
import { 
  X, 
  Network, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  BrainCircuit, 
  Target, 
  Upload, 
  ShieldAlert, 
  TrendingUp, 
  Sparkles,
  Cloud,
  Check,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  Zap,
  BookOpen,
  FileCode,
  ArrowRight
} from 'lucide-react';

export interface ConceptMastery {
  concept: string;
  topic?: string;
  status: 'Mastered' | 'Needs Revision' | 'Critical Weakness';
  lastUpdated: number;
  lastError?: string | null;
  confidenceScore?: number;
}

interface IngestionReport {
  topicsCovered: string[];
  identifiedWeaknesses: string[];
  learningLevel?: string;
  recommendedNextFocus?: string;
  extractedConceptsCount: number;
}

interface MasteryDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  memory: ConceptMastery[];
  onUpdateMemory?: (newMemory: ConceptMastery[]) => void;
}

export default function MasteryDashboard({ isOpen, onClose, memory, onUpdateMemory }: MasteryDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'graph' | 'errors' | 'sync'>('overview');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  
  // Drive Sync State
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('examix_auto_sync_drive');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');

  // Gemini Chat Link Ingestion State
  const [geminiLink, setGeminiLink] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestionError, setIngestionError] = useState<string | null>(null);
  const [ingestionReport, setIngestionReport] = useState<IngestionReport | null>(null);

  if (!isOpen) return null;

  // Calculate metrics
  const masteredCount = memory.filter(m => m.status === 'Mastered').length;
  const revisionCount = memory.filter(m => m.status === 'Needs Revision').length;
  const weakCount = memory.filter(m => m.status === 'Critical Weakness').length;
  const totalConcepts = memory.length;

  // Calculate Exam Readiness Index (0 to 100)
  const readinessIndex = totalConcepts > 0 
    ? Math.min(100, Math.round(((masteredCount * 1.0 + revisionCount * 0.5 + weakCount * 0.1) / totalConcepts) * 100))
    : 78; // Initial baseline readiness

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Mastered': return 'text-[#4ADE80] bg-[#4ADE80]/10 border-[#4ADE80]/30';
      case 'Needs Revision': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'Critical Weakness': return 'text-red-400 bg-red-400/10 border-red-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Mastered': return <CheckCircle size={14} className="text-[#4ADE80]" />;
      case 'Needs Revision': return <AlertTriangle size={14} className="text-yellow-400" />;
      case 'Critical Weakness': return <XCircle size={14} className="text-red-400" />;
      default: return null;
    }
  };

  // Toggle Auto-Sync
  const handleToggleAutoSync = () => {
    const nextVal = !isAutoSyncEnabled;
    setIsAutoSyncEnabled(nextVal);
    try {
      localStorage.setItem('examix_auto_sync_drive', JSON.stringify(nextVal));
    } catch (e) {}
    setCopiedNotification(nextVal ? 'Auto-Sync to Google Drive enabled' : 'Auto-Sync paused');
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  // Import student profile JSON backup file
  const handleImportProfileFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        const importedGraph = parsed.knowledgeGraph || (Array.isArray(parsed) ? parsed : null);

        if (importedGraph && Array.isArray(importedGraph) && onUpdateMemory) {
          // Merge with existing
          const merged = [...memory];
          importedGraph.forEach((item: ConceptMastery) => {
            const idx = merged.findIndex(m => m.concept.toLowerCase() === item.concept.toLowerCase());
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...item, lastUpdated: Date.now() };
            } else {
              merged.push({ ...item, lastUpdated: Date.now() });
            }
          });

          onUpdateMemory(merged);
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          setCopiedNotification(`Successfully restored ${importedGraph.length} concepts from student_profile.json!`);
          setTimeout(() => setCopiedNotification(null), 3000);
        } else {
          alert('Invalid student_profile.json format.');
        }
      } catch (err) {
        alert('Could not parse student_profile.json. Please check the file.');
      }
    };
    reader.readAsText(file);
  };

  // Ingest Gemini Shared Chat Link or Pasted Conversation
  const handleIngestGeminiChat = async () => {
    if (!geminiLink.trim()) return;

    setIsIngesting(true);
    setIngestionError(null);
    setIngestionReport(null);

    try {
      const res = await fetch('/api/import-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          link: geminiLink.trim(),
          rawText: geminiLink.includes('http') ? undefined : geminiLink.trim()
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to ingest shared chat link.');
      }

      const data = await res.json();
      const profile = data.profile;

      if (profile && profile.extractedConcepts && Array.isArray(profile.extractedConcepts)) {
        // Merge into persistent memory
        const currentList = [...memory];
        const newConcepts: ConceptMastery[] = profile.extractedConcepts.map((ec: any) => ({
          concept: ec.concept || 'Unnamed Concept',
          topic: ec.topic || 'Imported Subject',
          status: ec.status || 'Needs Revision',
          lastUpdated: Date.now(),
          lastError: ec.lastError || null,
          confidenceScore: ec.confidenceScore || 0.8
        }));

        newConcepts.forEach((nc) => {
          const existingIdx = currentList.findIndex(m => m.concept.toLowerCase() === nc.concept.toLowerCase());
          if (existingIdx >= 0) {
            currentList[existingIdx] = {
              ...currentList[existingIdx],
              ...nc,
              lastUpdated: Date.now()
            };
          } else {
            currentList.push(nc);
          }
        });

        if (onUpdateMemory) {
          onUpdateMemory(currentList);
        }

        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setIngestionReport({
          topicsCovered: profile.topicsCovered || [],
          identifiedWeaknesses: profile.identifiedWeaknesses || [],
          learningLevel: profile.learningLevel,
          recommendedNextFocus: profile.recommendedNextFocus,
          extractedConceptsCount: newConcepts.length
        });

        setCopiedNotification(`Ingested ${newConcepts.length} concepts into student_profile.json!`);
        setTimeout(() => setCopiedNotification(null), 3500);
        setGeminiLink('');
      } else {
        throw new Error('Could not extract valid concepts from the chat data.');
      }
    } catch (err: any) {
      console.error('Ingestion error:', err);
      setIngestionError(err.message || 'Error parsing chat. You can also paste the transcript directly.');
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-3xl border border-white/10 bg-[#0F1117] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
              <Network size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Knowledge Graph & Memory
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Target 100/100
                </span>
              </h2>
              <p className="text-xs text-gray-400">Persistent cross-session cognitive retention & Drive synchronization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 px-4 sm:px-5 pt-3 pb-2 border-b border-white/5 bg-[#141822] overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <TrendingUp size={13} />
            Readiness & Metrics
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'graph'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <BrainCircuit size={13} />
            Mastery Matrix ({memory.length})
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'errors'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ShieldAlert size={13} />
            Error Log ({weakCount + revisionCount})
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sync'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Cloud size={13} />
            Drive & Profile Sync
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          
          {/* TAB 1: OVERVIEW & READINESS */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Exam Readiness Index Banner */}
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-950/40 via-[#1A1D2B] to-[#0F1117] p-5 sm:p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={18} className="text-[#4ADE80]" />
                      <span className="text-xs font-bold uppercase tracking-widest text-[#4ADE80]">Target Score: 100/100</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white">Exam Readiness Index</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm">
                      Real-time cognitive evaluation based on step accuracy, prerequisite retention, and formula recall.
                    </p>
                  </div>
                  
                  {/* Gauge */}
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-black/40 border border-white/10 min-w-[120px]">
                    <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#4ADE80] to-emerald-400">
                      {readinessIndex}%
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mt-0.5">Readiness Score</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-5 w-full bg-black/60 rounded-full h-2.5 overflow-hidden border border-white/10">
                  <div 
                    className="bg-gradient-to-r from-purple-500 via-[#4ADE80] to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${readinessIndex}%` }}
                  />
                </div>
              </div>

              {/* Three Stat Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-1">
                    <CheckCircle size={14} /> Mastered
                  </div>
                  <span className="text-2xl font-bold text-white">{masteredCount}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">High confidence</span>
                </div>

                <div className="p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 flex flex-col">
                  <div className="flex items-center gap-1.5 text-xs text-yellow-400 font-semibold mb-1">
                    <AlertTriangle size={14} /> Review Needed
                  </div>
                  <span className="text-2xl font-bold text-white">{revisionCount}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">Minor hesitations</span>
                </div>

                <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 flex flex-col">
                  <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold mb-1">
                    <XCircle size={14} /> Weak Areas
                  </div>
                  <span className="text-2xl font-bold text-white">{weakCount}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5">High priority</span>
                </div>
              </div>

              {/* Proactive Mentor Notice */}
              <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/10 flex items-start gap-3">
                <Sparkles size={18} className="text-purple-400 shrink-0 mt-0.5" />
                <div className="text-xs text-gray-300">
                  <span className="font-bold text-purple-300">Cross-Session Retention Active:</span> Examix AI uses this graph to proactively test prerequisite formulas and prevent learning fatigue.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KNOWLEDGE GRAPH MATRIX */}
          {activeTab === 'graph' && (
            <div>
              {memory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
                  <BrainCircuit size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-medium text-gray-300">No Concepts Mapped Yet</p>
                  <p className="text-xs mt-1 max-w-xs">Start a teaching session or import a Gemini chat link to populate your knowledge graph!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {memory.map((item, idx) => (
                    <div key={idx} className={`flex items-start justify-between p-4 rounded-2xl border transition-all hover:bg-white/5 ${getStatusColor(item.status)}`}>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white mb-0.5">{item.concept}</span>
                        {item.topic && <span className="text-[10px] text-gray-400 mb-1">{item.topic}</span>}
                        <span className="text-xs flex items-center gap-1.5 opacity-90 font-medium">
                          {getStatusIcon(item.status)} {item.status}
                        </span>
                      </div>
                      <div className="text-[10px] opacity-50 font-medium">
                        {new Date(item.lastUpdated).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ERROR LOG */}
          {activeTab === 'errors' && (
            <div className="space-y-3">
              {memory.filter(m => m.status !== 'Mastered').length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
                  <CheckCircle size={48} className="mb-3 text-[#4ADE80] opacity-80" />
                  <p className="text-sm font-bold text-white">Clean Record! 0 Critical Errors</p>
                  <p className="text-xs mt-1 text-gray-400">All evaluated topics currently meet 100/100 mastery standards.</p>
                </div>
              ) : (
                memory.filter(m => m.status !== 'Mastered').map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        {item.concept}
                      </span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                        {item.status}
                      </span>
                    </div>
                    {item.lastError && (
                      <p className="text-xs text-gray-300 bg-black/40 p-2.5 rounded-xl border border-white/5 font-mono">
                        ⚠️ Logged Trap: {item.lastError}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-400">
                      💡 Examix AI will deliver a 30-second Socratic remediation before testing this concept again.
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: DRIVE & PROFILE SYNC (ULTRA-CLEAN UI & GEMINI CHAT INGESTOR) */}
          {activeTab === 'sync' && (
            <div className="space-y-5">
              
              {/* Ultra-Clean Sync Status & Auto-Sync Card */}
              <div className="p-5 rounded-3xl border border-white/10 bg-gradient-to-br from-[#161822] to-[#0E1017] shadow-xl space-y-4">
                
                {/* Header & Connection Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                      <Cloud size={22} className="animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">Google Drive Profile Sync</h4>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                          Encrypted & Connected
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Target File: <span className="font-mono text-purple-300 font-semibold">student_profile.json</span>
                      </p>
                    </div>
                  </div>

                  {/* Sync Status Badge */}
                  <div className="flex items-center gap-2 self-start sm:self-auto bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-gray-300">
                    <RefreshCw size={13} className="text-[#4ADE80]" />
                    <span>Synced {lastSyncTime}</span>
                  </div>
                </div>

                {/* Status Grid & Auto-Sync Toggle */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-4 text-xs text-gray-300 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5">
                      <Zap size={14} className="text-[#4ADE80]" />
                      <span>{memory.length} Knowledge Nodes Tracked</span>
                    </div>
                  </div>

                  {/* Auto-Sync Toggle Control */}
                  <div className="flex items-center justify-between w-full sm:w-auto gap-3 bg-white/5 px-3.5 py-2 rounded-2xl border border-white/10">
                    <div className="text-left">
                      <span className="text-xs font-semibold text-white block">Auto-Sync</span>
                      <span className="text-[10px] text-gray-400">Sync after every turn</span>
                    </div>
                    <button
                      onClick={handleToggleAutoSync}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        isAutoSyncEnabled ? 'bg-[#4ADE80]' : 'bg-gray-700'
                      }`}
                      title={isAutoSyncEnabled ? 'Disable Auto-Sync' : 'Enable Auto-Sync'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                          isAutoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {copiedNotification && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                    <Check size={14} className="shrink-0" /> {copiedNotification}
                  </div>
                )}
              </div>

              {/* GEMINI SHARED CHAT LINK & PROFILE INGESTOR MODULE */}
              <div className="p-5 rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-950/20 via-[#131520] to-[#0E1017] shadow-xl space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      <LinkIcon size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        Import Profile & Gemini Chat History
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          AI Parser
                        </span>
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Paste a public Gemini share link or upload a <code className="text-gray-300">student_profile.json</code> backup to merge past learnings.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Link Ingestion Input */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={geminiLink}
                        onChange={(e) => setGeminiLink(e.target.value)}
                        placeholder="https://gemini.google.com/share/... or paste transcript"
                        className="w-full rounded-xl border border-white/15 bg-black/60 px-3.5 py-2.5 text-xs text-gray-200 placeholder-gray-500 focus:border-purple-400 focus:outline-none transition-all font-mono"
                        disabled={isIngesting}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleIngestGeminiChat();
                        }}
                      />
                    </div>

                    <button
                      onClick={handleIngestGeminiChat}
                      disabled={isIngesting || !geminiLink.trim()}
                      className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        isIngesting || !geminiLink.trim()
                          ? 'bg-purple-600/40 text-purple-300/50 cursor-not-allowed border border-white/5'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 active:scale-95 cursor-pointer border border-purple-400/40'
                      }`}
                    >
                      {isIngesting ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-purple-200" />
                          <span>Parsing Insights...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          <span>Ingest & Sync</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Or file upload fallback */}
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                    <span>Have a local backup file?</span>
                    <label className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-semibold cursor-pointer underline underline-offset-4">
                      <Upload size={12} />
                      Browse `student_profile.json`
                      <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleImportProfileFile} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

                {/* Error Banner */}
                {ingestionError && (
                  <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{ingestionError}</span>
                  </div>
                )}

                {/* Ingestion Report Card */}
                {ingestionReport && (
                  <div className="mt-4 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                        <CheckCircle size={15} />
                        Successfully Extracted & Merged {ingestionReport.extractedConceptsCount} Knowledge Graph Nodes!
                      </div>
                      <span className="text-[10px] text-gray-400">Synced to Drive</span>
                    </div>

                    {/* Topics Covered */}
                    {ingestionReport.topicsCovered.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen size={12} className="text-purple-400" />
                          Topics & Chapters Ingested:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {ingestionReport.topicsCovered.map((topic, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-medium">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Identified Weaknesses */}
                    {ingestionReport.identifiedWeaknesses.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldAlert size={12} />
                          Flagged Weaknesses & Calculation Traps:
                        </span>
                        <div className="space-y-1">
                          {ingestionReport.identifiedWeaknesses.map((weak, i) => (
                            <div key={i} className="text-xs text-gray-300 bg-black/40 px-2.5 py-1.5 rounded-lg border border-red-500/20 font-mono flex items-start gap-1.5">
                              <span className="text-red-400 shrink-0">⚠️</span>
                              <span>{weak}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Learning Level & Next Tutoring Focus */}
                    {ingestionReport.recommendedNextFocus && (
                      <div className="text-xs text-gray-300 bg-white/5 p-2.5 rounded-xl border border-white/10 flex items-start gap-2">
                        <ArrowRight size={14} className="text-[#4ADE80] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[#4ADE80]">Adaptive Tutoring Strategy:</span> Upcoming Examix sessions will automatically reinforce these weak areas before unlocking new derivations.
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 text-xs text-gray-400 text-center flex items-center justify-center gap-2">
          <BrainCircuit size={14} className="text-[#4ADE80]" />
          Adaptive Socratic Mentor active. Aiming for 100/100 perfection on every topic.
        </div>
      </div>
    </div>
  );
}
