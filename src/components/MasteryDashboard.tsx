import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { safeFetchJson } from '../lib/apiClient';
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
  ArrowRight,
  Plus,
  RotateCcw,
  Download,
  Database,
  Flame,
  Award,
  PartyPopper,
  ShieldCheck
} from 'lucide-react';
import { 
  syncToDrive, 
  loadFromDrive, 
  loadLocalCognitiveGraph, 
  saveLocalCognitiveGraph, 
  StudentCognitiveGraph 
} from '../utils/neuroSyncEngine';

/**
 * Multi-cannon celebratory confetti burst for 3+ streaks
 */
export function runStreakConfetti() {
  try {
    // Left cannon
    confetti({
      particleCount: 70,
      angle: 60,
      spread: 55,
      origin: { x: 0.1, y: 0.7 },
      zIndex: 10000,
      colors: ['#4ADE80', '#FBBF24', '#A855F7', '#38BDF8', '#F43F5E']
    });
    // Right cannon
    confetti({
      particleCount: 70,
      angle: 120,
      spread: 55,
      origin: { x: 0.9, y: 0.7 },
      zIndex: 10000,
      colors: ['#4ADE80', '#FBBF24', '#A855F7', '#38BDF8', '#F43F5E']
    });
    // Center burst with golden stars & sparkles
    setTimeout(() => {
      confetti({
        particleCount: 110,
        spread: 100,
        origin: { x: 0.5, y: 0.45 },
        zIndex: 10000,
        decay: 0.92,
        scalar: 1.15,
        colors: ['#FFD700', '#F59E0B', '#10B981', '#6366F1', '#EC4899']
      });
    }, 180);
  } catch (err) {
    console.warn('Confetti execution notice:', err);
  }
}

/**
 * Web Audio Harmonic Fanfare Chime
 */
export function playStreakCelebrationFanfare() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    // Harmonic notes: C5, E5, G5, C6 (Ascending victory fanfare)
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.16 }, // C5
      { freq: 659.25, time: 0.10, dur: 0.16 }, // E5
      { freq: 783.99, time: 0.20, dur: 0.20 }, // G5
      { freq: 1046.50, time: 0.32, dur: 0.55 } // C6
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + time);
      
      gain.gain.setValueAtTime(0.0001, now + time);
      gain.gain.exponentialRampToValueAtTime(0.2, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + time);
      osc.stop(now + time + dur + 0.05);
    });
  } catch {
    // Audio Context might be locked before first user gesture
  }
}

export interface ConceptMastery {
  concept: string;
  topic?: string;
  status: 'Mastered' | 'Needs Revision' | 'Critical Weakness';
  lastUpdated: number;
  last_tested_date?: string | number;
  streak_count?: number;
  retention_level?: 'FRESH' | 'WARM' | 'DECAYED' | 'PERMANENT_LOCK';
  lastError?: string | null;
  confidenceScore?: number;
}

export function getConceptRetentionInfo(item: ConceptMastery) {
  const now = Date.now();
  const lastTested = item.last_tested_date 
    ? (typeof item.last_tested_date === 'string' ? new Date(item.last_tested_date).getTime() : item.last_tested_date)
    : (item.lastUpdated || now);
  const daysElapsed = Math.max(0, Math.floor((now - lastTested) / (1000 * 60 * 60 * 24)));
  const streak = item.streak_count || 0;

  let level: 'FRESH' | 'WARM' | 'DECAYED' | 'PERMANENT_LOCK' = item.retention_level || 'FRESH';
  let nextReviewDays = 0;

  if (streak >= 3 || level === 'PERMANENT_LOCK') {
    level = 'PERMANENT_LOCK';
    nextReviewDays = Math.max(0, 30 - daysElapsed);
  } else if (daysElapsed > 14) {
    level = 'DECAYED';
    nextReviewDays = 0;
  } else if (daysElapsed > 3) {
    level = 'WARM';
    nextReviewDays = Math.max(0, 7 - daysElapsed);
  } else {
    level = 'FRESH';
    nextReviewDays = Math.max(0, 4 - daysElapsed);
  }

  return { level, daysElapsed, streak, nextReviewDays, lastTested };
}

interface IngestionReport {
  topicsCovered: string[];
  identifiedWeaknesses: string[];
  learningLevel?: string;
  recommendedNextFocus?: string;
  extractedConceptsCount: number;
}

export interface MasteryDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  memory: ConceptMastery[];
  onUpdateMemory?: (newMemory: ConceptMastery[]) => void;
  onQuizConcept?: (concept: string) => void;
}

export default function MasteryDashboard({ isOpen, onClose, memory, onUpdateMemory, onQuizConcept }: MasteryDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'graph' | 'errors' | 'sync'>('overview');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [errorFilter, setErrorFilter] = useState<'all' | 'Needs Revision' | 'Critical Weakness'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newConcept, setNewConcept] = useState('');
  const [newTopic, setNewTopic] = useState('Physics / General');
  const [newTrap, setNewTrap] = useState('');
  const [newStatus, setNewStatus] = useState<'Needs Revision' | 'Critical Weakness'>('Needs Revision');
  
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
  const [isSyncingToDrive, setIsSyncingToDrive] = useState(false);
  const [isLoadingFromDrive, setIsLoadingFromDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  // Gemini Chat Link Ingestion State
  const [geminiLink, setGeminiLink] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestionError, setIngestionError] = useState<string | null>(null);
  const [ingestionReport, setIngestionReport] = useState<IngestionReport | null>(null);

  // Celebratory 3+ Streak Animation State
  const [celebrationData, setCelebrationData] = useState<{ concept: string; streak: number } | null>(null);
  const prevStreaksRef = useRef<Record<string, number>>({});

  const triggerStreakCelebration = (conceptName: string, streakCount: number) => {
    setCelebrationData({ concept: conceptName, streak: streakCount });
    runStreakConfetti();
    playStreakCelebrationFanfare();
  };

  // Watch for background or external mastery/streak increases reaching 3+
  useEffect(() => {
    memory.forEach(item => {
      const prev = prevStreaksRef.current[item.concept] ?? item.streak_count ?? 0;
      const current = item.streak_count ?? 0;
      if (prev < 3 && current >= 3) {
        triggerStreakCelebration(item.concept, current);
      }
      prevStreaksRef.current[item.concept] = current;
    });
  }, [memory]);

  if (!isOpen) return null;

  // Calculate metrics
  const masteredCount = memory.filter(m => m.status === 'Mastered').length;
  const revisionCount = memory.filter(m => m.status === 'Needs Revision').length;
  const weakCount = memory.filter(m => m.status === 'Critical Weakness').length;
  const totalConcepts = memory.length;

  // 1-Click Sync to Google Drive
  const handleSyncToDriveAction = async () => {
    setIsSyncingToDrive(true);
    setDriveError(null);
    try {
      // Build updated graph from memory
      const currentGraph = loadLocalCognitiveGraph();
      memory.forEach(m => {
        const id = m.concept.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (currentGraph.concept_nodes[id]) {
          currentGraph.concept_nodes[id].mastery_score = m.status === 'Mastered' ? 100 : (m.status === 'Critical Weakness' ? 40 : 65);
          currentGraph.concept_nodes[id].status = m.status === 'Mastered' ? (m.streak_count && m.streak_count >= 3 ? 'MASTERED_LOCKED' : 'MASTERED') : (m.status === 'Critical Weakness' ? 'CRITICAL_WEAKNESS' : 'NEEDS_REVISION');
          currentGraph.concept_nodes[id].streak_count = m.streak_count || 0;
          if (m.lastError) currentGraph.concept_nodes[id].known_traps = Array.from(new Set([...currentGraph.concept_nodes[id].known_traps, m.lastError]));
        } else {
          currentGraph.concept_nodes[id] = {
            id,
            name: m.concept,
            topic: m.topic || 'General',
            mastery_score: m.status === 'Mastered' ? 100 : 50,
            retention_strength: m.status === 'Mastered' ? 0.95 : 0.45,
            decay_interval_days: m.status === 'Mastered' ? 15 : 2,
            last_reviewed_timestamp: new Date().toISOString(),
            decay_due_date: new Date(Date.now() + (m.status === 'Mastered' ? 15 : 2) * 86400000).toISOString(),
            known_traps: m.lastError ? [m.lastError] : [],
            streak_count: m.streak_count || (m.status === 'Mastered' ? 1 : 0),
            status: m.status === 'Mastered' ? 'MASTERED' : 'NEEDS_REVISION'
          };
        }
      });

      const res = await syncToDrive(currentGraph);
      if (res.success) {
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setCopiedNotification(`✅ Synced student_cognitive_graph.json to Google Drive!`);
        setTimeout(() => setCopiedNotification(null), 3500);
      } else {
        setDriveError(res.error || 'Failed to sync to Drive');
      }
    } catch (err: any) {
      setDriveError(err.message || 'Drive sync error');
    } finally {
      setIsSyncingToDrive(false);
    }
  };

  // 1-Click Load from Google Drive
  const handleLoadFromDriveAction = async () => {
    setIsLoadingFromDrive(true);
    setDriveError(null);
    try {
      const res = await loadFromDrive();
      if (res.success && res.graph) {
        const loadedGraph = res.graph;
        const mappedMemory: ConceptMastery[] = Object.values(loadedGraph.concept_nodes).map(n => {
          const status = n.status === 'MASTERED_LOCKED' || n.status === 'MASTERED' ? 'Mastered' : (n.status === 'CRITICAL_WEAKNESS' ? 'Critical Weakness' : 'Needs Revision');
          return {
            concept: n.name,
            topic: n.topic || 'General',
            status,
            lastUpdated: new Date(n.last_reviewed_timestamp).getTime() || Date.now(),
            last_tested_date: n.last_reviewed_timestamp,
            streak_count: n.streak_count,
            retention_level: n.status === 'MASTERED_LOCKED' ? 'PERMANENT_LOCK' : (n.retention_strength >= 0.7 ? 'FRESH' : (n.retention_strength >= 0.4 ? 'WARM' : 'DECAYED')),
            lastError: n.known_traps && n.known_traps.length > 0 ? n.known_traps[0] : null,
            confidenceScore: n.retention_strength
          };
        });

        if (onUpdateMemory) {
          onUpdateMemory(mappedMemory);
        }

        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setCopiedNotification(`📥 Restored ${mappedMemory.length} concepts from Google Drive!`);
        setTimeout(() => setCopiedNotification(null), 3500);
      } else {
        setDriveError(res.error || 'No cognitive graph found on Drive.');
      }
    } catch (err: any) {
      setDriveError(err.message || 'Drive load error');
    } finally {
      setIsLoadingFromDrive(false);
    }
  };

  // Download raw JSON
  const handleDownloadGraphJson = () => {
    const graph = loadLocalCognitiveGraph();
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_cognitive_graph.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCopiedNotification('Downloaded student_cognitive_graph.json');
    setTimeout(() => setCopiedNotification(null), 2500);
  };

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

  // Instant Auto-Mastery Resolution (Increments streak and upgrades retention level)
  const handleResolveToMastered = (conceptName: string) => {
    if (!onUpdateMemory) return;
    let nextStreakComputed = 1;
    const updated = memory.map(m => {
      if (m.concept.toLowerCase() === conceptName.toLowerCase()) {
        const nextStreak = (m.streak_count || 0) + 1;
        nextStreakComputed = nextStreak;
        const newRetentionLevel: 'FRESH' | 'WARM' | 'DECAYED' | 'PERMANENT_LOCK' = nextStreak >= 3 ? 'PERMANENT_LOCK' : 'FRESH';
        return {
          ...m,
          status: 'Mastered' as const,
          lastError: null,
          confidenceScore: 1.0,
          lastUpdated: Date.now(),
          last_tested_date: new Date().toISOString(),
          streak_count: nextStreak,
          retention_level: newRetentionLevel
        };
      }
      return m;
    });
    onUpdateMemory(updated);

    if (nextStreakComputed >= 3) {
      triggerStreakCelebration(conceptName, nextStreakComputed);
    } else {
      setCopiedNotification(`🎯 ${conceptName} resolved to Mastered (🔥 Streak: ${nextStreakComputed}/3)!`);
      setTimeout(() => setCopiedNotification(null), 3500);
    }
  };

  // Increment recall streak manually or via active recall drill
  const handleIncrementStreak = (conceptName: string) => {
    if (!onUpdateMemory) return;
    let nextStreakComputed = 1;
    const updated = memory.map(m => {
      if (m.concept.toLowerCase() === conceptName.toLowerCase()) {
        const nextStreak = (m.streak_count || 0) + 1;
        nextStreakComputed = nextStreak;
        const isLocked = nextStreak >= 3;
        return {
          ...m,
          status: isLocked ? ('Mastered' as const) : m.status,
          lastError: isLocked ? null : m.lastError,
          confidenceScore: Math.min(1.0, (m.confidenceScore || 0.6) + 0.2),
          lastUpdated: Date.now(),
          last_tested_date: new Date().toISOString(),
          streak_count: nextStreak,
          retention_level: isLocked ? ('PERMANENT_LOCK' as const) : ('FRESH' as const)
        };
      }
      return m;
    });
    onUpdateMemory(updated);

    if (nextStreakComputed >= 3) {
      triggerStreakCelebration(conceptName, nextStreakComputed);
    } else {
      setCopiedNotification(`🔥 ${conceptName} streak increased to ${nextStreakComputed}/3!`);
      setTimeout(() => setCopiedNotification(null), 3000);
    }
  };

  // Trigger Socratic Quiz for a specific concept
  const handleStartQuizOnConcept = (conceptName: string) => {
    if (onQuizConcept) {
      onQuizConcept(conceptName);
      onClose();
    }
  };

  // Add custom concept/trap
  const handleAddCustomTrap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConcept.trim() || !onUpdateMemory) return;

    const existingIndex = memory.findIndex(m => m.concept.toLowerCase() === newConcept.trim().toLowerCase());
    let updated: ConceptMastery[];

    if (existingIndex >= 0) {
      updated = memory.map((m, i) => i === existingIndex ? {
        ...m,
        topic: newTopic.trim() || m.topic || 'General',
        status: newStatus,
        lastError: newTrap.trim() || m.lastError,
        confidenceScore: newStatus === 'Critical Weakness' ? 0.3 : 0.6,
        lastUpdated: Date.now(),
        last_tested_date: new Date().toISOString(),
        streak_count: 0,
        retention_level: 'DECAYED' as const
      } : m);
    } else {
      updated = [
        ...memory,
        {
          concept: newConcept.trim(),
          topic: newTopic.trim() || 'General',
          status: newStatus,
          lastError: newTrap.trim() || 'Student added for Socratic revision',
          confidenceScore: newStatus === 'Critical Weakness' ? 0.3 : 0.6,
          lastUpdated: Date.now(),
          last_tested_date: new Date().toISOString(),
          streak_count: 0,
          retention_level: 'DECAYED' as const
        }
      ];
    }

    onUpdateMemory(updated);
    setNewConcept('');
    setNewTrap('');
    setShowAddForm(false);
    setCopiedNotification(`Added "${newConcept.trim()}" to Error Log!`);
    setTimeout(() => setCopiedNotification(null), 3000);
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
      const data = await safeFetchJson<{ success: boolean; profile: any }>('/api/import-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          link: geminiLink.trim(),
          rawText: geminiLink.includes('http') ? undefined : geminiLink.trim()
        })
      });

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
      <div className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-3xl border border-[#1C382E] bg-[#081511] shadow-2xl overflow-hidden">
        
        {/* 3+ Streak Celebratory Overlay Modal Banner */}
        {celebrationData && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative flex flex-col items-center text-center max-w-md w-full p-6 sm:p-7 rounded-3xl border-2 border-amber-400/60 bg-gradient-to-b from-[#1E1908] via-[#120F04] to-[#0A0802] shadow-[0_0_60px_rgba(251,191,36,0.45)] overflow-hidden">
              {/* Radiant ambient glow */}
              <div className="absolute -top-10 -left-10 h-36 w-36 rounded-full bg-amber-500/25 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -right-10 h-36 w-36 rounded-full bg-emerald-500/25 blur-2xl pointer-events-none" />

              {/* Bouncing celebratory trophy / party popper icon */}
              <div className="relative mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-200 text-black shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-bounce">
                <PartyPopper size={32} className="text-black" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[11px] font-extrabold uppercase tracking-wider mb-2">
                <Sparkles size={13} className="text-amber-300 animate-spin" />
                <span>3+ Recall Streak Mastered!</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {celebrationData.concept}
              </h3>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/70 border border-amber-500/40 text-xs font-mono font-bold text-amber-300">
                  <Flame size={14} className="text-amber-400 fill-amber-400" />
                  <span>{celebrationData.streak} Consecutive Recalls</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-xs font-bold text-[#4ADE80]">
                  <ShieldCheck size={14} />
                  <span>Gold Shield Lock</span>
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-300 leading-relaxed max-w-xs">
                Consistent spaced recall achieved! This concept is now permanently locked into long-term memory against Ebbinghaus decay.
              </p>

              {/* Action buttons */}
              <div className="mt-6 flex items-center gap-3 w-full">
                <button
                  onClick={() => {
                    runStreakConfetti();
                    playStreakCelebrationFanfare();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold transition-all cursor-pointer"
                >
                  <Sparkles size={14} className="text-amber-300" />
                  <span>More Confetti!</span>
                </button>
                <button
                  onClick={() => setCelebrationData(null)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black text-xs font-black shadow-lg shadow-amber-500/30 transition-all cursor-pointer"
                >
                  <span>Continue Learning</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#1C382E]/70 bg-[#0D1C17]/90">
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
        <div className="flex items-center gap-1 sm:gap-2 px-4 sm:px-5 pt-3 pb-2 border-b border-[#1C382E]/70 bg-[#0A1713] overflow-x-auto scrollbar-none">
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
              
              {/* Memory Decay Warning Banner (Ebbinghaus Forgetting Curve Alert) */}
              {memory.some(m => getConceptRetentionInfo(m).level === 'DECAYED' || m.status !== 'Mastered') && (
                <div className="p-4 sm:p-5 rounded-3xl border border-red-500/30 bg-gradient-to-r from-[#200F12] via-[#160A0C] to-[#0D0607] shadow-xl space-y-3 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.25)]">
                        <AlertTriangle size={20} className="animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">Memory Decay Warning (Ebbinghaus Curve)</h4>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                            15+ Days Overdue
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
                          {memory.filter(m => getConceptRetentionInfo(m).level === 'DECAYED' || m.status !== 'Mastered').length} concept(s) have crossed the memory decay threshold and require spontaneous active retrieval before memory retention drops.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const target = memory.find(m => getConceptRetentionInfo(m).level === 'DECAYED' || m.status !== 'Mastered');
                        if (target) handleStartQuizOnConcept(target.concept);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-red-500/20 transition-all cursor-pointer shrink-0 active:scale-95"
                    >
                      <Zap size={14} />
                      <span>⚡ Test Decayed Concepts Now</span>
                    </button>
                  </div>

                  {/* Overdue Concept Tags */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-red-500/15">
                    {memory
                      .filter(m => getConceptRetentionInfo(m).level === 'DECAYED' || m.status !== 'Mastered')
                      .slice(0, 4)
                      .map((item, i) => {
                        const info = getConceptRetentionInfo(item);
                        return (
                          <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/50 border border-red-500/20 text-[11px] text-gray-200">
                            <span className="text-red-400 font-bold">🔴 {item.concept}</span>
                            <span className="text-gray-400 text-[10px]">({info.daysElapsed}d ago)</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Exam Readiness Index Banner */}
              <div className="relative overflow-hidden rounded-3xl border border-[#1C382E] bg-gradient-to-br from-[#12271F] via-[#0D1C17] to-[#081511] p-5 sm:p-6 shadow-xl">
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

              {/* 1-3-7-15 Day Spaced Repetition Matrix Breakdown */}
              <div className="p-4 rounded-3xl border border-white/10 bg-black/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrainCircuit size={16} className="text-purple-400" />
                    <span className="text-xs font-bold text-white">Ebbinghaus Spaced Repetition Engine (1-3-7-15 Day System)</span>
                  </div>
                  <span className="text-[10px] font-medium text-gray-400">Memory Decay Protection</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Stage 1: FRESH */}
                  <div className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#4ADE80] mb-1">
                      <span>🟢 Fresh</span>
                      <span className="text-[10px] text-emerald-400/70 font-mono">Day 1–3</span>
                    </div>
                    <span className="text-xl font-black text-white">
                      {memory.filter(m => getConceptRetentionInfo(m).level === 'FRESH' && m.status === 'Mastered').length}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">100% Peak Retention</span>
                  </div>

                  {/* Stage 2: WARM */}
                  <div className="p-3 rounded-2xl border border-yellow-500/30 bg-yellow-950/20 flex flex-col">
                    <div className="flex items-center justify-between text-[11px] font-bold text-yellow-300 mb-1">
                      <span>🟡 Warm-up</span>
                      <span className="text-[10px] text-yellow-400/70 font-mono">Day 4–7</span>
                    </div>
                    <span className="text-xl font-black text-white">
                      {memory.filter(m => getConceptRetentionInfo(m).level === 'WARM').length}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Warm-up Drill Due</span>
                  </div>

                  {/* Stage 3: DECAYED */}
                  <div className="p-3 rounded-2xl border border-red-500/30 bg-red-950/20 flex flex-col">
                    <div className="flex items-center justify-between text-[11px] font-bold text-red-400 mb-1">
                      <span>🔴 Decayed</span>
                      <span className="text-[10px] text-red-400/70 font-mono">Day 15+</span>
                    </div>
                    <span className="text-xl font-black text-white">
                      {memory.filter(m => getConceptRetentionInfo(m).level === 'DECAYED' || m.status !== 'Mastered').length}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Needs Active Recall</span>
                  </div>

                  {/* Stage 4: PERMANENT LOCK */}
                  <div className="p-3 rounded-2xl border border-amber-500/40 bg-amber-950/20 flex flex-col shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-300 mb-1">
                      <span>🛡️ Locked</span>
                      <span className="text-[10px] text-amber-400/70 font-mono">3+ Streaks</span>
                    </div>
                    <span className="text-xl font-black text-amber-200">
                      {memory.filter(m => getConceptRetentionInfo(m).level === 'PERMANENT_LOCK').length}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Gold Shield Lock</span>
                  </div>
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
                  <span className="font-bold text-purple-300">Spaced Repetition & Decay Protection:</span> Examix AI injects spontaneous 10–15s memory checks when concepts exceed decay intervals. Correct answers increment streak until Permanent Lock!
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
                  {memory.map((item, idx) => {
                    const retention = getConceptRetentionInfo(item);
                    const isLocked = retention.level === 'PERMANENT_LOCK' || retention.streak >= 3;
                    const isDecayed = retention.level === 'DECAYED' || item.status !== 'Mastered';
                    const isWarm = retention.level === 'WARM';

                    return (
                      <div key={idx} className={`flex flex-col justify-between p-4 rounded-2xl border transition-all hover:bg-white/5 ${
                        isLocked 
                          ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/20 to-black/60 shadow-[0_0_15px_rgba(251,191,36,0.1)]' 
                          : isDecayed 
                          ? 'border-red-500/30 bg-gradient-to-b from-red-950/20 to-black/60' 
                          : getStatusColor(item.status)
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white mb-0.5 flex items-center gap-1.5">
                              {isLocked && <span title="Permanent Lock (3+ consecutive recall checks)">🛡️</span>}
                              {item.concept}
                            </span>
                            {item.topic && <span className="text-[10px] text-gray-400 mb-1">{item.topic}</span>}
                            <span className="text-xs flex items-center gap-1.5 opacity-90 font-medium">
                              {getStatusIcon(item.status)} {item.status}
                            </span>
                          </div>

                          {/* Retention Level Pill */}
                          <div className="flex flex-col items-end gap-1">
                            {isLocked ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm flex items-center gap-1 font-mono">
                                🛡️ PERMANENT LOCK
                              </span>
                            ) : isDecayed ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-mono animate-pulse">
                                🔴 DECAYED ({retention.daysElapsed}d)
                              </span>
                            ) : isWarm ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-mono">
                                🟡 WARM (Day 4–7)
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#4ADE80] border border-emerald-500/30 font-mono">
                                🟢 FRESH (100%)
                              </span>
                            )}

                            <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                              🔥 Streak: {retention.streak}/3
                            </span>
                          </div>
                        </div>

                        {/* Interactive 3-Stage Streak Pips */}
                        <div className="my-2.5 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-gray-400">
                            <span className="flex items-center gap-1">
                              <Flame size={11} className={isLocked ? 'text-amber-400 fill-amber-400' : 'text-emerald-400'} />
                              <span>Memory Streak Progress</span>
                            </span>
                            <span className="font-mono text-gray-300 font-bold">
                              {retention.streak >= 3 ? '3/3 (Locked)' : `${retention.streak}/3`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3].map((step) => {
                              const isFilled = retention.streak >= step;
                              return (
                                <div
                                  key={step}
                                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                    isFilled 
                                      ? isLocked
                                        ? 'bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
                                        : 'bg-gradient-to-r from-emerald-500 to-[#4ADE80] shadow-[0_0_6px_rgba(74,222,128,0.5)]'
                                      : 'bg-white/10'
                                  }`}
                                  title={`Drill step ${step} of 3`}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Card bottom toolbar */}
                        <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-white/5 text-[10px] text-gray-400">
                          <span>
                            {retention.daysElapsed === 0 ? 'Tested today' : `Last recalled ${retention.daysElapsed}d ago`}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {isLocked ? (
                              <button
                                onClick={() => triggerStreakCelebration(item.concept, retention.streak)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                                title="Replay celebration confetti for this 3+ streak"
                              >
                                <Sparkles size={11} className="text-amber-300" />
                                <span>Celebrate 3+</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleIncrementStreak(item.concept)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-[#4ADE80] border border-emerald-500/30 text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                                title="Log successful active recall drill (+1 streak)"
                              >
                                <Plus size={11} />
                                <span>+1 Streak</span>
                              </button>
                            )}

                            {onQuizConcept && (
                              <button
                                onClick={() => handleStartQuizOnConcept(item.concept)}
                                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-[10px] transition-colors cursor-pointer"
                              >
                                Test Recall
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ERROR LOG & AUTO-MASTERY RESOLVER */}
          {activeTab === 'errors' && (
            <div className="space-y-4">
              
              {/* Revision Engine Info Banner */}
              <div className="p-4 rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-[#14120A] to-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Surprise Revision Injection Active</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                        Auto-Mastery On
                      </span>
                    </h4>
                    <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed">
                      Examix AI will spontaneously test these error traps every 2–3 turns. Answer correctly across 3 spaced intervals to achieve Permanent Lock!
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-medium text-white transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Plus size={14} className={showAddForm ? 'rotate-45 transition-transform' : ''} />
                  <span>{showAddForm ? 'Cancel' : 'Log Weakness'}</span>
                </button>
              </div>

              {/* Add Custom Weakness Form */}
              {showAddForm && (
                <form onSubmit={handleAddCustomTrap} className="p-4 rounded-2xl border border-white/15 bg-[#12141C] space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Target size={14} className="text-[#4ADE80]" /> Add Target Concept to Error Log
                    </span>
                    <span className="text-[10px] text-gray-400">Examix will inject drills for this</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase">Concept / Formula Name *</label>
                      <input
                        type="text"
                        value={newConcept}
                        onChange={(e) => setNewConcept(e.target.value)}
                        placeholder="e.g. Dielectric Constant (K or ε_r)"
                        required
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:border-[#4ADE80] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase">Subject / Chapter</label>
                      <input
                        type="text"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        placeholder="e.g. Electrostatics / Physics"
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:border-[#4ADE80] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase">Known Exam Mistake / Trap</label>
                    <input
                      type="text"
                      value={newTrap}
                      onChange={(e) => setNewTrap(e.target.value)}
                      placeholder="e.g. Forgetting force in medium reduces by factor K (F_m = F_0 / K)"
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:border-[#4ADE80] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNewStatus('Needs Revision')}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                          newStatus === 'Needs Revision'
                            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 font-bold'
                            : 'bg-white/5 text-gray-400 border-white/10'
                        }`}
                      >
                        Needs Revision
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewStatus('Critical Weakness')}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                          newStatus === 'Critical Weakness'
                            ? 'bg-red-500/20 text-red-300 border-red-500/40 font-bold'
                            : 'bg-white/5 text-gray-400 border-white/10'
                        }`}
                      >
                        Critical Weakness
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-[#4ADE80] hover:bg-[#3ec470] text-black font-bold text-xs shadow-[0_0_15px_rgba(74,222,128,0.3)] transition-all cursor-pointer"
                    >
                      Add to Active Drills
                    </button>
                  </div>
                </form>
              )}

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 border-b border-white/10 pb-2">
                <button
                  onClick={() => setErrorFilter('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    errorFilter === 'all'
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  All Errors ({memory.filter(m => m.status !== 'Mastered').length})
                </button>
                <button
                  onClick={() => setErrorFilter('Needs Revision')}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    errorFilter === 'Needs Revision'
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Needs Revision ({revisionCount})
                </button>
                <button
                  onClick={() => setErrorFilter('Critical Weakness')}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    errorFilter === 'Critical Weakness'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Critical Weakness ({weakCount})
                </button>
              </div>

              {/* Error Cards List */}
              <div className="space-y-3">
                {memory
                  .filter(m => m.status !== 'Mastered')
                  .filter(m => errorFilter === 'all' || m.status === errorFilter)
                  .length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
                    <CheckCircle size={48} className="mb-3 text-[#4ADE80] opacity-80" />
                    <p className="text-sm font-bold text-white">Clean Record! 0 Active Errors</p>
                    <p className="text-xs mt-1 text-gray-400">All evaluated topics currently meet 100/100 mastery standards.</p>
                  </div>
                ) : (
                  memory
                    .filter(m => m.status !== 'Mastered')
                    .filter(m => errorFilter === 'all' || m.status === errorFilter)
                    .map((item, idx) => (
                      <div key={idx} className="p-4 rounded-2xl border border-red-500/20 bg-gradient-to-b from-[#140D0E] to-[#0D090A] flex flex-col gap-3 shadow-md hover:border-red-500/40 transition-all">
                        
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-sm font-bold text-white flex items-center gap-2">
                              {getStatusIcon(item.status)}
                              {item.concept}
                            </span>
                            {item.topic && (
                              <span className="text-[10px] text-gray-400 mt-0.5 block font-mono">
                                Topic: {item.topic}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            {(() => {
                              const ret = getConceptRetentionInfo(item);
                              return (
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                  🔴 {ret.daysElapsed}d Overdue
                                </span>
                              );
                            })()}
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                              item.status === 'Critical Weakness'
                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                        </div>

                        {item.lastError && (
                          <div className="text-xs text-gray-300 bg-black/60 p-3 rounded-xl border border-red-500/15 font-mono leading-relaxed">
                            <span className="text-red-400 font-bold">⚠️ Logged Exam Trap:</span> {item.lastError}
                          </div>
                        )}

                        {/* Action Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                          <span className="text-[11px] text-gray-400 italic">
                            ⚡ Auto-resolves on correct Socratic recall
                          </span>

                          <div className="flex items-center gap-2">
                            {onQuizConcept && (
                              <button
                                onClick={() => handleStartQuizOnConcept(item.concept)}
                                className="flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all cursor-pointer"
                                title="Spontaneously test this concept in chat right now"
                              >
                                <Zap size={13} />
                                <span>Quiz Me Now</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleResolveToMastered(item.concept)}
                              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-[#4ADE80] border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer shadow-sm"
                              title="Instantly resolve this item to 100/100 Mastered"
                            >
                              <CheckCircle size={13} />
                              <span>Mark Mastered</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: DRIVE & PROFILE SYNC (ULTRA-CLEAN UI & GEMINI CHAT INGESTOR) */}
          {activeTab === 'sync' && (
            <div className="space-y-5">
              
              {/* Ultra-Clean Sync Status & Auto-Sync Card */}
              <div className="p-5 rounded-3xl border border-[#1C382E] bg-gradient-to-br from-[#12271F] via-[#0D1C17] to-[#081511] shadow-xl space-y-4">
                
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
                        Target File: <span className="font-mono text-[#4ADE80] font-semibold">student_profile.json</span>
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

                {/* 1-Click Drive Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/5">
                  <button
                    onClick={handleSyncToDriveAction}
                    disabled={isSyncingToDrive}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    {isSyncingToDrive ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Syncing to Drive...</span>
                      </>
                    ) : (
                      <>
                        <Cloud size={14} />
                        <span>Sync Now to Drive</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleLoadFromDriveAction}
                    disabled={isLoadingFromDrive}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white text-xs font-bold border border-white/15 transition-all cursor-pointer"
                  >
                    {isLoadingFromDrive ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Loading from Drive...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} />
                        <span>Restore from Drive</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadGraphJson}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/60 text-[#4ADE80] text-xs font-bold border border-emerald-500/30 transition-all cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Download JSON</span>
                  </button>
                </div>

                {driveError && (
                  <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{driveError}</span>
                  </div>
                )}

                {copiedNotification && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                    <Check size={14} className="shrink-0" /> {copiedNotification}
                  </div>
                )}
              </div>

              {/* GEMINI SHARED CHAT LINK & PROFILE INGESTOR MODULE */}
              <div className="p-5 rounded-3xl border border-[#1C382E] bg-gradient-to-br from-[#12271F] via-[#0D1C17] to-[#081511] shadow-xl space-y-4">
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
