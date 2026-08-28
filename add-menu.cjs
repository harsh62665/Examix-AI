const fs = require('fs');

let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

appTsx = appTsx.replace(
  `import {
  Camera,
  BrainCircuit,
  MessageSquare,`,
  `import {
  Camera,
  BrainCircuit,
  MessageSquare,
  HardDrive,
  MonitorUp,`
);

appTsx = appTsx.replace(
  `import ConceptNetwork from './components/ConceptNetwork';`,
  `import ConceptNetwork from './components/ConceptNetwork';\nimport DrivePickerModal from './components/DrivePickerModal';`
);

appTsx = appTsx.replace(
  `  const [inputValue, setInputValue] = useState('');`,
  `  const [inputValue, setInputValue] = useState('');\n  const [showAttachMenu, setShowAttachMenu] = useState(false);\n  const [showDriveModal, setShowDriveModal] = useState(false);`
);

appTsx = appTsx.replace(
  `            {/* Main Gemini-style Input Capsule */}
            <div className="relative flex h-14 sm:h-16 w-full items-center gap-2 sm:gap-3 rounded-full border border-white/15 bg-[#18181B]/95 px-3 sm:px-4 shadow-2xl backdrop-blur-xl focus-within:border-white/30 transition-all">
              <label
                id="attach-file-btn"
                htmlFor="multi-file-upload-input"
                onClick={triggerFileUpload}
                className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-400 hover:bg-white/5 hover:text-white transition-colors active:scale-95"
                title="Attach study photos or documents"
              >
                <Plus size={22} />
              </label>`,
  `            {/* Main Gemini-style Input Capsule */}
            <div className="relative flex h-14 sm:h-16 w-full items-center gap-2 sm:gap-3 rounded-full border border-white/15 bg-[#18181B]/95 px-3 sm:px-4 shadow-2xl backdrop-blur-xl focus-within:border-white/30 transition-all">
              <div className="relative">
                <button
                  id="attach-file-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowAttachMenu(!showAttachMenu);
                  }}
                  className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-400 hover:bg-white/5 hover:text-white transition-colors active:scale-95"
                  title="Attach file"
                >
                  <Plus size={22} className={\`transition-transform duration-200 \${showAttachMenu ? 'rotate-45' : ''}\`} />
                </button>
                
                {showAttachMenu && (
                  <div className="absolute bottom-full left-0 mb-3 w-48 rounded-2xl border border-white/10 bg-[#1E1E1E] p-1.5 shadow-2xl z-50">
                    <button
                      onClick={() => {
                        setShowAttachMenu(false);
                        triggerFileUpload();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/10 transition-colors"
                    >
                      <MonitorUp size={16} className="text-blue-400" />
                      Upload from Device
                    </button>
                    <button
                      onClick={() => {
                        setShowAttachMenu(false);
                        setShowDriveModal(true);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/10 transition-colors"
                    >
                      <HardDrive size={16} className="text-[#22C55E]" />
                      Google Drive
                    </button>
                  </div>
                )}
              </div>`
);

appTsx = appTsx.replace(
  `        </div>
      </div>
    </div>
  );
}`,
  `        </div>
      </div>
      
      {showDriveModal && (
        <DrivePickerModal
          onClose={() => setShowDriveModal(false)}
          onSelect={(files) => {
            const newAttachments = files.map(file => ({
              id: Math.random().toString(36).substring(2, 9),
              name: file.name,
              size: file.content.length || (file.dataUrl ? file.dataUrl.length : 0),
              type: file.mimeType,
              dataUrl: file.dataUrl,
              textContent: file.content
            }));
            
            setPendingAttachments(prev => [...prev, ...newAttachments]);
            setShowDriveModal(false);
          }}
        />
      )}
    </div>
  );
}`
);

fs.writeFileSync('src/App.tsx', appTsx);
