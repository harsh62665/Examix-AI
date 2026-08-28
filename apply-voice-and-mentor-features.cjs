const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Import VoiceMentorModal and Lucide icons if missing
if (!app.includes("import VoiceMentorModal")) {
  app = app.replace(
    "import DrivePickerModal from './components/DrivePickerModal';",
    "import DrivePickerModal from './components/DrivePickerModal';\nimport VoiceMentorModal from './components/VoiceMentorModal';"
  );
}

if (!app.includes('Radio,')) {
  app = app.replace('  Mic,', '  Mic,\n  Radio,\n  Headphones,');
}

// 2. Enhance AssistantMessage component
const aMsgStart = app.indexOf('const AssistantMessage =');
const aMsgEnd = app.indexOf('// User Message Bubble');

const newAssistantMessage = `const AssistantMessage = ({
  msg,
  index,
  onRegenerate
}: {
  msg: ChatMessage;
  index: number;
  onRegenerate?: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

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

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean text thoroughly for natural mentor speech (strip SVG diagrams, KaTeX raw symbols, markdown)
    let cleanText = msg.content
      .replace(/<svg[\\s\\S]*?<\\/svg>/gi, ' Visual diagram shown above. ')
      .replace(/<[^>]*>/g, '')
      .replace(/#{1,6}\\s?/g, '')
      .replace(/\\$\\$[\\s\\S]*?\\$\\$/g, (match) => {
        return match
          .replace(/\\$\\$/g, '')
          .replace(/\\\\frac\\{(.*?)\\}\\{(.*?)\\}/g, '$1 over $2')
          .replace(/\\\\cdot/g, ' times ')
          .replace(/\\\\sqrt\\{(.*?)\\}/g, 'square root of $1')
          .replace(/\\\\times/g, ' multiplied by ');
      })
      .replace(/\\$(.*?)\\$/g, '$1')
      .replace(/(\\*\\*|__)(.*?)\\1/g, '$2')
      .replace(/(\\*|_)(.*?)\\1/g, '$2')
      .replace(/\\[(.*?)\\]\\(.*?\\)/g, '$1')
      .replace(/[|]/g, ' ')
      .replace(/---/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        (v.lang.includes('en') || v.lang.includes('hi')) &&
        (v.name.includes('Natural') ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('David'))
    );
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div className="group w-full py-4 transition-colors">
      <div className="flex items-start max-w-full">
        {/* Content Body */}
        <div className="min-w-0 flex-1">
          <div className="markdown-body">
            <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeRaw, rehypeKatex]}>
              {msg.content}
            </Markdown>
          </div>

          {/* Action Toolbar */}
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 text-gray-400">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#1A1A1A] px-2.5 py-1.5 text-xs font-medium text-gray-300 transition-all hover:border-[#4ADE80]/40 hover:bg-[#4ADE80]/10 hover:text-[#4ADE80] active:scale-95 cursor-pointer"
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
                  : 'border-[#4ADE80]/30 bg-[#1A1A1A] text-gray-200 hover:border-[#4ADE80]/60 hover:bg-[#4ADE80]/10 hover:text-[#4ADE80]'
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
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#1A1A1A] px-2.5 py-1.5 text-xs font-medium text-gray-300 transition-all hover:border-white/20 hover:text-white active:scale-95 cursor-pointer"
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
`;

if (aMsgStart !== -1 && aMsgEnd !== -1) {
  app = app.substring(0, aMsgStart) + newAssistantMessage + '\n' + app.substring(aMsgEnd);
}

// 3. Add showVoiceModal state in App component
if (!app.includes('const [showVoiceModal, setShowVoiceModal] = useState(false);')) {
  app = app.replace(
    '  const [isExportingPDF, setIsExportingPDF] = useState(false);',
    '  const [isExportingPDF, setIsExportingPDF] = useState(false);\n  const [showVoiceModal, setShowVoiceModal] = useState(false);'
  );
}

// 4. Update the Gemini-style Bottom Sheet Modal (+ button) to include "Talk with Mentor (Live Voice)"
const oldGridStart = '{/* Top Row - Horizontal Grid of Quick Capture/Upload Buttons */}';
const newVoiceAndGrid = `{/* Voice-to-Voice Talk to Mentor Spotlight Button */}
                      <div className="max-w-md mx-auto mb-4">
                        <button
                          id="talk-to-mentor-plus-btn"
                          onClick={() => {
                            setShowAttachMenu(false);
                            setShowVoiceModal(true);
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#4ADE80]/40 bg-gradient-to-r from-[#1E293B] via-[#16161A] to-[#101B15] p-3.5 shadow-[0_0_20px_rgba(74,222,128,0.15)] hover:border-[#4ADE80] transition-all hover:scale-[1.01] active:scale-[0.99] text-left cursor-pointer group"
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

                      {/* Top Row - Horizontal Grid of Quick Capture/Upload Buttons */}`;

if (app.includes(oldGridStart) && !app.includes('talk-to-mentor-plus-btn')) {
  app = app.replace(oldGridStart, newVoiceAndGrid);
}

// 5. Mount the <VoiceMentorModal /> at the bottom of the App component before the final closing div
const oldDriveModalMount = '<DrivePickerModal';
if (app.includes(oldDriveModalMount) && !app.includes('<VoiceMentorModal')) {
  const voiceModalMount = `      {/* Voice-to-Voice Mentor Learning Modal */}
      <VoiceMentorModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        modelId={selectedModel}
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
            const newSession: ChatSession = {
              id: newId,
              title: userText.length > 35 ? userText.substring(0, 35) + '...' : userText,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              messages: [userMsg, aiMsg],
              modelId: selectedModel
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
      />\n\n      <DrivePickerModal`;

  app = app.replace(oldDriveModalMount, voiceModalMount);
}

fs.writeFileSync('src/App.tsx', app);
console.log("Successfully updated App.tsx with Voice Mentor Modal and Listen features!");
