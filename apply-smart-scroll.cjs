const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add ArrowDown to lucide-react imports if missing
if (!app.includes('ArrowDown,')) {
  app = app.replace('  ArrowRight,', '  ArrowRight,\n  ArrowDown,');
}

// 2. Add state & refs for smart scroll and bottom glow
const searchState = '  const [isExportingPDF, setIsExportingPDF] = useState(false);';
const addScrollState = `  const [isExportingPDF, setIsExportingPDF] = useState(false);
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
  };`;

if (!app.includes('isUserScrolledUp')) {
  app = app.replace(searchState, addScrollState);
}

// 3. Replace the old auto-scroll useEffect
const oldScrollEffect = `  // Auto-scroll to latest message or thinking state
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSubmitting, pendingAttachments]);`;

const newScrollEffect = `  // Smart Scroll Management: Preserve user reading position & display ambient bottom glow
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
  }, [messages, isSubmitting]);`;

if (app.includes(oldScrollEffect)) {
  app = app.replace(oldScrollEffect, newScrollEffect);
}

// 4. Update handleSend to set userInitiatedSendRef.current = true
if (!app.includes('userInitiatedSendRef.current = true;')) {
  app = app.replace(
    '    setInputValue(\'\');\n    setPendingAttachments([]);\n    setIsSubmitting(true);',
    '    userInitiatedSendRef.current = true;\n    setInputValue(\'\');\n    setPendingAttachments([]);\n    setIsSubmitting(true);'
  );
}

// 5. Update <main> tag to include ref={mainScrollRef} onScroll={handleScroll}
const oldMain = '<main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 scrollbar-thin">';
const newMain = '<main ref={mainScrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 scrollbar-thin relative">';

if (app.includes(oldMain)) {
  app = app.replace(oldMain, newMain);
}

// 6. Add Bottom Glow Wave & Jump to New Response Button before <footer>
const oldFooter = '{/* Gemini-Style Floating Bottom Input Dock */}';
const newGlowAndFooter = `{/* Ambient Bottom Light Wave (Halki si roshni jab response aata hai) */}
        <div
          className={\`pointer-events-none absolute bottom-20 left-0 right-0 h-36 bg-gradient-to-t from-[#4ADE80]/20 via-[#4ADE80]/5 to-transparent transition-opacity duration-1000 ease-out z-20 \${
            showBottomGlow ? 'opacity-100' : 'opacity-0'
          }\`}
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-[2px] bg-gradient-to-r from-transparent via-[#4ADE80] to-transparent blur-[2px] opacity-80" />
        </div>

        {/* Floating Jump to New Response Pill (Visible when user was reading above) */}
        {hasNewResponseBelow && isUserScrolledUp && (
          <button
            id="jump-to-new-response-btn"
            onClick={scrollToBottom}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border border-[#4ADE80]/50 bg-[#161618]/95 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_rgba(74,222,128,0.35)] backdrop-blur-md transition-all hover:scale-105 hover:bg-[#1f1f23] active:scale-95 animate-bounce cursor-pointer"
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

        {/* Gemini-Style Floating Bottom Input Dock */}`;

if (!app.includes('jump-to-new-response-btn')) {
  app = app.replace(oldFooter, newGlowAndFooter);
}

fs.writeFileSync('src/App.tsx', app);
console.log("App.tsx updated with smart scroll and ambient bottom light glow!");
