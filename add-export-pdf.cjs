const fs = require('fs');
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add Download to imports
if (!appTsx.includes('Download,')) {
  appTsx = appTsx.replace('  ArrowRight\n} from \'lucide-react\';', '  ArrowRight,\n  Download,\n  FileDown\n} from \'lucide-react\';');
  appTsx = appTsx.replace('  ArrowRight} from \'lucide-react\';', '  ArrowRight,\n  Download,\n  FileDown\n} from \'lucide-react\';');
}

// 2. Add import for exportChatToPDF
if (!appTsx.includes('exportChatToPDF')) {
  appTsx = appTsx.replace(
    "import { initAuth } from './lib/firebase';",
    "import { initAuth } from './lib/firebase';\nimport { exportChatToPDF } from './lib/pdfExport';"
  );
}

// 3. Add isExportingPDF state and handleExportChat
const stateSearch = '  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);';
const stateAddition = `  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleExportChat = async () => {
    if (!messages || messages.length === 0) {
      showToast('No messages in this chat to export yet.');
      return;
    }
    setIsExportingPDF(true);
    showToast('Generating Study Notes PDF...');
    try {
      await exportChatToPDF(currentSession, messages);
      showToast('Study Notes PDF downloaded successfully!');
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      showToast('Failed to export PDF. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };`;

if (!appTsx.includes('isExportingPDF')) {
  appTsx = appTsx.replace(stateSearch, stateAddition);
}

// 4. Add Export Chat button to header right
const headerSearch = `<button
              id="toggle-concept-map-btn"`;

const headerExportBtn = `{/* Export Chat as Study Notes PDF Button */}
            <button
              id="header-export-chat-btn"
              onClick={handleExportChat}
              disabled={isExportingPDF || messages.length === 0}
              className={\`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all \${
                messages.length === 0
                  ? 'border-white/5 bg-white/5 text-gray-500 cursor-not-allowed opacity-50'
                  : 'border-white/10 bg-[#1A1A1D] text-gray-200 hover:border-[#4ADE80]/50 hover:bg-[#4ADE80]/15 hover:text-[#4ADE80] active:scale-95 cursor-pointer shadow-sm'
              }\`}
              title={messages.length === 0 ? "Start a chat to export study notes" : "Download current chat as PDF study notes"}
            >
              {isExportingPDF ? (
                <>
                  <Loader2 size={14} className="animate-spin text-[#4ADE80]" />
                  <span className="hidden sm:inline">Exporting...</span>
                </>
              ) : (
                <>
                  <Download size={14} className={messages.length > 0 ? "text-[#4ADE80]" : "text-gray-500"} />
                  <span className="hidden sm:inline">Export Chat</span>
                </>
              )}
            </button>

            <button
              id="toggle-concept-map-btn"`;

if (!appTsx.includes('header-export-chat-btn')) {
  appTsx = appTsx.replace(headerSearch, headerExportBtn);
}

fs.writeFileSync('src/App.tsx', appTsx);
console.log("App.tsx successfully updated with Export Chat button and PDF logic!");
