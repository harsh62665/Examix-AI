import { useState, useEffect } from 'react';
import { X, Search, FileText, Image as ImageIcon, File, Loader2 } from 'lucide-react';
import { getAccessToken, googleSignIn } from '../lib/firebase';

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

  const fetchFiles = async (query = '') => {
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
      
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=recency desc&pageSize=30&fields=files(id,name,mimeType)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.status === 401 || res.status === 403) {
        setNeedsAuth(true);
        setLoading(false);
        return;
      }
      
      if (!res.ok) throw new Error('Failed to fetch files');
      
      const data = await res.json();
      setFiles(data.files || []);
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
      fetchFiles();
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
        
        if (file.mimeType.startsWith('image/')) {
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
    return <File size={18} className="text-gray-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#1E1E1E] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="text-lg font-bold text-white">Select from Google Drive</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        {needsAuth ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 rounded-full bg-blue-500/10 p-4 text-blue-500">
              <svg className="h-12 w-12" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#FFC107" d="M17 14.5L14 9H43l3 5.5z"/>
                <path fill="#1976D2" d="M14 9l-3 5.5L25.5 44 28 39z"/>
                <path fill="#4CAF50" d="M46 14.5L31.5 39l-2.5-4.5 11.5-20z"/>
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">Connect Google Drive</h3>
            <p className="mb-6 text-gray-400">Sign in to access your study materials directly from Drive.</p>
            <button
              onClick={handleLogin}
              disabled={isSigningIn}
              className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 font-bold text-gray-900 transition-transform hover:scale-105 active:scale-95"
            >
              {isSigningIn ? <Loader2 size={18} className="animate-spin" /> : null}
              Sign in with Google
            </button>
          </div>
        ) : (
          <>
            <div className="border-b border-white/10 p-4">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchFiles(search)}
                  className="w-full rounded-xl bg-black/40 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex h-full items-center justify-center text-blue-500">
                  <Loader2 size={32} className="animate-spin" />
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-400">{error}</div>
              ) : files.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No files found</div>
              ) : (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {files.map(file => (
                    <button
                      key={file.id}
                      onClick={() => handleSelectFile(file)}
                      disabled={downloadingId === file.id}
                      className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-white/5 active:bg-white/10"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/40">
                        {downloadingId === file.id ? <Loader2 size={18} className="animate-spin text-blue-500" /> : renderIcon(file.mimeType)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">{file.name}</div>
                        <div className="truncate text-xs text-gray-500">
                          {file.mimeType.split('/').pop()}
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
