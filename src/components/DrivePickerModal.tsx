import { useState, useEffect } from 'react';
import { X, Search, FileText, Image as ImageIcon, File, Loader2, Folder, HardDrive, Sparkles, CheckCircle2 } from 'lucide-react';
import { getAccessToken, googleSignIn, VAULT_FOLDER_NAME, getStoredProfile } from '../lib/firebase';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

interface DrivePickerModalProps {
  onClose: () => void;
  onSelect: (files: { name: string; content: string; mimeType: string; dataUrl?: string }[]) => void;
}

export default function DrivePickerModal({ onClose, onSelect }: DrivePickerModalProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [filterVaultOnly, setFilterVaultOnly] = useState(false);

  const profile = getStoredProfile();

  const fetchFiles = async (query = '', vaultOnly = filterVaultOnly) => {
    try {
      setLoading(true);
      setError(null);
      let token = await getAccessToken();
      
      if (!token) {
        setNeedsAuth(true);
        setLoading(false);
        return;
      }
      
      let q = "trashed = false";
      if (query) {
        q += ` and name contains '${query}'`;
      }
      
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=recency desc&pageSize=35&fields=files(id,name,mimeType,parents)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.status === 401 || res.status === 403) {
        setNeedsAuth(true);
        setLoading(false);
        return;
      }
      
      if (!res.ok) throw new Error('Failed to fetch files from Google Drive');
      
      const data = await res.json();
      setFiles(data.files || []);
      setNeedsAuth(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleLogin = async () => {
    try {
      setIsSigningIn(true);
      await googleSignIn();
      setNeedsAuth(false);
      await fetchFiles();
    } catch (err: any) {
      setError('Login failed: ' + err.message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSelectFile = async (file: DriveFile) => {
    try {
      setDownloadingId(file.id);
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      let content = "";
      let dataUrl = undefined;
      
      const isGoogleWorkspace = file.mimeType.startsWith('application/vnd.google-apps');
      
      if (isGoogleWorkspace) {
        // Export Workspace documents
        let exportMime = 'text/plain';
        if (file.mimeType.includes('spreadsheet')) exportMime = 'text/csv';
        
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(exportMime)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to export document');
        content = await res.text();
      } else {
        // Download regular files
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to download file');
        
        if (file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf') {
          const blob = await res.blob();
          dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } else {
          content = await res.text();
        }
      }
      
      onSelect([{ name: file.name, content, mimeType: file.mimeType, dataUrl }]);
    } catch (err: any) {
      setError('Failed to download file: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const renderIcon = (mimeType: string) => {
    if (mimeType.includes('document') || mimeType.includes('text')) return <FileText size={18} className="text-blue-400" />;
    if (mimeType.includes('image')) return <ImageIcon size={18} className="text-emerald-400" />;
    if (mimeType.includes('json')) return <Sparkles size={18} className="text-[#4ADE80]" />;
    return <File size={18} className="text-gray-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-[#1C382E] bg-[#081511] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1C382E]/70 p-4 sm:p-5 bg-[#0D1C17]/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30 shadow">
              <HardDrive size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Google Drive Integration</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#4ADE80]/20 px-2 py-0.5 text-[10px] font-semibold text-[#4ADE80] border border-[#4ADE80]/40">
                  <CheckCircle2 size={10} /> Live Synced
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                {profile?.email ? `Connected as ${profile.email}` : 'Access study files and mastery vault backups'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-[#1C382E] bg-white/5 p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        
        {needsAuth ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-[#081511]">
            <div className="mb-4 rounded-3xl bg-[#4ADE80]/10 p-5 text-[#4ADE80] border border-[#4ADE80]/20 shadow-[0_0_25px_rgba(74,222,128,0.15)]">
              <svg className="h-12 w-12" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#FFC107" d="M17 14.5L14 9H43l3 5.5z"/>
                <path fill="#1976D2" d="M14 9l-3 5.5L25.5 44 28 39z"/>
                <path fill="#4CAF50" d="M46 14.5L31.5 39l-2.5-4.5 11.5-20z"/>
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">Connect Google Drive</h3>
            <p className="mb-6 max-w-sm text-xs text-gray-400 leading-relaxed">
              Sign in with your Google Account to synchronize your Mastery Vault and import textbook notes or question papers.
            </p>
            <button
              onClick={handleLogin}
              disabled={isSigningIn}
              className="flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-xs font-bold text-gray-900 shadow-md hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
            >
              {isSigningIn ? <Loader2 size={16} className="animate-spin text-black" /> : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              )}
              <span>Sign in with Google</span>
            </button>
          </div>
        ) : (
          <>
            {/* Search and Vault banner */}
            <div className="border-b border-[#1C382E]/70 p-3 sm:p-4 bg-[#0A1713] space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search PDFs, notes, questions, or vault files..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchFiles(search)}
                  className="w-full rounded-xl bg-[#0D1C17] border border-[#1C382E] py-2 pl-10 pr-4 text-xs text-white placeholder-gray-500 outline-none focus:border-[#4ADE80]/50"
                />
              </div>

              {/* Vault shortcut chip */}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Folder size={13} className="text-[#4ADE80]" />
                  <span>Target Folder: <strong className="text-white font-mono">{VAULT_FOLDER_NAME}</strong></span>
                </div>
                <button
                  onClick={() => fetchFiles(search)}
                  className="text-[11px] text-[#4ADE80] hover:underline cursor-pointer"
                >
                  Refresh Files
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 bg-[#081511]">
              {loading ? (
                <div className="flex h-full items-center justify-center text-[#4ADE80]">
                  <Loader2 size={32} className="animate-spin" />
                </div>
              ) : error ? (
                <div className="p-4 text-center text-xs text-red-400">{error}</div>
              ) : files.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">No files found in Google Drive</div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {files.map(file => (
                    <button
                      key={file.id}
                      onClick={() => handleSelectFile(file)}
                      disabled={downloadingId === file.id}
                      className="flex w-full items-center gap-3 rounded-2xl border border-[#1C382E]/50 bg-[#0D1C17]/60 p-3 text-left transition-all hover:bg-white/5 hover:border-[#4ADE80]/40 active:bg-white/10 cursor-pointer"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#12271F] border border-[#1C382E]">
                        {downloadingId === file.id ? <Loader2 size={18} className="animate-spin text-[#4ADE80]" /> : renderIcon(file.mimeType)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-white">{file.name}</div>
                        <div className="truncate text-[10px] text-gray-500 font-mono">
                          {file.mimeType.split('.').pop() || file.mimeType}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
