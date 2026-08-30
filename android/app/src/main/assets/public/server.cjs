var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_openai = __toESM(require("openai"), 1);
var ai = new import_genai.GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new import_openai.default({ apiKey: process.env.OPENAI_API_KEY });
}
var systemInstruction = `# MASTER SYSTEM INSTRUCTION: EXAMIX AI \u2014 40-FEATURE MULTIMODAL & ZERO-BUG TUTOR ENGINE

You are **Examix AI**, an elite Socratic academic tutor, multimodal visual architect, and exam-sheet engine. Your objective is to generate structured, high-yield, exam-ready revision sheets, conduct active oral/written memorization drills, and systematically eliminate student error traps until they achieve a 100/100 exam mastery.

---

### ACTIVE SOCRATIC REVISION & SPACED REPETITION (1-3-7-15 DAY MEMORY DECAY ENGINE)

1. **Ebbinghaus Forgetting Curve & Retention Tracker:**
   - The student's knowledge profile tracks memory health across spaced repetition intervals:
     * **Day 1\u20133 (FRESH - 100% Green):** Peak retention, recently practiced.
     * **Day 4\u20137 (WARM - Yellow):** Quizzed as a quick warm-up drill to prevent memory drop.
     * **Day 15+ (DECAYED - Red/Orange):** Crosses the Ebbinghaus forgetting threshold; drops automatically into \`Needs Revision\` badge until tested again.
     * **After 3 consecutive successful checks (PERMANENT_LOCK - Gold Shield \u{1F6E1}\uFE0F):** Consolidated into permanent long-term memory. Next review is extended to 30+ days.

2. **Contextual Revision Pop-Up (Active Retrieval):**
   - When the student starts a new chat or asks a doubt:
     * Check if any topic in the profile has a \`DECAYED\` status (>15 days without recall) or active error log entry.
     * Automatically ask 1 surprise recall checkpoint before answering the new prompt:
       > \u{1F9E0} **15-Day Memory Retention Check:**
       > *Aage badhne se pehle dekhte hain purani cheez yaad hai ya bhool gaye: [1-line conceptual question testing the decayed concept/trap].*

3. **Outcome & Auto-Mastery Logic:**
   - **If Correct:**
     * Increment \`streak_count\` (e.g. 1 -> 2, 2 -> 3).
     * If \`streak_count >= 3\`, award \`PERMANENT_LOCK\` (Gold Shield status) and extend the next review interval to 30 days.
     * Mark status as \`MASTERED\`, \`confidence_score: 1.0\`, \`last_error: null\`.
     * Emit \`system_sync\` JSON block with \`status: "MASTERED"\`, \`streak_count\`, and \`retention_level: "PERMANENT_LOCK" | "FRESH"\`.
   - **If Incorrect / Forgotten:**
     * Reset \`streak_count\` to 0.
     * Move concept back to \`Error Log (Needs Revision)\` with \`retention_level: "DECAYED"\`.
     * Deliver an immediate 20-second remediation card / intuitive micro-analogy.

4. **Oral Voice Revision Sync (Voice Mode):**
   - When in Voice/Oral Mode, orally inject the 15-day check:
     *"Age badhne se pehle, 15-day spaced repetition check karte hain: [Quick question]. Jaldi se bolo!"*
   - Reinforce positive oral feedback immediately upon correct response.

---

### PDF REVISION SHEET & OUTPUT STRUCTURE (STANDARDIZED EXAM FORMAT)
When generating revision sheets, study notes, or comprehensive concept lessons, format your response strictly using this standardized Markdown structure:

# \u{1F4CC} [Topic Name] \u2014 Exam Quick Revision Sheet
**Subject / Level:** [Subject Name] | **Target:** Board / Competitive Exams

---

### 1. \u{1F3AF} Core Definition & Standard Statement
* Provide the exact, high-scoring definition as expected in formal exam answer sheets (concise, precise, 2\u20133 sentences).
* State the fundamental law/principle clearly.

---

### 2. \u{1F4D0} Mathematical Formula & Units
* **Primary Equation:** Write standalone equations using standard display LaTeX ($$ ... $$).
* **Variable Breakdown:** 
  * $variable_1$: Explanation + Standard SI Unit
  * $variable_2$: Explanation + Standard SI Unit
* **Constants & Values:** Explicitly state constant values, dimensions, and SI units.

---

### 3. \u26A0\uFE0F Exam Traps & Common Student Mistakes
* **Trap 1:** [E.g., Medium change / Permittivity trap]
* **Trap 2:** [E.g., Unit conversion trap like cm to m or sign convention]
* **Trap 3:** [E.g., Vector direction / Action-Reaction mistake]

---

### 4. \u{1F9E0} Quick Memory Lock & Proportionality Rules
* Relationship 1 (e.g., If distance doubles $\\rightarrow$ Force becomes $\\frac{1}{4}\\text{th}$).
* Quick mnemonic or intuitive rule to remember the formula under pressure.

---

### 5. \u{1F4DD} Active Verification & Practice Problem (Socratic Hard-Stop)
* **Question:** A high-probability numerical or concept question directly testing the core law.
* **CRITICAL SOCRATIC HARD-STOP MANDATE:** 
  - Output ONLY the question and a thought-provoking challenge prompt.
  - NEVER pre-reveal or output the step-by-step solution, mathematical working, or numerical answer in the same message!
  - Wait for the student to attempt, calculate, or reply before validating and revealing the solution steps.

---

### STRICT FORMATTING & ZERO-BUG CONSTRAINTS

1. **Clean LaTeX Only:** 
   - Always use standard LaTeX for all math: \`$inline$\` for inline terms and \`$$display$$\` for standalone equations.
   - Do NOT use raw text symbols (like \`^2\`, \`*\`) for formulas.
2. **Never Wrap Regular Text in Code Blocks:**
   - Headings (\`###\`), explanatory text, mathematical formulas, bullet points, and next steps must NEVER be placed inside \`\`\`code \`\`\`, \`\`\`markdown \`\`\`, or \`\`\`text \`\`\` blocks.
3. **Explicit Single-Block SVG Rule (Zero-Clutter Visual Card):**
   - Triple backticks are reserved ONLY for self-contained SVG blocks:
     \`\`\`xml
     <svg viewBox="0 0 500 160" width="100%" xmlns="http://www.w3.org/2000/svg">
       ...
     </svg>
     \`\`\`
   - You MUST close the SVG block immediately with \`\`\` before writing subsequent text.
   - Do NOT add redundant markdown titles above the SVG like "### Visual Diagram" or "SVG Vector" \u2014 the UI renders a clean, headerless interactive card automatically.
4. **Absolute Ban on Stylized Unicode Fonts:**
   - Use ONLY standard plain ASCII / Unicode text (A-Z, a-z, 0-9). 
   - NEVER use gothic, fraktur (e.g. \u{1D570}\u{1D59D}\u{1D586}\u{1D592}\u{1D58E}\u{1D59D}), mathematical bold/italic, cursive, or decorative script Unicode glyphs. Always use standard clean Latin letters.
5. **Socratic Hard-Stop (No Pre-Revealed Answers):**
   - When presenting a "15-Day Memory Retention Check", "Spontaneous Memory Check", or "Active Verification & Practice Problem", ask the question and STOP.
   - Do NOT reveal the solution or answer steps in advance. Await the student's reply.
6. **No Conversational Filler:**
   - Eliminate robotic filler phrases. Start directly with the Socratic Memory Check (if error log is active) and \`# \u{1F4CC} [Topic Name]\` header.
7. **Self-Contained Content:**
   - Output must be a consolidated one-page study cheat sheet, not an incomplete chat fragment.

---

### MODULE 2: MULTI-DIAGRAM SVG VISUAL ENGINE (ONE DIAGRAM = ONE IDEA)
- **Modular Sequential Visuals:** Split multi-step phenomena into sequential SVGs (Setup $\\rightarrow$ Forces/Vectors).
- **Dark-Mode SVG Formatting:** \`viewBox="0 0 500 160"\`, \`width="100%"\`, transparent background, high-contrast labels (\`fill="#FFFFFF"\` or \`fill="#38BDF8"\`, \`font-size="15"\`, \`font-weight="bold"\`, \`text-anchor="middle"\`).
- **Color Scheme:** Positive charges (\`#EF4444\`), Negative charges (\`#3B82F6\`), Vectors (\`#38BDF8\`).
- **Diagram-Explanation Binding:** Every SVG must be followed by a 1\u20132 line "What to Notice" explanation.

---

### MODULE 3: REAL-TIME VOICE TEACHING & MEMORY RECALL
- **Oral Mastery Loop:** Keep voice turns under 20\u201340 words (15\u201330 seconds) per turn to maintain conversational flow.
- **Phonetic Math Translation:** Speak math naturally (e.g., $10^{-19}\\text{ C} \\rightarrow$ *"Dus ki power minus 19 Coulomb"*).
- **Call-and-Repeat Drills:** Ask the student to speak critical constants and formulas aloud to lock them into memory.
- **Instant Barge-In:** Pause output immediately when the student speaks or asks a doubt.

---

### MODULE 4: LOW-BANDWIDTH VISION & CAMERA PIPELINE
- **Smart On-Demand Trigger:** Stream locally on-device; call the vision API only when requested or shutter-tapped.
- **Edge Compression & ROI Cropping:** Downsample frames to 480p/720p WebP (<40 KB) and auto-crop the notebook equation/diagram.
- **Line-by-Line Error Grounding:** Identify student derivation errors by specific line number.

---

### MODULE 5: PERSISTENT MEMORY & SYSTEM INTEGRATION
- **Google Drive Sync:** Read and update \`student_profile.json\` with mastered formulas, weak concepts, and target exam scores.
- **1-Click Gemini Chat Import:** Ingest shared Gemini chat URLs (\`https://gemini.google.com/share/...\`) to load past progress without re-teaching mastered material.
- **Dynamic Action Chips:** End every response with 2\u20133 contextual action pills formatted as:
  \`[Practice 1 Tough Trap]\` \`[Derive Step 2 in Vector Form]\` \`[Lock Formula into Memory]\`

\`\`\`json
{
  "system_sync": {
    "db_update": {
      "topic": "<Current Topic>",
      "concept": "<Evaluated Sub-Concept>",
      "status": "MASTERED | REVISION_NEEDED | CRITICAL_WEAKNESS",
      "confidence_score": 1.0,
      "last_error": null,
      "exam_readiness_score": 100
    },
    "heatmap_ui_trigger": {
      "action": "RESOLVE_ERROR_ITEM",
      "concept_id": "<concept_slug>",
      "status_color": "GREEN | YELLOW | RED",
      "alert_toast": "\u{1F3AF} Concept Mastered: Quantization of Charge is now 100/100!"
    }
  }
}
\`\`\`

[NEXT_STEPS]
- Practice 1 Tough Trap
- Derive Step 2 in Vector Form
- Lock Formula into Memory
[/NEXT_STEPS]`;
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/api/settings/status", (req, res) => {
    res.json({
      hasServerGeminiKey: !!process.env.GEMINI_API_KEY,
      hasServerOpenAiKey: !!process.env.OPENAI_API_KEY,
      defaultModel: "gemini-3.7-flash"
    });
  });
  app.post("/api/settings/verify", async (req, res) => {
    try {
      const { provider, key } = req.body;
      if (!key || typeof key !== "string" || !key.trim()) {
        return res.status(400).json({ valid: false, error: "API key is required." });
      }
      const trimmedKey = key.trim();
      if (provider === "gemini") {
        const testClient = new import_genai.GoogleGenAI({
          apiKey: trimmedKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build"
            }
          }
        });
        const testResult = await testClient.models.generateContent({
          model: "gemini-3.7-flash",
          contents: [{ role: "user", parts: [{ text: "Respond with the word OK." }] }]
        });
        if (testResult.text) {
          return res.json({ valid: true, message: "Google Gemini API key verified successfully!" });
        } else {
          return res.status(400).json({ valid: false, error: "Empty response during key verification." });
        }
      } else if (provider === "openai") {
        const testOpenAi = new import_openai.default({ apiKey: trimmedKey });
        await testOpenAi.models.list();
        return res.json({ valid: true, message: "OpenAI API key verified successfully!" });
      } else {
        return res.status(400).json({ valid: false, error: "Unknown provider specified." });
      }
    } catch (err) {
      console.warn("API key verification error:", err?.message);
      return res.status(400).json({
        valid: false,
        error: err?.message || "Verification failed. Please check key validity."
      });
    }
  });
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, model: requestedModel, mode, memory, cognitive_graph } = req.body;
      const customGeminiKey = req.headers["x-gemini-api-key"] || req.body?.customGeminiKey;
      const customOpenAiKey = req.headers["x-openai-api-key"] || req.body?.customOpenAiKey;
      const activeGenAiClient = customGeminiKey ? new import_genai.GoogleGenAI({
        apiKey: customGeminiKey.trim(),
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      }) : ai;
      const activeOpenAiClient = customOpenAiKey ? new import_openai.default({ apiKey: customOpenAiKey.trim() }) : openai;
      if (requestedModel === "gemini-3.1-flash-image" || requestedModel === "gemini-3.1-flash-lite-image" || requestedModel === "image-generation-model") {
        const lastMsg = messages && messages.length > 0 ? messages[messages.length - 1] : { content: "educational diagram" };
        const userPrompt = lastMsg.content || "A detailed scientific concept diagram";
        if (messages && messages.length > 0) {
          messages[messages.length - 1].content = `Create a highly detailed, colored, labeled SVG diagram explaining: "${userPrompt}". 
- Use clean, modern colors (Tailwind color palette preferred).
- Make sure all labels are clear and readable with font-size >= 14px.
- Output ONLY raw HTML/SVG code for the diagram. Ensure the <svg> tag has appropriate viewBox and width="100%" height="auto".
- DO NOT wrap the SVG in markdown code blocks like \`\`\`html. Do not use <div> wrappers to avoid HTML nesting issues.
- Below the SVG, provide a brief, intuitive explanation of the concept in the user's language (Hinglish/Hindi/English).`;
        }
        req.body.model = "gemini-3.7-flash";
      }
      let memoryContext = "";
      if (cognitive_graph && cognitive_graph.concept_nodes && Object.keys(cognitive_graph.concept_nodes).length > 0) {
        const now = Date.now();
        const nodes = Object.values(cognitive_graph.concept_nodes);
        const overdueOrDecayed = nodes.filter((n) => {
          const isOverdue = n.decay_due_date ? new Date(n.decay_due_date).getTime() <= now : false;
          return isOverdue || n.status === "CRITICAL_WEAKNESS" || n.status === "NEEDS_REVISION" || n.retention_strength && n.retention_strength < 0.6;
        });
        const masteredLocked = nodes.filter((n) => n.status === "MASTERED_LOCKED" || n.streak_count && n.streak_count >= 3);
        const warmNodes = nodes.filter((n) => !overdueOrDecayed.includes(n) && !masteredLocked.includes(n));
        memoryContext = `

=====================================================
### NEURO-SYNC DUAL-BRAIN COGNITIVE GRAPH (EBBINGHAUS DECAY MATRIX)
=====================================================
Overall Student Readiness Score: ${cognitive_graph.overall_readiness_score || 78}%

\u{1F9E0} LIVE COGNITIVE GRAPH NODES:
${overdueOrDecayed.length > 0 ? `\u{1F6A8} DECAYED / OVERDUE RETRIEVAL NODES (${overdueOrDecayed.length} concepts):
${overdueOrDecayed.map((n) => `- [${n.status}] "${n.name}" (ID: ${n.id}) | Retention Health: ${Math.round((n.retention_strength || 0.4) * 100)}% | Streak: ${n.streak_count || 0}${n.known_traps && n.known_traps.length > 0 ? ` | Known Traps: ${n.known_traps.join("; ")}` : ""}`).join("\n")}` : "- (All concept nodes currently fresh)"}

${warmNodes.length > 0 ? `\u{1F7E1} WARM ACTIVE NODES:
${warmNodes.map((n) => `- [${n.status}] "${n.name}" | Health: ${Math.round((n.retention_strength || 0.7) * 100)}% | Streak: ${n.streak_count || 1}`).join("\n")}` : ""}

${masteredLocked.length > 0 ? `\u{1F6E1}\uFE0F MASTERED & LOCKED (Permanent Long-Term Storage):
${masteredLocked.map((n) => `- [MASTERED_LOCKED] "${n.name}" | Health: 100% | Streak: ${n.streak_count || 3} \u{1F525}`).join("\n")}` : ""}

\u{1F3AF} DYNAMIC INTERRUPTER DIRECTIVE (SPACED SURPRISE RETRIEVAL):
${overdueOrDecayed.length > 0 ? `A decayed/overdue concept node is due for retrieval: "${overdueOrDecayed[0].name}" (Known Trap: ${overdueOrDecayed[0].known_traps?.[0] || "Formula application"}).
1. At the very top of your response before answering the new doubt, inject a 10-second rapid-fire recall challenge:
   > \u{1F9E0} **15-Day Memory Retention Check (Neuro-Sync Spaced Retrieval):**
   > *Aage badhne se pehle dekhte hain purana concept yaad hai ya bhool gaye: [1-line targeted question testing "${overdueOrDecayed[0].name}"]*
2. Socratic Hard-Stop: Ask the question and wait for the student's reply without pre-revealing the answer.
3. When the student attempts or solves this, emit the \`system_sync\` block with updated status, confidence, and retention.` : "All concept nodes are currently in a high-retention state. Proceed directly with high-yield instruction."}
=====================================================`;
      } else if (memory && Array.isArray(memory) && memory.length > 0) {
        const now = Date.now();
        const analyzed = memory.map((m) => {
          const lastTested = m.last_tested_date ? new Date(m.last_tested_date).getTime() : m.lastUpdated || now;
          const daysElapsed = Math.max(0, Math.floor((now - lastTested) / (1e3 * 60 * 60 * 24)));
          let retentionLevel = m.retention_level || "FRESH";
          if ((m.streak_count || 0) >= 3 || retentionLevel === "PERMANENT_LOCK") {
            retentionLevel = "PERMANENT_LOCK";
          } else if (daysElapsed > 14) {
            retentionLevel = "DECAYED";
          } else if (daysElapsed > 3) {
            retentionLevel = "WARM";
          } else {
            retentionLevel = "FRESH";
          }
          return {
            ...m,
            daysElapsed,
            retentionLevel,
            streak: m.streak_count || 0
          };
        });
        const decayedItems = analyzed.filter((m) => m.retentionLevel === "DECAYED" || m.status !== "Mastered");
        const warmItems = analyzed.filter((m) => m.retentionLevel === "WARM");
        const permanentItems = analyzed.filter((m) => m.retentionLevel === "PERMANENT_LOCK");
        const freshItems = analyzed.filter((m) => m.retentionLevel === "FRESH" && m.status === "Mastered");
        memoryContext = `

=====================================================
### CURRENT STUDENT KNOWLEDGE GRAPH (EBBINGHAUS 1-3-7-15 DAY DECAY ENGINE)
=====================================================
\u{1F9E0} MEMORY HEALTH & DECAY TRACKER:
${decayedItems.length > 0 ? `\u{1F6A8} DECAYED / NEEDS REVISION (${decayedItems.length} concepts >15 days without recall or with logged errors):
${decayedItems.map((m) => `- [${m.retentionLevel}] "${m.concept}" (${m.topic || "General"}) | Last tested: ${m.daysElapsed}d ago | Streak: ${m.streak}${m.lastError ? ` | Trap: ${m.lastError}` : ""}`).join("\n")}` : "- (0 decayed items)"}

${warmItems.length > 0 ? `\u{1F7E1} WARM-UP DUE (Days 4\u20137):
${warmItems.map((m) => `- [WARM] "${m.concept}" | Last tested: ${m.daysElapsed}d ago | Streak: ${m.streak}`).join("\n")}` : ""}

${permanentItems.length > 0 ? `\u{1F6E1}\uFE0F PERMANENT LOCK (Gold Shield - Consolidated into Long-term Memory):
${permanentItems.map((m) => `- [PERMANENT_LOCK] "${m.concept}" | Streak: ${m.streak} \u{1F525} | Retained permanently`).join("\n")}` : ""}

${freshItems.length > 0 ? `\u{1F7E2} FRESH (Days 1\u20133 Peak Retention):
${freshItems.map((m) => `- [FRESH] "${m.concept}" | Tested ${m.daysElapsed}d ago | Streak: ${m.streak}`).join("\n")}` : ""}

\u{1F3AF} ACTIVE RETRIEVAL DIRECTIVE (15-DAY RETENTION POP-UP):
${decayedItems.length > 0 ? `The student has decayed concepts (>15 days without active recall): [${decayedItems.map((e) => e.concept).join(", ")}].
1. At the very top of your response before answering the new prompt (or when starting a conversation / doubt), inject 1 surprise recall checkpoint formatted as:
   > \u{1F9E0} **15-Day Memory Retention Check:**
   > *Aage badhne se pehle dekhte hain purani cheez yaad hai ya bhool gaye: [1-line conceptual question testing ${decayedItems[0].concept}]*
2. If the student answers correctly in their reply:
   - Increment their streak count. If streak reaches 3, award PERMANENT_LOCK (Gold Shield).
   - Emit system_sync with status "MASTERED", "retention_level": "PERMANENT_LOCK" or "FRESH", "streak_count": ${(decayedItems[0].streak || 0) + 1}.
3. If they answer incorrectly:
   - Reset streak to 0, mark "DECAYED", and deliver an immediate 20-second remediation card.` : "Spaced repetition schedule is on track. Test prerequisite concepts with quick warm-up checks."}
=====================================================`;
      }
      const isVoiceVision = mode === "voice" || mode === "live_voice_vision" || mode === "screen_off_voice";
      const isScreenOffVoice = mode === "screen_off_voice";
      const isTeachingMode = mode === "Teaching Mode" || mode === "Guided Learning";
      let activeSystemInstruction = `${systemInstruction}${memoryContext}`;
      if (isScreenOffVoice) {
        activeSystemInstruction += `

=====================================================
  EXAMIX AI - SCREEN-OFF ORAL TUTORING & AUDITORY MASTERY DIRECTIVE
=====================================================
The student is currently listening with their **SCREEN OFF / DISPLAY ASLEEP** (hands-free via earphones or speaker).
Because the student cannot see any visual diagram or display:
1. **Auditory Cadence Constraint:**
   - Keep your entire spoken response strictly between **25 to 45 words (15 to 30 seconds max)**.
   - Deliver clear, direct, and conversational explanations without preamble or pleasantries.
2. **Conversational Spoken Phonetics for Equations:**
   - Never output raw unpronounceable LaTeX syntax in spoken prose. Convert all math to vivid conversational audio:
     * e.g., Speak "$F = \\frac{1}{4\\pi\\varepsilon_0}\\frac{q_1 q_2}{r^2}$" as: "Coulomb force is equal to 9 into 10 to the power 9, multiplied by q1 into q2, divided by r-square."
     * e.g., Speak "$q = ne$" as: "Total charge q equals n multiplied by elementary charge e."
3. **Hands-Free Socratic Checkpoint:**
   - End with a quick 1-sentence verbal checkpoint or prompt for the student to speak aloud.
4. **Instant Remediation:**
   - If the student answers incorrectly, give a 15-second oral hint and ask them to state the missing variable.`;
      } else if (isTeachingMode || isVoiceVision) {
        activeSystemInstruction += `

=====================================================
  EXAMIX AI - REAL-TIME VOICE TEACHING & MEMORY ENGINE (TEACHING MODE ACTIVATED)
=====================================================
You are currently operating in **1-on-1 Voice Teaching & Oral Memorization Mode**.
Function as an elite 1-on-1 oral mentor designed to explain tough concepts simply, test students interactively, and actively help them memorize formulas, definitions, and derivations for a 100/100 exam score.

1. VOICE-FIRST TEACHING & MEMORIZATION ARCHITECTURE (\u092F\u093E\u0926 \u0915\u0930\u0935\u093E\u0928\u0947 \u0915\u093E \u0924\u0930\u0940\u0915\u093E):
Never deliver a long lecture. Break every topic into short conversational exchanges using the Oral Mastery Loop:
- **Step 1 (Intuitive Verbal Hook):** Explain the core idea in 1\u20132 plain-language sentences using daily-life analogies (English, Hindi, or Hinglish based on student preference).
- **Step 2 (Spoken Formula Breakdown):** Break formulas down phonetically. State what each variable stands for and why it matters.
- **Step 3 (Active Oral Recall / Memory Lock):** After stating a crucial definition, constant, or formula, prompt the student to repeat it aloud:
  * Example: "Is constant ki value hai $1.6 \\times 10^{-19}\\text{ C}$. Ek baar mere sath bolo, kitni value hai?"
- **Step 4 (Instant Oral Verification / Socratic Check):** Ask 1 quick calculation or conceptual micro-question. Wait for the student's response before moving forward.
- **Step 5 (Memory Reinforcement Drill):** If the student struggles, provide a mnemonic trick or simplify the step. Do not advance until they speak the correct logic.

2. SPOKEN MATH & SCIENTIFIC PHONETICS (NO RAW LATEX READING):
When speaking out loud, convert complex formulas into clear conversational language:
- Powers / Exponents: Speak $10^{-19}$ as "Ten to the power minus 19" or "Dus ki power minus 19".
- Fractions & Integrals: Speak $\\frac{q_1 q_2}{r^2}$ as "q-one into q-two divided by r-square".
- Symbols & Constants: Speak $\\varepsilon_0$ as "Epsilon-naught" and $\\Delta V$ as "Potential difference / Delta V".
- Canvas Synchronization: While speaking simply, ensure the visual screen displays the exact, rigorous LaTeX rendering:
  $$\\vec{F} = \\frac{1}{4\\pi\\varepsilon_0}\\frac{q_1 q_2}{r^2}\\hat{r}$$

3. CONVERSATIONAL CADENCE & TURN-TAKING:
- **Brevity Rule:** Keep every spoken response within 20 to 45 words (15\u201330 seconds max) to maintain two-way dialogue.
- **Zero Robotic Transitions:** Eliminate filler phrases like "Sure, I can help you with that" or "As an AI tutor". Jump directly to the explanation or question.
- **Interruption Handling:** Stop speaking immediately when the student interrupts with a doubt, and directly address their specific confusion.

4. MULTIMODAL CANVAS & GOOGLE DRIVE SYNC:
- Parallel Visual Board: While teaching, project the corresponding clean SVG diagram, roadmap topic highlight, and formula card on the student's screen.
- Persistent Knowledge Graph Update: Log verbal misconceptions, hesitation patterns, and memorization speed into \`student_profile.json\`. Flag unmastered formulas to re-test orally at the start of the next study session.`;
      }
      const formattedMessages = (messages || []).map((msg) => {
        const parts = [];
        if (Array.isArray(msg.images) && msg.images.length > 0) {
          for (const img of msg.images) {
            if (img && img.data) {
              const base64Data = img.data.replace(/^data:[^;]+;base64,/, "");
              parts.push({
                inlineData: {
                  mimeType: img.mimeType || "image/jpeg",
                  data: base64Data
                }
              });
            }
          }
        }
        if (msg.content && msg.content.trim()) {
          parts.push({ text: msg.content });
        } else if (parts.length === 0) {
          parts.push({ text: "Please analyze this." });
        }
        return {
          role: msg.role === "assistant" ? "model" : "user",
          parts
        };
      });
      let lastError = null;
      let textResponse = null;
      let usedModel = requestedModel || "auto";
      if (requestedModel && requestedModel.startsWith("gpt-")) {
        if (!activeOpenAiClient) {
          throw new Error("OPENAI_API_KEY is not configured on the server or provided in settings.");
        }
        const openAiMessages = [
          { role: "system", content: activeSystemInstruction }
        ];
        for (const msg of messages || []) {
          const role = msg.role === "assistant" ? "assistant" : "user";
          if (msg.images && msg.images.length > 0) {
            const contentArray = [{ type: "text", text: msg.content || "Please analyze this." }];
            for (const img of msg.images) {
              if (img && img.data) {
                contentArray.push({
                  type: "image_url",
                  image_url: { url: img.data }
                });
              }
            }
            openAiMessages.push({ role, content: contentArray });
          } else {
            openAiMessages.push({ role, content: msg.content });
          }
        }
        try {
          const response = await activeOpenAiClient.chat.completions.create({
            model: requestedModel,
            messages: openAiMessages
          });
          textResponse = response.choices[0]?.message?.content || "";
          usedModel = requestedModel;
        } catch (err) {
          throw new Error("OpenAI API Error: " + (err.message || String(err)));
        }
      } else {
        const fallbackChain = [
          "gemini-3.7-flash",
          "gemini-flash-latest",
          "gemini-3.1-flash-lite",
          "gemini-3.1-pro-preview"
        ];
        const candidateModels = requestedModel && requestedModel !== "auto" && requestedModel !== "image-generation-model" && requestedModel !== "gemini-3.1-flash-image" ? [requestedModel, ...fallbackChain.filter((m) => m !== requestedModel)] : fallbackChain;
        usedModel = candidateModels[0];
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        let quotaHit = false;
        let highDemandHit = false;
        for (const model of candidateModels) {
          let attempts = 0;
          const maxAttemptsForModel = 2;
          while (attempts < maxAttemptsForModel) {
            attempts++;
            try {
              const response = await activeGenAiClient.models.generateContent({
                model,
                contents: formattedMessages,
                config: {
                  systemInstruction: activeSystemInstruction
                }
              });
              textResponse = response.text || "";
              usedModel = model;
              break;
            } catch (err) {
              lastError = err;
              const errMsg = err?.message || String(err);
              const isQuotaExhausted = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota") || errMsg.includes("QuotaFailure") || errMsg.includes("limit: 0");
              if (isQuotaExhausted) {
                quotaHit = true;
                console.warn(`Model ${model} quota exhausted, falling back to next candidate model.`);
                break;
              }
              const isHighDemandOrUnavailable = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand") || errMsg.includes("temporarily unavailable") || errMsg.includes("fetch failed");
              if (isHighDemandOrUnavailable) {
                highDemandHit = true;
                console.warn(`Model ${model} experiencing high demand (503), trying next model in chain.`);
                break;
              }
              const isNotFoundOrDeprecated = errMsg.includes("404") || errMsg.includes("NOT_FOUND") || errMsg.includes("no longer available");
              if (isNotFoundOrDeprecated) {
                console.warn(`Model ${model} not found or deprecated, falling back.`);
                break;
              }
              console.warn(`Model ${model} attempt ${attempts} error:`, errMsg);
              if (attempts < maxAttemptsForModel) {
                await sleep(400 * attempts);
                continue;
              }
              break;
            }
          }
          if (textResponse !== null) {
            break;
          }
        }
        if (textResponse === null) {
          if (quotaHit) {
            textResponse = "Quota cooling down, retry in 5s. (Free tier limit reached \u2014 please wait a moment).";
            usedModel = "quota-cooldown-fallback";
          } else if (highDemandHit) {
            textResponse = "The AI servers are currently experiencing high demand. Please retry your question in a few moments.";
            usedModel = "high-demand-fallback";
          } else {
            throw lastError || new Error("All model attempts failed");
          }
        }
      }
      res.setHeader("Content-Type", "application/json");
      res.json({
        text: textResponse,
        response: textResponse,
        model: usedModel
      });
    } catch (error) {
      console.error("API error in /api/chat:", error);
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({ error: error.message || "Error processing request" });
    }
  });
  app.post("/api/import-chat", async (req, res) => {
    try {
      const { link, rawText } = req.body;
      if (!link && !rawText) {
        return res.status(400).json({ error: "Please provide a Gemini shared chat link or conversation text." });
      }
      let chatDataToAnalyze = rawText || "";
      if (link && link.startsWith("http")) {
        try {
          const fetchRes = await fetch(link, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            }
          });
          if (fetchRes.ok) {
            const htmlText = await fetchRes.text();
            const cleanedText = htmlText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 15e3);
            chatDataToAnalyze = `Source Shared Link: ${link}

Extracted Web Content:
${cleanedText}

${rawText || ""}`;
          } else {
            chatDataToAnalyze = `Source Shared Link: ${link}

${rawText || ""}`;
          }
        } catch (fetchErr) {
          console.warn("Could not directly fetch share link, will rely on URL and raw text:", fetchErr);
          chatDataToAnalyze = `Source Shared Link: ${link}

${rawText || ""}`;
        }
      }
      const extractionPrompt = `You are Examix AI's Cognitive Knowledge Graph & Memory Extraction Engine.
Analyze the following external Gemini Shared Chat link or conversation transcript.

CHAT CONTENT TO ANALYZE:
========================
${chatDataToAnalyze.substring(0, 2e4)}
========================

Extract the student's learning state, studied concepts, identified traps/mistakes, and cognitive preferences into a clean JSON structure.

Requirements:
1. "topicsCovered": Array of subjects, chapters, and topics discussed (e.g. ["Electrostatics", "Gauss's Law", "Capacitance", "Ray Optics", "Calculus Integrals"]).
2. "identifiedWeaknesses": Array of specific misconceptions, missed negative signs, calculation errors, or confusion points shown by the student.
3. "learningLevel": Brief description of student's level and style (e.g., "CBSE Class 12 / JEE Aspirant - Responds best to intuitive physical analogies and step-by-step mathematical verification").
4. "recommendedNextFocus": 1-2 sentence recommendation for upcoming Examix tutoring sessions targeting these exact weak areas.
5. "extractedConcepts": Array of concept objects for the student's persistent knowledge graph:
   - "concept": string (e.g., "Gauss Law Spherical Symmetry", "Capacitor Energy Density", "Integration by Substitution")
   - "topic": string (e.g., "Physics - Electrostatics")
   - "status": "Mastered" | "Needs Revision" | "Critical Weakness"
   - "lastError": string or null (specific error if student struggled)
   - "confidenceScore": number between 0.0 and 1.0

Return ONLY a valid JSON object matching this schema:
{
  "topicsCovered": ["..."],
  "identifiedWeaknesses": ["..."],
  "learningLevel": "...",
  "recommendedNextFocus": "...",
  "extractedConcepts": [
    {
      "concept": "...",
      "topic": "...",
      "status": "Mastered",
      "lastError": null,
      "confidenceScore": 0.85
    }
  ]
}`;
      const candidateModels = ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
      let jsonResult = null;
      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: extractionPrompt }] }],
            config: {
              responseMimeType: "application/json"
            }
          });
          const text = response.text || "";
          jsonResult = JSON.parse(text);
          break;
        } catch (err) {
          console.warn(`Extraction failed on model ${model}:`, err?.message);
        }
      }
      if (!jsonResult) {
        jsonResult = {
          topicsCovered: ["Imported Gemini Study Session"],
          identifiedWeaknesses: ["Step-by-step formula application and sign conventions"],
          learningLevel: "CBSE / Competitive Exam Aspirant",
          recommendedNextFocus: "Reinforce fundamental derivations and verify prerequisite formulas.",
          extractedConcepts: [
            {
              concept: "Imported Chapter Concepts",
              topic: "Imported Session",
              status: "Needs Revision",
              lastError: "Imported from external Gemini chat",
              confidenceScore: 0.7
            }
          ]
        };
      }
      res.setHeader("Content-Type", "application/json");
      res.json({
        success: true,
        profile: jsonResult
      });
    } catch (error) {
      console.error("Error in /api/import-chat:", error);
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({ error: error.message || "Failed to import and parse shared chat" });
    }
  });
  app.post("/api/neuro-sync/diagnose", async (req, res) => {
    try {
      const { student_turn, previous_context, concept_hint, cognitive_graph } = req.body;
      if (!student_turn || typeof student_turn !== "string" || !student_turn.trim()) {
        return res.status(400).json({ error: "student_turn text or transcript is required." });
      }
      const customGeminiKey = req.headers["x-gemini-api-key"] || req.body?.customGeminiKey;
      const activeGenAi = customGeminiKey ? new import_genai.GoogleGenAI({
        apiKey: customGeminiKey.trim(),
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      }) : ai;
      const knownConceptsList = cognitive_graph?.concept_nodes ? Object.values(cognitive_graph.concept_nodes).map((n) => `- ID: ${n.id} | Name: ${n.name} | Traps: ${n.known_traps?.join(", ")}`).join("\n") : "- physics_coulombs_law_vector: Coulomb Vector Form (Trap: unit vector r_hat direction)\n- physics_electric_dipole_2l: Electric Dipole 2l (Trap: dividing 2l by 2)\n- physics_quantization_charge: Quantization of charge q=ne (Trap: non-integer n)";
      const diagnosticPrompt = `You are Examix AI's Silent Turn-by-Turn Cognitive Diagnostic Parser powered by Gemini Flash.
Your task is to analyze the student's latest turn (text answer or spoken transcript) against the preceding tutor question/context.

CONTEXT:
=============================
Tutor Preceding Context / Question:
${previous_context || "General Socratic academic practice"}

Student's Latest Turn (Answer / Doubt / Voice Transcript):
"${student_turn}"

Optional Concept Hint:
${concept_hint || "Detect from conversation"}

Known Concept Nodes in Student Graph:
${knownConceptsList}
=============================

DIAGNOSTIC CRITERIA:
1. Identify the exact Concept ID and Concept Name being tested.
2. Determine if the student's answer or working is correct (\`is_correct\`: true/false).
3. Detect if the student fell into any known trap (e.g., negative sign, unit vector orientation, dividing 2l dipole separation by 2, unit conversions, missing constants).
4. Verify if mathematical steps and logic are sound (\`calculation_sound\`: true/false).
5. Provide a confidence score (0.0 to 1.0) and a concise 1-sentence remediation hint if incorrect.

Return ONLY a valid JSON object matching this schema:
{
  "concept_id": "physics_coulombs_law_vector",
  "concept_name": "Coulomb's Law in Vector Form",
  "topic": "Physics - Electrostatics",
  "is_correct": true,
  "traps_triggered": ["Reversing unit vector direction"],
  "calculation_sound": true,
  "confidence": 0.95,
  "remediation_hint": "Remember that force on q1 due to q2 acts along r21."
}`;
      const candidateModels = ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
      let diagnosticResult = null;
      for (const model of candidateModels) {
        try {
          const response = await activeGenAi.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: diagnosticPrompt }] }],
            config: {
              responseMimeType: "application/json"
            }
          });
          const text = response.text || "";
          diagnosticResult = JSON.parse(text);
          break;
        } catch (err) {
          console.warn(`Diagnostic parse failed on model ${model}:`, err?.message);
        }
      }
      if (!diagnosticResult) {
        const lower = student_turn.toLowerCase();
        const isGeneralAffirmative = lower.includes("yes") || lower.includes("correct") || lower.includes("samajh gaya");
        diagnosticResult = {
          concept_id: concept_hint || "physics_electrostatics_general",
          concept_name: concept_hint || "Electrostatics & Formula Application",
          topic: "Physics",
          is_correct: isGeneralAffirmative,
          traps_triggered: [],
          calculation_sound: true,
          confidence: 0.8,
          remediation_hint: null
        };
      }
      res.setHeader("Content-Type", "application/json");
      res.json({
        success: true,
        diagnostic: diagnosticResult
      });
    } catch (error) {
      console.error("Error in /api/neuro-sync/diagnose:", error);
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({ error: error.message || "Diagnostic evaluation failed" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
