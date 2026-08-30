import React, { useState, useEffect } from 'react';
import {
  Settings,
  Key,
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  Cpu,
  Sliders,
  Volume2,
  GraduationCap,
  RotateCcw,
  Save,
  X,
  Loader2,
  ShieldCheck,
  Mic,
  Moon,
  Radio,
  Zap,
  VolumeX,
  Clock,
  BatteryCharging,
  User as UserIcon,
  LogOut,
  LogIn,
  Folder,
  HardDrive,
  RefreshCw,
  FileText,
  Database,
  Cloud,
  CheckCircle
} from 'lucide-react';
import { safeFetchJson, getStoredApiKeys, saveStoredApiKeys } from '../lib/apiClient';
import {
  HotwordEngineSettings,
  HotwordConfig,
  DEFAULT_HOTWORD_SETTINGS,
  playWakeChime
} from '../utils/hotwordEngine';
import { 
  googleSignIn, 
  logout, 
  getStoredProfile, 
  auth, 
  StoredUserProfile, 
  VAULT_FOLDER_NAME 
} from '../lib/firebase';
import { syncVaultToDrive, loadLocalCognitiveGraph } from '../utils/neuroSyncEngine';

interface ApiKeySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: () => void;
  initialTab?: 'account' | 'api_keys' | 'academic' | 'preferences' | 'hotwords';
  hotwordSettings?: HotwordEngineSettings;
  onUpdateHotwordSettings?: (newSettings: HotwordEngineSettings) => void;
  onOpenHotwordControlCenter?: () => void;
  onLaunchOledMode?: () => void;
}

export interface UserPreferences {
  targetExam: string;
  teachingLanguage: 'hinglish' | 'english' | 'hindi';
  voiceSpeed: number;
  autoSpeak: boolean;
  highContrastMath: boolean;
  renderSvgDiagrams: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  targetExam: 'CBSE Class 12 / JEE Main & NEET',
  teachingLanguage: 'hinglish',
  voiceSpeed: 1.0,
  autoSpeak: false,
  highContrastMath: true,
  renderSvgDiagrams: true,
};

export const ApiKeySettingsModal: React.FC<ApiKeySettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
  initialTab = 'account',
  hotwordSettings = DEFAULT_HOTWORD_SETTINGS,
  onUpdateHotwordSettings,
  onOpenHotwordControlCenter,
  onLaunchOledMode
}) => {
  const [activeTab, setActiveTab] = useState<'account' | 'api_keys' | 'academic' | 'preferences' | 'hotwords'>(initialTab);

  // User Profile & OAuth State
  const [userProfile, setUserProfile] = useState<StoredUserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVaultSyncing, setIsVaultSyncing] = useState<boolean>(false);
  const [vaultSyncSuccess, setVaultSyncSuccess] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('examix_auto_sync_drive') !== 'false';
  });

  // API Key States
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [openAiKey, setOpenAiKey] = useState<string>('');
  const [useCustomGemini, setUseCustomGemini] = useState<boolean>(false);
  const [useCustomOpenAi, setUseCustomOpenAi] = useState<boolean>(false);

  // Key Visibility toggles
  const [showGeminiKey, setShowGeminiKey] = useState<boolean>(false);
  const [showOpenAiKey, setShowOpenAiKey] = useState<boolean>(false);

  // Verification Testing States
  const [geminiTesting, setGeminiTesting] = useState<boolean>(false);
  const [geminiTestStatus, setGeminiTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const [openAiTesting, setOpenAiTesting] = useState<boolean>(false);
  const [openAiTestStatus, setOpenAiTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Server Key Status
  const [serverStatus, setServerStatus] = useState<{ hasGemini: boolean; hasOpenAi: boolean; checked: boolean }>({
    hasGemini: true,
    hasOpenAi: false,
    checked: false
  });

  // User Preferences
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Load profile and state
  useEffect(() => {
    if (!isOpen) return;

    if (initialTab) {
      setActiveTab(initialTab);
    }

    // Refresh user profile
    const current = auth.currentUser;
    if (current) {
      setUserProfile({
        uid: current.uid,
        displayName: current.displayName,
        email: current.email,
        photoURL: current.photoURL
      });
    } else {
      const stored = getStoredProfile();
      setUserProfile(stored);
    }

    // Load stored keys
    const stored = getStoredApiKeys();
    setGeminiKey(stored.geminiKey || '');
    setOpenAiKey(stored.openAiKey || '');
    setUseCustomGemini(!!stored.geminiKey);
    setUseCustomOpenAi(!!stored.openAiKey);
    setGeminiTestStatus(null);
    setOpenAiTestStatus(null);
    setSaveSuccess(false);
    setAuthError(null);
    setVaultSyncSuccess(null);

    // Load stored preferences
    try {
      const savedPrefs = localStorage.getItem('examix_user_preferences');
      if (savedPrefs) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(savedPrefs) });
      }
    } catch {
      // Fallback
    }

    // Check server default key availability
    safeFetchJson<{ hasServerGeminiKey: boolean; hasServerOpenAiKey: boolean }>('/api/settings/status')
      .then((res) => {
        setServerStatus({
          hasGemini: res.hasServerGeminiKey !== false,
          hasOpenAi: !!res.hasServerOpenAiKey,
          checked: true
        });
      })
      .catch(() => {
        setServerStatus({ hasGemini: true, hasOpenAi: false, checked: true });
      });
  }, [isOpen, initialTab]);

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res && res.user) {
        setUserProfile({
          uid: res.user.uid,
          displayName: res.user.displayName,
          email: res.user.email,
          photoURL: res.user.photoURL
        });
        // Run initial vault sync
        await syncVaultToDrive();
        setVaultSyncSuccess('Connected and synchronized with Examix_AI_Mastery_Vault!');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Google authentication failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setIsAuthLoading(true);
    try {
      await logout();
      setUserProfile(null);
      setVaultSyncSuccess(null);
    } catch (err: any) {
      setAuthError(err.message || 'Sign out failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleInstantVaultSync = async () => {
    setIsVaultSyncing(true);
    setVaultSyncSuccess(null);
    setAuthError(null);
    try {
      const res = await syncVaultToDrive();
      if (res.success) {
        setVaultSyncSuccess(`Synchronized 3 vault files into 📁 ${VAULT_FOLDER_NAME}!`);
        setTimeout(() => setVaultSyncSuccess(null), 4000);
      } else {
        setAuthError(res.error || 'Failed to sync with Google Drive Vault');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Vault sync failed');
    } finally {
      setIsVaultSyncing(false);
    }
  };

  if (!isOpen) return null;

  const handleTestKey = async (provider: 'gemini' | 'openai') => {
    const keyToTest = provider === 'gemini' ? geminiKey.trim() : openAiKey.trim();

    if (!keyToTest) {
      if (provider === 'gemini') {
        setGeminiTestStatus({ success: false, message: 'Please enter a Gemini API key first.' });
      } else {
        setOpenAiTestStatus({ success: false, message: 'Please enter an OpenAI API key first.' });
      }
      return;
    }

    if (provider === 'gemini') {
      setGeminiTesting(true);
      setGeminiTestStatus(null);
      try {
        const res = await safeFetchJson<{ valid: boolean; message?: string; error?: string }>('/api/settings/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'gemini', key: keyToTest })
        });
        if (res.valid) {
          setGeminiTestStatus({ success: true, message: 'Verified! Key is active and functioning properly.' });
        } else {
          setGeminiTestStatus({ success: false, message: res.error || 'Verification failed. Please check key permissions.' });
        }
      } catch (err: any) {
        setGeminiTestStatus({ success: false, message: err.message || 'Could not verify Gemini key.' });
      } finally {
        setGeminiTesting(false);
      }
    } else {
      setOpenAiTesting(true);
      setOpenAiTestStatus(null);
      try {
        const res = await safeFetchJson<{ valid: boolean; message?: string; error?: string }>('/api/settings/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'openai', key: keyToTest })
        });
        if (res.valid) {
          setOpenAiTestStatus({ success: true, message: 'Verified! OpenAI key is connected.' });
        } else {
          setOpenAiTestStatus({ success: false, message: res.error || 'Verification failed.' });
        }
      } catch (err: any) {
        setOpenAiTestStatus({ success: false, message: err.message || 'Could not verify OpenAI key.' });
      } finally {
        setOpenAiTesting(false);
      }
    }
  };

  const handleSave = () => {
    // Save API keys
    saveStoredApiKeys({
      geminiKey: useCustomGemini ? geminiKey.trim() : '',
      openAiKey: useCustomOpenAi ? openAiKey.trim() : ''
    });

    // Save preferences
    localStorage.setItem('examix_user_preferences', JSON.stringify(preferences));

    setSaveSuccess(true);
    if (onSettingsSaved) {
      onSettingsSaved();
    }

    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleResetDefaults = () => {
    setGeminiKey('');
    setOpenAiKey('');
    setUseCustomGemini(false);
    setUseCustomOpenAi(false);
    setGeminiTestStatus(null);
    setOpenAiTestStatus(null);
    setPreferences(DEFAULT_PREFERENCES);
    saveStoredApiKeys({ geminiKey: '', openAiKey: '' });
    localStorage.removeItem('examix_user_preferences');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-3xl border border-[#1C382E] bg-[#081511] shadow-2xl overflow-hidden text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#1C382E]/70 bg-[#0D1C17]/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/40 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Settings & API Configuration
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-400">
                Manage custom API credentials, model overrides, and learning preferences
              </p>
            </div>
          </div>
          <button
            id="close-settings-modal-btn"
            onClick={onClose}
            className="rounded-xl border border-[#1C382E] bg-white/5 p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 px-4 sm:px-5 pt-3 pb-2 border-b border-[#1C382E]/70 bg-[#0A1713] overflow-x-auto scrollbar-none">
          <button
            id="tab-account-btn"
            onClick={() => setActiveTab('account')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'account'
                ? 'bg-[#4ADE80] text-black shadow-[0_0_15px_rgba(74,222,128,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserIcon size={14} />
            <span>Google Account & Vault</span>
          </button>
          <button
            id="tab-api-keys-btn"
            onClick={() => setActiveTab('api_keys')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'api_keys'
                ? 'bg-[#4ADE80] text-black shadow-[0_0_15px_rgba(74,222,128,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Key size={14} />
            <span>API Keys & Credentials</span>
          </button>
          <button
            id="tab-academic-profile-btn"
            onClick={() => setActiveTab('academic')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'academic'
                ? 'bg-[#4ADE80] text-black shadow-[0_0_15px_rgba(74,222,128,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <GraduationCap size={14} />
            <span>Target Exam & Board</span>
          </button>
          <button
            id="tab-preferences-btn"
            onClick={() => setActiveTab('preferences')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'preferences'
                ? 'bg-[#4ADE80] text-black shadow-[0_0_15px_rgba(74,222,128,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders size={14} />
            <span>Voice & Display</span>
          </button>
          <button
            id="tab-hotwords-btn"
            onClick={() => setActiveTab('hotwords')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'hotwords'
                ? 'bg-[#4ADE80] text-black shadow-[0_0_15px_rgba(74,222,128,0.3)]'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Mic size={14} />
            <span>Hotwords & Screen-Off ({hotwordSettings.hotwords.filter(h => h.enabled).length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">

          {/* TAB 0: GOOGLE ACCOUNT & DEDICATED VAULT */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Alert Feedback Messages */}
              {authError && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span>{authError}</span>
                </div>
              )}
              {vaultSyncSuccess && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-[#4ADE80]/40 bg-[#4ADE80]/10 p-3.5 text-xs text-[#4ADE80] animate-in fade-in">
                  <CheckCircle size={16} className="shrink-0 text-[#4ADE80]" />
                  <span>{vaultSyncSuccess}</span>
                </div>
              )}

              {/* User Profile Card */}
              <div className="rounded-3xl border border-[#1C382E] bg-gradient-to-b from-[#0D1C17] to-[#0A1713] p-5 shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* User Avatar with Live Online Ring */}
                    <div className="relative shrink-0">
                      {userProfile?.photoURL ? (
                        <div className="relative h-14 w-14 rounded-full p-[2px] bg-gradient-to-tr from-[#4ADE80] via-emerald-400 to-teal-300 shadow-[0_0_20px_rgba(74,222,128,0.35)]">
                          <img
                            src={userProfile.photoURL}
                            alt={userProfile.displayName || 'User'}
                            className="h-full w-full rounded-full object-cover bg-[#0D1C17]"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#0D1C17] bg-[#4ADE80] shadow" />
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1E293B] border border-white/10 text-gray-300 shadow-inner">
                          <UserIcon size={26} className="text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">
                          {userProfile?.displayName || 'Guest Student / Aspirant'}
                        </h3>
                        {userProfile ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#4ADE80]/20 px-2 py-0.5 text-[10px] font-semibold text-[#4ADE80] border border-[#4ADE80]/40">
                            <Check size={10} /> Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                            Guest Mode
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {userProfile?.email || 'Sign in with Google to enable automatic cloud backup'}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 pt-0.5">
                        <span className="flex h-1.5 w-1.5 rounded-full bg-[#4ADE80]"></span>
                        <span>Scope: drive.file & profile identity</span>
                      </div>
                    </div>
                  </div>

                  {/* Auth Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {userProfile ? (
                      <div className="flex items-center gap-2">
                        <button
                          id="switch-google-account-btn"
                          onClick={handleGoogleSignIn}
                          disabled={isAuthLoading}
                          className="flex items-center gap-1.5 rounded-xl border border-[#1C382E] bg-white/5 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-white/10 hover:border-[#4ADE80]/40 transition-all cursor-pointer"
                        >
                          {isAuthLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                          <span>Switch Account</span>
                        </button>
                        <button
                          id="google-sign-out-btn"
                          onClick={handleGoogleSignOut}
                          disabled={isAuthLoading}
                          className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-all cursor-pointer"
                        >
                          <LogOut size={13} />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        id="google-sign-in-btn"
                        onClick={handleGoogleSignIn}
                        disabled={isAuthLoading}
                        className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-gray-900 shadow-md hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
                      >
                        {isAuthLoading ? (
                          <Loader2 size={15} className="animate-spin text-black" />
                        ) : (
                          <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                        )}
                        <span>Sign in with Google</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Dedicated Drive Vault Box */}
              <div className="rounded-3xl border border-[#1C382E] bg-[#0D1C17] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30">
                      <HardDrive size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>Google Drive Mastery Vault</span>
                        </h4>
                        <span className="rounded-md bg-[#1C382E] px-2 py-0.5 text-[10px] font-mono text-[#4ADE80]">
                          📁 {VAULT_FOLDER_NAME}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Automated real-time cloud synchronization for your study intelligence & math logs
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                      <span className="h-2 w-2 rounded-full bg-[#4ADE80] animate-pulse"></span>
                      <span>Live Synced</span>
                    </span>
                  </div>
                </div>

                {/* 3 Core Sync Datasets Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  {/* File 1 */}
                  <div className="flex flex-col justify-between rounded-2xl border border-[#1C382E] bg-[#12271F]/50 p-3.5 hover:border-[#4ADE80]/40 transition-colors">
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-white mb-2">
                      <Database size={15} className="text-[#4ADE80] shrink-0" />
                      <span className="truncate font-mono text-[11px]">student_cognitive_graph.json</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Ebbinghaus memory health, 1-3-7-15 day decay curves, and formula mastery nodes.
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-emerald-400 font-medium pt-2 border-t border-white/5">
                      <span>Live Status</span>
                      <span>Active Synced</span>
                    </div>
                  </div>

                  {/* File 2 */}
                  <div className="flex flex-col justify-between rounded-2xl border border-[#1C382E] bg-[#12271F]/50 p-3.5 hover:border-[#4ADE80]/40 transition-colors">
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-white mb-2">
                      <FileText size={15} className="text-blue-400 shrink-0" />
                      <span className="truncate font-mono text-[11px]">chat_sessions_history.json</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Complete conversational logs, step-by-step math derivations, and solved queries.
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-blue-400 font-medium pt-2 border-t border-white/5">
                      <span>Live Status</span>
                      <span>Auto-Backed Up</span>
                    </div>
                  </div>

                  {/* File 3 */}
                  <div className="flex flex-col justify-between rounded-2xl border border-[#1C382E] bg-[#12271F]/50 p-3.5 hover:border-[#4ADE80]/40 transition-colors">
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-white mb-2">
                      <AlertCircle size={15} className="text-amber-400 shrink-0" />
                      <span className="truncate font-mono text-[11px]">error_log_registry.json</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Active exam traps, common misconceptions, and resolved mistake history.
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-amber-400 font-medium pt-2 border-t border-white/5">
                      <span>Live Status</span>
                      <span>Tracked</span>
                    </div>
                  </div>
                </div>

                {/* Vault Controls & Instant Sync Button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <input
                      id="auto-sync-drive-checkbox"
                      type="checkbox"
                      checked={autoSyncEnabled}
                      onChange={(e) => {
                        setAutoSyncEnabled(e.target.checked);
                        localStorage.setItem('examix_auto_sync_drive', String(e.target.checked));
                      }}
                      className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-[#4ADE80] focus:ring-[#4ADE80] cursor-pointer"
                    />
                    <label htmlFor="auto-sync-drive-checkbox" className="text-xs text-gray-300 cursor-pointer">
                      Automatically sync changes to Google Drive in background
                    </label>
                  </div>

                  <button
                    id="manual-vault-sync-btn"
                    onClick={handleInstantVaultSync}
                    disabled={isVaultSyncing}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1C382E] to-[#12271F] border border-[#4ADE80]/40 px-4 py-2 text-xs font-bold text-[#4ADE80] hover:border-[#4ADE80] hover:text-white transition-all shadow active:scale-95 cursor-pointer"
                  >
                    {isVaultSyncing ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-[#4ADE80]" />
                        <span>Syncing to Vault...</span>
                      </>
                    ) : (
                      <>
                        <Cloud size={14} />
                        <span>Sync Vault Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* TAB 1: API KEYS & CREDENTIALS */}
          {activeTab === 'api_keys' && (
            <div className="space-y-6">
              
              {/* Server Default Status Banner */}
              <div className="flex items-start gap-3 rounded-2xl border border-[#1C382E] bg-[#0D1C17] p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-0.5">
                  <ShieldCheck size={18} />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Built-in Server Gemini API</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                      <Check size={10} /> Active & Ready
                    </span>
                  </div>
                  <p className="text-gray-400 mt-1 leading-relaxed">
                    Examix AI comes pre-configured with the default Gemini 3.7 Flash server endpoint. You can optionally add your own personal API key below to use custom rate limits or quota.
                  </p>
                </div>
              </div>

              {/* Gemini API Key Configuration Card */}
              <div className="rounded-2xl border border-[#1C382E] bg-[#0D1C17] p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#4ADE80] to-emerald-300 text-black font-bold text-xs">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Google Gemini API Key</h3>
                      <p className="text-[11px] text-gray-400">Powers Gemini 3.7 Flash, multimodal vision, and LaTeX reasoning</p>
                    </div>
                  </div>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#4ADE80] hover:underline self-start sm:self-auto font-medium"
                  >
                    <span>Get Key from Google AI Studio</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                {/* Custom Key Toggle */}
                <div className="flex items-center justify-between py-1">
                  <label htmlFor="toggle-custom-gemini" className="text-xs text-gray-300 cursor-pointer">
                    Enable custom Gemini API key
                  </label>
                  <input
                    id="toggle-custom-gemini"
                    type="checkbox"
                    checked={useCustomGemini}
                    onChange={(e) => setUseCustomGemini(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-[#4ADE80] focus:ring-[#4ADE80] cursor-pointer"
                  />
                </div>

                {useCustomGemini && (
                  <div className="space-y-3 pt-2">
                    <div className="relative">
                      <input
                        id="input-gemini-api-key"
                        type={showGeminiKey ? 'text' : 'password'}
                        value={geminiKey}
                        onChange={(e) => {
                          setGeminiKey(e.target.value);
                          setGeminiTestStatus(null);
                        }}
                        placeholder="AIzaSy..."
                        className="w-full rounded-xl border border-[#1C382E] bg-[#081511] py-2.5 pl-3.5 pr-20 text-xs text-white placeholder-gray-500 outline-none focus:border-[#4ADE80]/60 transition-all font-mono"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowGeminiKey(!showGeminiKey)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          title={showGeminiKey ? 'Hide key' : 'Show key'}
                        >
                          {showGeminiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        {geminiKey && (
                          <button
                            type="button"
                            onClick={() => {
                              setGeminiKey('');
                              setGeminiTestStatus(null);
                            }}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                            title="Clear"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        id="test-gemini-key-btn"
                        type="button"
                        onClick={() => handleTestKey('gemini')}
                        disabled={geminiTesting || !geminiKey.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#1C382E] bg-[#12271F] px-3 py-1.5 text-xs font-medium text-[#4ADE80] hover:border-[#4ADE80]/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                      >
                        {geminiTesting ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Verifying key...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={12} />
                            <span>Test Connection</span>
                          </>
                        )}
                      </button>

                      {geminiTestStatus && (
                        <div
                          className={`flex items-center gap-1.5 text-xs font-medium ${
                            geminiTestStatus.success ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {geminiTestStatus.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                          <span>{geminiTestStatus.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* OpenAI API Key Configuration Card */}
              <div className="rounded-2xl border border-[#1C382E] bg-[#0D1C17] p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      <Cpu size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">OpenAI API Key (Optional)</h3>
                      <p className="text-[11px] text-gray-400">Enables GPT-4o & GPT-4o-mini academic model engines</p>
                    </div>
                  </div>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline self-start sm:self-auto font-medium"
                  >
                    <span>OpenAI Platform</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                {/* Custom OpenAI Key Toggle */}
                <div className="flex items-center justify-between py-1">
                  <label htmlFor="toggle-custom-openai" className="text-xs text-gray-300 cursor-pointer">
                    Enable custom OpenAI API key
                  </label>
                  <input
                    id="toggle-custom-openai"
                    type="checkbox"
                    checked={useCustomOpenAi}
                    onChange={(e) => setUseCustomOpenAi(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-500 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {useCustomOpenAi && (
                  <div className="space-y-3 pt-2">
                    <div className="relative">
                      <input
                        id="input-openai-api-key"
                        type={showOpenAiKey ? 'text' : 'password'}
                        value={openAiKey}
                        onChange={(e) => {
                          setOpenAiKey(e.target.value);
                          setOpenAiTestStatus(null);
                        }}
                        placeholder="sk-proj-..."
                        className="w-full rounded-xl border border-[#1C382E] bg-[#081511] py-2.5 pl-3.5 pr-20 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500/60 transition-all font-mono"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowOpenAiKey(!showOpenAiKey)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          title={showOpenAiKey ? 'Hide key' : 'Show key'}
                        >
                          {showOpenAiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        {openAiKey && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenAiKey('');
                              setOpenAiTestStatus(null);
                            }}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                            title="Clear"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        id="test-openai-key-btn"
                        type="button"
                        onClick={() => handleTestKey('openai')}
                        disabled={openAiTesting || !openAiKey.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#1C382E] bg-[#081511] px-3 py-1.5 text-xs font-medium text-blue-400 hover:border-blue-500/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                      >
                        {openAiTesting ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Verifying key...</span>
                          </>
                        ) : (
                          <>
                            <Cpu size={12} />
                            <span>Test Connection</span>
                          </>
                        )}
                      </button>

                      {openAiTestStatus && (
                        <div
                          className={`flex items-center gap-1.5 text-xs font-medium ${
                            openAiTestStatus.success ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {openAiTestStatus.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                          <span>{openAiTestStatus.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TARGET EXAM & ACADEMIC PROFILE */}
          {activeTab === 'academic' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#1C382E] bg-[#0D1C17] p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <GraduationCap size={16} className="text-[#4ADE80]" />
                  Target Examination & Syllabus Alignment
                </h3>
                <p className="text-xs text-gray-400">
                  Select your primary syllabus. Examix AI will automatically tailor marking schemes, common exam traps, and LaTeX derivation formats accordingly.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {[
                    'CBSE Class 12 / JEE Main & NEET',
                    'CBSE Class 10 Board Exams',
                    'JEE Advanced / Olympiad Level',
                    'ICSE / ISC Board Examination',
                    'IB Diploma Programme (DP / HL)',
                    'Cambridge IGCSE & A-Levels',
                    'State Board (MH / UP / TN / AP)',
                    'College / University Engineering'
                  ].map((board) => (
                    <button
                      key={board}
                      type="button"
                      onClick={() => setPreferences({ ...preferences, targetExam: board })}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                        preferences.targetExam === board
                          ? 'border-[#4ADE80] bg-[#4ADE80]/15 text-[#4ADE80] font-semibold'
                          : 'border-[#1C382E] bg-[#081511] text-gray-300 hover:border-white/20'
                      }`}
                    >
                      <span>{board}</span>
                      {preferences.targetExam === board && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#1C382E] bg-[#0D1C17] p-5 space-y-3">
                <h3 className="text-sm font-bold text-white">Preferred Teaching Language & Tone</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'hinglish', label: 'Hinglish (Most Popular)', sub: 'Bilingual conversational' },
                    { id: 'english', label: 'English Only', sub: 'Standard academic' },
                    { id: 'hindi', label: 'Hindi (शुद्ध हिंदी)', sub: 'Hindi terminology' }
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setPreferences({ ...preferences, teachingLanguage: lang.id as any })}
                      className={`flex flex-col p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        preferences.teachingLanguage === lang.id
                          ? 'border-[#4ADE80] bg-[#4ADE80]/15 text-white'
                          : 'border-[#1C382E] bg-[#081511] text-gray-300 hover:border-white/20'
                      }`}
                    >
                      <span className="text-xs font-bold">{lang.label}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">{lang.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VOICE & DISPLAY PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-5">
              
              {/* Voice Mentor Speed */}
              <div className="rounded-2xl border border-[#1C382E] bg-[#0D1C17] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 size={16} className="text-[#4ADE80]" />
                    <h3 className="text-sm font-bold text-white">Voice Mentor Speed</h3>
                  </div>
                  <span className="text-xs font-bold text-[#4ADE80] font-mono">{preferences.voiceSpeed}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={preferences.voiceSpeed}
                  onChange={(e) => setPreferences({ ...preferences, voiceSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-[#4ADE80] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>0.75x (Gentle)</span>
                  <span>1.0x (Normal)</span>
                  <span>1.5x (Fast Revision)</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="rounded-2xl border border-[#1C382E] bg-[#0D1C17] p-5 space-y-4">
                <h3 className="text-sm font-bold text-white">Render & Interactive Features</h3>
                
                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-white block">Auto-play Voice Narration</span>
                    <span className="text-[11px] text-gray-400">Automatically speak short concept explanations on response</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.autoSpeak}
                    onChange={(e) => setPreferences({ ...preferences, autoSpeak: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-[#4ADE80] focus:ring-[#4ADE80] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1 border-t border-white/5 pt-3">
                  <div>
                    <span className="text-xs font-medium text-white block">KaTeX High-Contrast LaTeX Math</span>
                    <span className="text-[11px] text-gray-400">Render crisp mathematical equations with standard SI formatting</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.highContrastMath}
                    onChange={(e) => setPreferences({ ...preferences, highContrastMath: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-[#4ADE80] focus:ring-[#4ADE80] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1 border-t border-white/5 pt-3">
                  <div>
                    <span className="text-xs font-medium text-white block">Multi-Diagram SVG Vector Engine</span>
                    <span className="text-[11px] text-gray-400">Render dark-mode geometric and scientific diagrams seamlessly</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.renderSvgDiagrams}
                    onChange={(e) => setPreferences({ ...preferences, renderSvgDiagrams: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-[#4ADE80] focus:ring-[#4ADE80] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HOTWORDS & SCREEN-OFF OS */}
          {activeTab === 'hotwords' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Feature Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-[#0D1C17] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Mic size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">Multi-Hotword & Screen-Off Engine</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        hotwordSettings.enabled 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                          : 'bg-gray-800 text-gray-400 border-gray-700'
                      }`}>
                        {hotwordSettings.enabled ? 'Active Engine' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      Wake up Examix instantly with custom keywords ("Examix", "Teacher", "Pico", "Nightwave") even when your phone screen is off.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hotwordSettings.enabled}
                      onChange={(e) => {
                        if (onUpdateHotwordSettings) {
                          onUpdateHotwordSettings({ ...hotwordSettings, enabled: e.target.checked });
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4ADE80]"></div>
                  </label>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  id="settings-launch-oled-btn"
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onLaunchOledMode) onLaunchOledMode();
                  }}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-purple-500/30 bg-[#0F1420] hover:bg-[#161C2E] hover:border-purple-400 text-left transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 group-hover:scale-105 transition-transform">
                      <Moon size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-purple-300">Launch OLED Screen-Off Mode</div>
                      <div className="text-[10px] text-gray-400">Deep-black zero battery canvas</div>
                    </div>
                  </div>
                  <Zap size={14} className="text-purple-400" />
                </button>

                <button
                  id="settings-open-matrix-hub-btn"
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenHotwordControlCenter) onOpenHotwordControlCenter();
                  }}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-emerald-500/30 bg-[#0C1B16] hover:bg-[#12271F] hover:border-emerald-400 text-left transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:scale-105 transition-transform">
                      <Sliders size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-emerald-300">Full Hotword Matrix & Android OS</div>
                      <div className="text-[10px] text-gray-400">Thresholds, audio test & Kotlin blueprint</div>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-emerald-400" />
                </button>
              </div>

              {/* Active Hotwords List */}
              <div className="rounded-2xl border border-[#1C382E] bg-[#0D1C17] p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Radio size={14} className="text-emerald-400" />
                    <span>Configured Wake Keywords ({hotwordSettings.hotwords.filter(h => h.enabled).length}/{hotwordSettings.hotwords.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => playWakeChime('wake')}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono cursor-pointer"
                  >
                    <Volume2 size={12} /> Test Chime
                  </button>
                </div>

                <div className="space-y-2">
                  {hotwordSettings.hotwords.map((hw) => {
                    const categoryEmoji: Record<string, string> = {
                      core: '⚡',
                      classroom: '🎓',
                      callout: '🚀',
                      night: '🌙',
                      casual: '💬'
                    };
                    return (
                      <div
                        key={hw.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          hw.enabled
                            ? 'bg-[#12271F]/70 border-emerald-500/30 text-white'
                            : 'bg-black/30 border-white/5 text-gray-400 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base">{categoryEmoji[hw.category] || '🎙️'}</span>
                          <div>
                            <div className="text-xs font-bold font-mono text-emerald-300">"{hw.keyword}"</div>
                            <div className="text-[10px] text-gray-400">{hw.description} • Sensitivity: {Math.round(hw.sensitivity * 100)}%</div>
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={hw.enabled}
                          onChange={(e) => {
                            if (onUpdateHotwordSettings) {
                              const updated = hotwordSettings.hotwords.map(h =>
                                h.id === hw.id ? { ...h, enabled: e.target.checked } : h
                              );
                              onUpdateHotwordSettings({ ...hotwordSettings, hotwords: updated });
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-[#4ADE80] focus:ring-[#4ADE80] cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Power & Acoustic Preferences */}
              <div className="rounded-2xl border border-[#1C382E] bg-[#0D1C17] p-4 space-y-4">
                <div className="text-xs font-bold text-white flex items-center gap-2 pb-2 border-b border-white/5">
                  <BatteryCharging size={14} className="text-emerald-400" />
                  <span>Battery & Audio Feedback</span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-medium text-white block">Inverted Screen-Off Power Saver</span>
                    <span className="text-[11px] text-gray-400">Engage microphone recognition strictly when the phone screen is off</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hotwordSettings.invertedPowerMode}
                    onChange={(e) => {
                      if (onUpdateHotwordSettings) {
                        onUpdateHotwordSettings({ ...hotwordSettings, invertedPowerMode: e.target.checked });
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-[#4ADE80] focus:ring-[#4ADE80] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1 border-t border-white/5 pt-3">
                  <div>
                    <span className="text-xs font-medium text-white block">Acoustic Wake & Sleep Chimes</span>
                    <span className="text-[11px] text-gray-400">Play instant subtle harmonic sine-tones on keyword detection</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hotwordSettings.soundChimeEnabled}
                    onChange={(e) => {
                      if (onUpdateHotwordSettings) {
                        onUpdateHotwordSettings({ ...hotwordSettings, soundChimeEnabled: e.target.checked });
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-[#4ADE80] focus:ring-[#4ADE80] cursor-pointer"
                  />
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-[#1C382E]/70 bg-[#0D1C17]/90">
          <button
            id="reset-settings-defaults-btn"
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            title="Reset all settings to default"
          >
            <RotateCcw size={14} />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              id="cancel-settings-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#1C382E] bg-white/5 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-settings-btn"
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#4ADE80] text-black text-xs font-bold shadow-[0_0_20px_rgba(74,222,128,0.3)] hover:bg-[#34d399] active:scale-95 transition-all cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check size={14} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
