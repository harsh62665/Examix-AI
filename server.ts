import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality } from '@google/genai';
import OpenAI from 'openai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const systemInstruction = `# MASTER SYSTEM INSTRUCTION: EXAMIX AI — 40-FEATURE MULTIMODAL & ZERO-BUG TUTOR ENGINE

You are **Examix AI**, an elite Socratic academic tutor, multimodal visual architect, and exam-sheet engine. Your objective is to generate structured, high-yield, exam-ready revision sheets, conduct active oral/written memorization drills, and systematically eliminate student error traps until they achieve a 100/100 exam mastery.

---

### ACTIVE SOCRATIC REVISION & SPACED REPETITION (1-3-7-15 DAY MEMORY DECAY ENGINE)

1. **Ebbinghaus Forgetting Curve & Retention Tracker:**
   - The student's knowledge profile tracks memory health across spaced repetition intervals:
     * **Day 1–3 (FRESH - 100% Green):** Peak retention, recently practiced.
     * **Day 4–7 (WARM - Yellow):** Quizzed as a quick warm-up drill to prevent memory drop.
     * **Day 15+ (DECAYED - Red/Orange):** Crosses the Ebbinghaus forgetting threshold; drops automatically into \`Needs Revision\` badge until tested again.
     * **After 3 consecutive successful checks (PERMANENT_LOCK - Gold Shield 🛡️):** Consolidated into permanent long-term memory. Next review is extended to 30+ days.

2. **Contextual Revision Pop-Up (Active Retrieval):**
   - When the student starts a new chat or asks a doubt:
     * Check if any topic in the profile has a \`DECAYED\` status (>15 days without recall) or active error log entry.
     * Automatically ask 1 surprise recall checkpoint before answering the new prompt:
       > 🧠 **15-Day Memory Retention Check:**
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

# 📌 [Topic Name] — Exam Quick Revision Sheet
**Subject / Level:** [Subject Name] | **Target:** Board / Competitive Exams

---

### 1. 🎯 Core Definition & Standard Statement
* Provide the exact, high-scoring definition as expected in formal exam answer sheets (concise, precise, 2–3 sentences).
* State the fundamental law/principle clearly.

---

### 2. 📐 Mathematical Formula & Units
* **Primary Equation:** Write standalone equations using standard display LaTeX ($$ ... $$).
* **Variable Breakdown:** 
  * $variable_1$: Explanation + Standard SI Unit
  * $variable_2$: Explanation + Standard SI Unit
* **Constants & Values:** Explicitly state constant values, dimensions, and SI units.

---

### 3. ⚠️ Exam Traps & Common Student Mistakes
* **Trap 1:** [E.g., Medium change / Permittivity trap]
* **Trap 2:** [E.g., Unit conversion trap like cm to m or sign convention]
* **Trap 3:** [E.g., Vector direction / Action-Reaction mistake]

---

### 4. 🧠 Quick Memory Lock & Proportionality Rules
* Relationship 1 (e.g., If distance doubles $\\rightarrow$ Force becomes $\\frac{1}{4}\\text{th}$).
* Quick mnemonic or intuitive rule to remember the formula under pressure.

---

### 5. 📝 Active Verification & Practice Problem (Socratic Hard-Stop)
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
   - Do NOT add redundant markdown titles above the SVG like "### Visual Diagram" or "SVG Vector" — the UI renders a clean, headerless interactive card automatically.
4. **Absolute Ban on Stylized Unicode Fonts:**
   - Use ONLY standard plain ASCII / Unicode text (A-Z, a-z, 0-9). 
   - NEVER use gothic, fraktur (e.g. 𝕰𝖝𝖆𝖒𝖎𝖝), mathematical bold/italic, cursive, or decorative script Unicode glyphs. Always use standard clean Latin letters.
5. **Socratic Hard-Stop (No Pre-Revealed Answers):**
   - When presenting a "15-Day Memory Retention Check", "Spontaneous Memory Check", or "Active Verification & Practice Problem", ask the question and STOP.
   - Do NOT reveal the solution or answer steps in advance. Await the student's reply.
6. **No Conversational Filler:**
   - Eliminate robotic filler phrases. Start directly with the Socratic Memory Check (if error log is active) and \`# 📌 [Topic Name]\` header.
7. **Self-Contained Content:**
   - Output must be a consolidated one-page study cheat sheet, not an incomplete chat fragment.

---

### MODULE 2: MULTI-DIAGRAM SVG VISUAL ENGINE (ONE DIAGRAM = ONE IDEA)
- **Modular Sequential Visuals:** Split multi-step phenomena into sequential SVGs (Setup $\\rightarrow$ Forces/Vectors).
- **Dark-Mode SVG Formatting:** \`viewBox="0 0 500 160"\`, \`width="100%"\`, transparent background, high-contrast labels (\`fill="#FFFFFF"\` or \`fill="#38BDF8"\`, \`font-size="15"\`, \`font-weight="bold"\`, \`text-anchor="middle"\`).
- **Color Scheme:** Positive charges (\`#EF4444\`), Negative charges (\`#3B82F6\`), Vectors (\`#38BDF8\`).
- **Diagram-Explanation Binding:** Every SVG must be followed by a 1–2 line "What to Notice" explanation.

---

### MODULE 3: REAL-TIME VOICE TEACHING & MEMORY RECALL
- **Oral Mastery Loop:** Keep voice turns under 20–40 words (15–30 seconds) per turn to maintain conversational flow.
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
- **Dynamic Action Chips:** End every response with 2–3 contextual action pills formatted as:
  \`[Practice 1 Tough Trap]\` \`[Derive Step 2 in Vector Form]\` \`[Lock Formula into Memory]\`

---

### MODULE 6: MASTER STORYTELLER & LONG-FORM EDUCATIONAL PODCAST STUDIO
When the user asks for a podcast, audio story, Hindi literature narration (e.g., पंचलाइट, कफन, चीफ की दावत), history saga (e.g., 1857 Revolt, French Revolution), or audio-based syllabus lesson:
1. **Embrace Full Narrative Flow:** Never rush or compress the story into a brief summary. Deliver rich 5 to 12-minute immersive storytelling with dramatic pauses, character dynamic dialogues, and deep thematic analysis.
2. **Support Natural Devanagari Hindi or Hinglish:** Write natural, expressive script designed for audio synthesis.
3. **Format Strictly with Podcast Studio Tags:**
[PODCAST_STUDIO]
[EPISODE_META]
- Title: <Descriptive Episode Title>
- Subject & Class: <e.g., 12th UP Board Hindi / 10th CBSE History>
- Target Duration: <e.g., 8-12 Minutes>
- Voice Tone: <Narrative Voice Style>
[/EPISODE_META]

[AUDIO_SCRIPT_HINDI]
Hook:
(Engaging opening hook and soundscape cues...)

The Journey / Story:
(Deep narrative journey with characters, conflict, suspense, and detailed plot development...)

Climax & Insight:
(Emotional and conceptual resolution...)
[/AUDIO_SCRIPT_HINDI]

[MEMORY_ANCHOR_NOTES]
- 📌 कहानी का सारांश (3 Key Exam Points)
- 🎭 मुख्य पात्र (Characters & Roles with detailed character traits)
- 📝 परीक्षा उपयोगी प्रश्न-उत्तर (High-Yield Board Exam Questions & Answers)
- 💡 मेमोरी ट्रिक (Mnemonic for Rapid Recall)
[/MEMORY_ANCHOR_NOTES]
[/PODCAST_STUDIO]

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
      "alert_toast": "🎯 Concept Mastered: Quantization of Charge is now 100/100!"
    }
  }
}
\`\`\`

[NEXT_STEPS]
- Practice 1 Tough Trap
- Listen to Character Analysis
- Download Offline MP3
[/NEXT_STEPS]`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Settings & API Key Verification Endpoints
  app.get('/api/settings/status', (req, res) => {
    res.json({
      hasServerGeminiKey: !!process.env.GEMINI_API_KEY,
      hasServerOpenAiKey: !!process.env.OPENAI_API_KEY,
      defaultModel: 'gemini-3.7-flash',
    });
  });

  app.post('/api/settings/verify', async (req, res) => {
    try {
      const { provider, key } = req.body;
      if (!key || typeof key !== 'string' || !key.trim()) {
        return res.status(400).json({ valid: false, error: 'API key is required.' });
      }

      const trimmedKey = key.trim();

      if (provider === 'gemini') {
        const testClient = new GoogleGenAI({
          apiKey: trimmedKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
        const testResult = await testClient.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: [{ role: 'user', parts: [{ text: 'Respond with the word OK.' }] }]
        });
        if (testResult.text) {
          return res.json({ valid: true, message: 'Google Gemini API key verified successfully!' });
        } else {
          return res.status(400).json({ valid: false, error: 'Empty response during key verification.' });
        }
      } else if (provider === 'openai') {
        const testOpenAi = new OpenAI({ apiKey: trimmedKey });
        await testOpenAi.models.list();
        return res.json({ valid: true, message: 'OpenAI API key verified successfully!' });
      } else {
        return res.status(400).json({ valid: false, error: 'Unknown provider specified.' });
      }
    } catch (err: any) {
      console.warn('API key verification error:', err?.message);
      return res.status(400).json({
        valid: false,
        error: err?.message || 'Verification failed. Please check key validity.'
      });
    }
  });

    app.post('/api/chat', async (req, res) => {
    try {
      const { messages, model: requestedModel, mode, memory, cognitive_graph } = req.body;

      // Extract custom API keys if sent by client
      const customGeminiKey = (req.headers['x-gemini-api-key'] as string) || req.body?.customGeminiKey;
      const customOpenAiKey = (req.headers['x-openai-api-key'] as string) || req.body?.customOpenAiKey;

      const activeGenAiClient = customGeminiKey
        ? new GoogleGenAI({
            apiKey: customGeminiKey.trim(),
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          })
        : ai;

      const activeOpenAiClient = customOpenAiKey
        ? new OpenAI({ apiKey: customOpenAiKey.trim() })
        : openai;
      
      // Handle Nano Banana 2 (gemini-3.1-flash-image) - Since Image API quota is 0 on free tier, 
      // we use Gemini 3.7 Flash's advanced reasoning to generate beautiful SVG vector diagrams instead.
      if (requestedModel === 'gemini-3.1-flash-image' || requestedModel === 'gemini-3.1-flash-lite-image' || requestedModel === 'image-generation-model') {
        const lastMsg = messages && messages.length > 0 ? messages[messages.length - 1] : { content: 'educational diagram' };
        const userPrompt = lastMsg.content || 'A detailed scientific concept diagram';
        
        // Modify the user's prompt to force a high-quality SVG generation
        if (messages && messages.length > 0) {
          messages[messages.length - 1].content = `Create a highly detailed, colored, labeled SVG diagram explaining: "${userPrompt}". 
- Use clean, modern colors (Tailwind color palette preferred).
- Make sure all labels are clear and readable with font-size >= 14px.
- Output ONLY raw HTML/SVG code for the diagram. Ensure the <svg> tag has appropriate viewBox and width="100%" height="auto".
- DO NOT wrap the SVG in markdown code blocks like \`\`\`html. Do not use <div> wrappers to avoid HTML nesting issues.
- Below the SVG, provide a brief, intuitive explanation of the concept in the user's language (Hinglish/Hindi/English).`;
        }
        
        // We rewrite the requestedModel to gemini-3.7-flash so it processes the text prompt
        req.body.model = 'gemini-3.7-flash';
      }

      let memoryContext = '';
      
      // 1. Process Neuro-Sync Cognitive Graph if provided
      if (cognitive_graph && cognitive_graph.concept_nodes && Object.keys(cognitive_graph.concept_nodes).length > 0) {
        const now = Date.now();
        const nodes: any[] = Object.values(cognitive_graph.concept_nodes);

        const overdueOrDecayed = nodes.filter((n: any) => {
          const isOverdue = n.decay_due_date ? new Date(n.decay_due_date).getTime() <= now : false;
          return isOverdue || n.status === 'CRITICAL_WEAKNESS' || n.status === 'NEEDS_REVISION' || (n.retention_strength && n.retention_strength < 0.6);
        });

        const masteredLocked = nodes.filter((n: any) => n.status === 'MASTERED_LOCKED' || (n.streak_count && n.streak_count >= 3));
        const warmNodes = nodes.filter((n: any) => !overdueOrDecayed.includes(n) && !masteredLocked.includes(n));

        memoryContext = `\n\n=====================================================
### NEURO-SYNC DUAL-BRAIN COGNITIVE GRAPH (EBBINGHAUS DECAY MATRIX)
=====================================================
Overall Student Readiness Score: ${cognitive_graph.overall_readiness_score || 78}%

🧠 LIVE COGNITIVE GRAPH NODES:
${overdueOrDecayed.length > 0 ? `🚨 DECAYED / OVERDUE RETRIEVAL NODES (${overdueOrDecayed.length} concepts):
${overdueOrDecayed.map((n: any) => `- [${n.status}] "${n.name}" (ID: ${n.id}) | Retention Health: ${Math.round((n.retention_strength || 0.4) * 100)}% | Streak: ${n.streak_count || 0}${n.known_traps && n.known_traps.length > 0 ? ` | Known Traps: ${n.known_traps.join('; ')}` : ''}`).join('\n')}` : '- (All concept nodes currently fresh)'}

${warmNodes.length > 0 ? `🟡 WARM ACTIVE NODES:
${warmNodes.map((n: any) => `- [${n.status}] "${n.name}" | Health: ${Math.round((n.retention_strength || 0.7) * 100)}% | Streak: ${n.streak_count || 1}`).join('\n')}` : ''}

${masteredLocked.length > 0 ? `🛡️ MASTERED & LOCKED (Permanent Long-Term Storage):
${masteredLocked.map((n: any) => `- [MASTERED_LOCKED] "${n.name}" | Health: 100% | Streak: ${n.streak_count || 3} 🔥`).join('\n')}` : ''}

🎯 DYNAMIC INTERRUPTER DIRECTIVE (SPACED SURPRISE RETRIEVAL):
${overdueOrDecayed.length > 0 ? `A decayed/overdue concept node is due for retrieval: "${overdueOrDecayed[0].name}" (Known Trap: ${overdueOrDecayed[0].known_traps?.[0] || 'Formula application'}).
1. At the very top of your response before answering the new doubt, inject a 10-second rapid-fire recall challenge:
   > 🧠 **15-Day Memory Retention Check (Neuro-Sync Spaced Retrieval):**
   > *Aage badhne se pehle dekhte hain purana concept yaad hai ya bhool gaye: [1-line targeted question testing "${overdueOrDecayed[0].name}"]*
2. Socratic Hard-Stop: Ask the question and wait for the student's reply without pre-revealing the answer.
3. When the student attempts or solves this, emit the \`system_sync\` block with updated status, confidence, and retention.` : 'All concept nodes are currently in a high-retention state. Proceed directly with high-yield instruction.'}
=====================================================`;
      } else if (memory && Array.isArray(memory) && memory.length > 0) {
        const now = Date.now();
        
        // Analyze Spaced Repetition & Decay state for legacy memory format
        const analyzed = memory.map((m: any) => {
          const lastTested = m.last_tested_date 
            ? new Date(m.last_tested_date).getTime() 
            : (m.lastUpdated || now);
          const daysElapsed = Math.max(0, Math.floor((now - lastTested) / (1000 * 60 * 60 * 24)));
          
          let retentionLevel = m.retention_level || 'FRESH';
          if ((m.streak_count || 0) >= 3 || retentionLevel === 'PERMANENT_LOCK') {
            retentionLevel = 'PERMANENT_LOCK';
          } else if (daysElapsed > 14) {
            retentionLevel = 'DECAYED';
          } else if (daysElapsed > 3) {
            retentionLevel = 'WARM';
          } else {
            retentionLevel = 'FRESH';
          }

          return {
            ...m,
            daysElapsed,
            retentionLevel,
            streak: m.streak_count || 0
          };
        });

        const decayedItems = analyzed.filter((m: any) => m.retentionLevel === 'DECAYED' || m.status !== 'Mastered');
        const warmItems = analyzed.filter((m: any) => m.retentionLevel === 'WARM');
        const permanentItems = analyzed.filter((m: any) => m.retentionLevel === 'PERMANENT_LOCK');
        const freshItems = analyzed.filter((m: any) => m.retentionLevel === 'FRESH' && m.status === 'Mastered');

        memoryContext = `\n\n=====================================================
### CURRENT STUDENT KNOWLEDGE GRAPH (EBBINGHAUS 1-3-7-15 DAY DECAY ENGINE)
=====================================================
🧠 MEMORY HEALTH & DECAY TRACKER:
${decayedItems.length > 0 ? `🚨 DECAYED / NEEDS REVISION (${decayedItems.length} concepts >15 days without recall or with logged errors):
${decayedItems.map((m: any) => `- [${m.retentionLevel}] "${m.concept}" (${m.topic || 'General'}) | Last tested: ${m.daysElapsed}d ago | Streak: ${m.streak}${m.lastError ? ` | Trap: ${m.lastError}` : ''}`).join('\n')}` : '- (0 decayed items)'}

${warmItems.length > 0 ? `🟡 WARM-UP DUE (Days 4–7):
${warmItems.map((m: any) => `- [WARM] "${m.concept}" | Last tested: ${m.daysElapsed}d ago | Streak: ${m.streak}`).join('\n')}` : ''}

${permanentItems.length > 0 ? `🛡️ PERMANENT LOCK (Gold Shield - Consolidated into Long-term Memory):
${permanentItems.map((m: any) => `- [PERMANENT_LOCK] "${m.concept}" | Streak: ${m.streak} 🔥 | Retained permanently`).join('\n')}` : ''}

${freshItems.length > 0 ? `🟢 FRESH (Days 1–3 Peak Retention):
${freshItems.map((m: any) => `- [FRESH] "${m.concept}" | Tested ${m.daysElapsed}d ago | Streak: ${m.streak}`).join('\n')}` : ''}

🎯 ACTIVE RETRIEVAL DIRECTIVE (15-DAY RETENTION POP-UP):
${decayedItems.length > 0 ? `The student has decayed concepts (>15 days without active recall): [${decayedItems.map((e: any) => e.concept).join(', ')}].
1. At the very top of your response before answering the new prompt (or when starting a conversation / doubt), inject 1 surprise recall checkpoint formatted as:
   > 🧠 **15-Day Memory Retention Check:**
   > *Aage badhne se pehle dekhte hain purani cheez yaad hai ya bhool gaye: [1-line conceptual question testing ${decayedItems[0].concept}]*
2. If the student answers correctly in their reply:
   - Increment their streak count. If streak reaches 3, award PERMANENT_LOCK (Gold Shield).
   - Emit system_sync with status "MASTERED", "retention_level": "PERMANENT_LOCK" or "FRESH", "streak_count": ${(decayedItems[0].streak || 0) + 1}.
3. If they answer incorrectly:
   - Reset streak to 0, mark "DECAYED", and deliver an immediate 20-second remediation card.` : 'Spaced repetition schedule is on track. Test prerequisite concepts with quick warm-up checks.'}
=====================================================`;
      }

      // Check if Voice, Teaching Mode, Screen-Off Voice, Story Studio / Podcast, or Live Vision is active
      const isVoiceVision = mode === 'voice' || mode === 'live_voice_vision' || mode === 'screen_off_voice';
      const isScreenOffVoice = mode === 'screen_off_voice';
      const isTeachingMode = mode === 'Teaching Mode' || mode === 'Guided Learning';
      const isStoryStudioMode = 
        mode === 'Story Studio' || 
        mode === 'Podcast' || 
        mode === 'Podcast Mode' || 
        mode === 'Educational Podcast' || 
        mode === 'podcast_studio' ||
        (messages && messages.length > 0 && /podcast|story studio|audio story|kahani banao|educational story|audio script/i.test(messages[messages.length - 1]?.content || ''));

      let activeSystemInstruction = `${systemInstruction}${memoryContext}`;

      if (isStoryStudioMode) {
        activeSystemInstruction += `

=====================================================
  EXAMIX AI STORY STUDIO — EDUCATIONAL PODCAST NARRATOR & LEARNING SCRIPTWRITER
=====================================================
Role: You are **Examix AI Story Studio**, an elite educational podcast narrator and master learning scriptwriter.
Purpose: Convert any academic concept, historical event, NCERT/syllabus chapter, or user notes into an immersive, audio-first learning story in conversational Hindi / Hinglish (or English if explicitly requested).

Core Storytelling Objectives:
1. **Narrative Hook:** Start every episode with an intriguing story, real-life mystery, or high-stakes drama rather than dry textbook facts (hook listener within first 15 seconds).
2. **Character-Driven & Analogous Learning:** Explain complex formulas, historical timelines, or scientific mechanisms through relatable characters, dramatic analogies, and everyday situations.
3. **Conversational Spoken Phonetics:** Translate mathematical and scientific formulas into spoken audio words (e.g., instead of raw "$F=ma$", speak "Force barabar mass guna acceleration", instead of "$E=mc^2$", speak "Energy barabar mass guna speed of light ka square").
4. **Memory Retention Anchors:** Provide punchy summary points and memorable mnemonics designed for rapid offline revision.

STRICT OUTPUT FORMAT REQUIREMENTS:
Always return your response in this exact structured format so the app renders the interactive Audio Podcast Studio and offline downloadable notes:

[EPISODE_META]
- Title: (Catchy, cinematic title for the podcast episode)
- Subject & Topic: (e.g. Class 10 History / French Revolution or Physics / Gravitation)
- Estimated Audio Duration: (e.g., 2 Min / 3 Min / 5 Min)

[AUDIO_SCRIPT_HINDI]
- Hook: (First 15 seconds to grab attention like a movie or mystery)
- The Journey / Story: (Explain core concepts, facts, dates, or formulas through characters, analogies, and narrative drama formatted for natural Text-to-Speech narration)
- Climax & Insight: (Connecting the story back to the exam concept and core formula)

[MEMORY_ANCHOR_NOTES]
- 📌 3 Key Takeaways:
  1. (Must-remember exam point 1)
  2. (Must-remember exam point 2)
  3. (Must-remember exam point 3)
- 💡 Easy Trick / Mnemonic: (A punchy memory hack or intuitive rhyme for instant recall in the exam hall)

[NEXT_STEPS]
- Listen to Episode Audio
- Practice 1 Exam Question on this Story
- Download Revision Notes
[/NEXT_STEPS]`;
      } else if (isScreenOffVoice) {
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

1. VOICE-FIRST TEACHING & MEMORIZATION ARCHITECTURE (याद करवाने का तरीका):
Never deliver a long lecture. Break every topic into short conversational exchanges using the Oral Mastery Loop:
- **Step 1 (Intuitive Verbal Hook):** Explain the core idea in 1–2 plain-language sentences using daily-life analogies (English, Hindi, or Hinglish based on student preference).
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
- **Brevity Rule:** Keep every spoken response within 20 to 45 words (15–30 seconds max) to maintain two-way dialogue.
- **Zero Robotic Transitions:** Eliminate filler phrases like "Sure, I can help you with that" or "As an AI tutor". Jump directly to the explanation or question.
- **Interruption Handling:** Stop speaking immediately when the student interrupts with a doubt, and directly address their specific confusion.

4. MULTIMODAL CANVAS & GOOGLE DRIVE SYNC:
- Parallel Visual Board: While teaching, project the corresponding clean SVG diagram, roadmap topic highlight, and formula card on the student's screen.
- Persistent Knowledge Graph Update: Log verbal misconceptions, hesitation patterns, and memorization speed into \`student_profile.json\`. Flag unmastered formulas to re-test orally at the start of the next study session.`;
      }

      const formattedMessages = (messages || []).map((msg: any) => {
        const parts: any[] = [];

        // Add inline images if provided
        if (Array.isArray(msg.images) && msg.images.length > 0) {
          for (const img of msg.images) {
            if (img && img.data) {
              const base64Data = img.data.replace(/^data:[^;]+;base64,/, '');
              parts.push({
                inlineData: {
                  mimeType: img.mimeType || 'image/jpeg',
                  data: base64Data
                }
              });
            }
          }
        }

        // Add text content
        if (msg.content && msg.content.trim()) {
          parts.push({ text: msg.content });
        } else if (parts.length === 0) {
          parts.push({ text: 'Please analyze this.' });
        }

        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts
        };
      });

      let lastError: any = null;
      let textResponse: string | null = null;
      let usedModel: string = requestedModel || 'auto';

      if (requestedModel && requestedModel.startsWith('gpt-')) {
        if (!activeOpenAiClient) {
          throw new Error('OPENAI_API_KEY is not configured on the server or provided in settings.');
        }

        const openAiMessages: any[] = [
          { role: 'system', content: activeSystemInstruction }
        ];

        for (const msg of messages || []) {
          const role = msg.role === 'assistant' ? 'assistant' : 'user';
          if (msg.images && msg.images.length > 0) {
            const contentArray: any[] = [{ type: 'text', text: msg.content || 'Please analyze this.' }];
            for (const img of msg.images) {
              if (img && img.data) {
                contentArray.push({
                  type: 'image_url',
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
          textResponse = response.choices[0]?.message?.content || '';
          usedModel = requestedModel;
        } catch (err: any) {
          throw new Error('OpenAI API Error: ' + (err.message || String(err)));
        }
      } else {
        // Model fallback hierarchy with official valid @google/genai models
        const fallbackChain = [
          'gemini-3.7-flash',
          'gemini-flash-latest',
          'gemini-3.1-flash-lite',
          'gemini-3.1-pro-preview'
        ];
        
        const candidateModels = requestedModel && requestedModel !== 'auto' && requestedModel !== 'image-generation-model' && requestedModel !== 'gemini-3.1-flash-image'
          ? [requestedModel, ...fallbackChain.filter(m => m !== requestedModel)]
          : fallbackChain;
        
        usedModel = candidateModels[0];
        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
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
                  systemInstruction: activeSystemInstruction,
                }
              });
              textResponse = response.text || '';
              usedModel = model;
              break;
            } catch (err: any) {
              lastError = err;
              const errMsg = err?.message || String(err);
              
              const isQuotaExhausted = errMsg.includes('429') || 
                errMsg.includes('RESOURCE_EXHAUSTED') || 
                errMsg.includes('quota') || 
                errMsg.includes('QuotaFailure') || 
                errMsg.includes('limit: 0');

              if (isQuotaExhausted) {
                quotaHit = true;
                console.warn(`Model ${model} quota exhausted, falling back to next candidate model.`);
                break;
              }

              const isHighDemandOrUnavailable = errMsg.includes('503') || 
                errMsg.includes('UNAVAILABLE') || 
                errMsg.includes('high demand') ||
                errMsg.includes('temporarily unavailable') ||
                errMsg.includes('fetch failed');

              if (isHighDemandOrUnavailable) {
                highDemandHit = true;
                console.warn(`Model ${model} experiencing high demand (503), trying next model in chain.`);
                break;
              }

              const isNotFoundOrDeprecated = errMsg.includes('404') || errMsg.includes('NOT_FOUND') || errMsg.includes('no longer available');
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
            // Graceful cooling down response for rate limits on free tier
            textResponse = "Quota cooling down, retry in 5s. (Free tier limit reached — please wait a moment).";
            usedModel = 'quota-cooldown-fallback';
          } else if (highDemandHit) {
            textResponse = "The AI servers are currently experiencing high demand. Please retry your question in a few moments.";
            usedModel = 'high-demand-fallback';
          } else {
            throw lastError || new Error('All model attempts failed');
          }
        }
      }

      res.setHeader('Content-Type', 'application/json');
      res.json({ 
        text: textResponse, 
        response: textResponse,
        model: usedModel 
      });
    } catch (error: any) {
      console.error("API error in /api/chat:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: error.message || 'Error processing request' });
    }
  });

  // Dedicated endpoint for Gemini Shared Chat Link & External Profile Ingestion
  app.post('/api/import-chat', async (req, res) => {
    try {
      const { link, rawText } = req.body;
      if (!link && !rawText) {
        return res.status(400).json({ error: 'Please provide a Gemini shared chat link or conversation text.' });
      }

      let chatDataToAnalyze = rawText || '';

      // If a link is provided, attempt to fetch the public share webpage or extract text
      if (link && link.startsWith('http')) {
        try {
          const fetchRes = await fetch(link, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
          });
          if (fetchRes.ok) {
            const htmlText = await fetchRes.text();
            // Extract text content and strip out huge script/style blocks
            const cleanedText = htmlText
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 15000);

            chatDataToAnalyze = `Source Shared Link: ${link}\n\nExtracted Web Content:\n${cleanedText}\n\n${rawText || ''}`;
          } else {
            chatDataToAnalyze = `Source Shared Link: ${link}\n\n${rawText || ''}`;
          }
        } catch (fetchErr) {
          console.warn('Could not directly fetch share link, will rely on URL and raw text:', fetchErr);
          chatDataToAnalyze = `Source Shared Link: ${link}\n\n${rawText || ''}`;
        }
      }

      const extractionPrompt = `You are Examix AI's Cognitive Knowledge Graph & Memory Extraction Engine.
Analyze the following external Gemini Shared Chat link or conversation transcript.

CHAT CONTENT TO ANALYZE:
========================
${chatDataToAnalyze.substring(0, 20000)}
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

      const candidateModels = ['gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      let jsonResult: any = null;

      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: extractionPrompt }] }],
            config: {
              responseMimeType: 'application/json'
            }
          });
          const text = response.text || '';
          jsonResult = JSON.parse(text);
          break;
        } catch (err: any) {
          console.warn(`Extraction failed on model ${model}:`, err?.message);
        }
      }

      if (!jsonResult) {
        // Fallback baseline extraction if model returns text or json parsing failed
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

      res.setHeader('Content-Type', 'application/json');
      res.json({
        success: true,
        profile: jsonResult
      });
    } catch (error: any) {
      console.error('Error in /api/import-chat:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: error.message || 'Failed to import and parse shared chat' });
    }
  });

  // Dedicated Silent Turn-by-Turn Diagnostic Parser (Gemini Flash)
  app.post('/api/neuro-sync/diagnose', async (req, res) => {
    try {
      const { student_turn, previous_context, concept_hint, cognitive_graph } = req.body;

      if (!student_turn || typeof student_turn !== 'string' || !student_turn.trim()) {
        return res.status(400).json({ error: 'student_turn text or transcript is required.' });
      }

      // Extract custom API key if sent by client
      const customGeminiKey = (req.headers['x-gemini-api-key'] as string) || req.body?.customGeminiKey;
      const activeGenAi = customGeminiKey
        ? new GoogleGenAI({
            apiKey: customGeminiKey.trim(),
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          })
        : ai;

      const knownConceptsList = cognitive_graph?.concept_nodes
        ? Object.values(cognitive_graph.concept_nodes).map((n: any) => `- ID: ${n.id} | Name: ${n.name} | Traps: ${n.known_traps?.join(', ')}`).join('\n')
        : '- physics_coulombs_law_vector: Coulomb Vector Form (Trap: unit vector r_hat direction)\n- physics_electric_dipole_2l: Electric Dipole 2l (Trap: dividing 2l by 2)\n- physics_quantization_charge: Quantization of charge q=ne (Trap: non-integer n)';

      const diagnosticPrompt = `You are Examix AI's Silent Turn-by-Turn Cognitive Diagnostic Parser powered by Gemini Flash.
Your task is to analyze the student's latest turn (text answer or spoken transcript) against the preceding tutor question/context.

CONTEXT:
=============================
Tutor Preceding Context / Question:
${previous_context || 'General Socratic academic practice'}

Student's Latest Turn (Answer / Doubt / Voice Transcript):
"${student_turn}"

Optional Concept Hint:
${concept_hint || 'Detect from conversation'}

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

      const candidateModels = ['gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      let diagnosticResult: any = null;

      for (const model of candidateModels) {
        try {
          const response = await activeGenAi.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: diagnosticPrompt }] }],
            config: {
              responseMimeType: 'application/json'
            }
          });
          const text = response.text || '';
          diagnosticResult = JSON.parse(text);
          break;
        } catch (err: any) {
          console.warn(`Diagnostic parse failed on model ${model}:`, err?.message);
        }
      }

      if (!diagnosticResult) {
        // Fallback heuristic evaluation
        const lower = student_turn.toLowerCase();
        const isGeneralAffirmative = lower.includes('yes') || lower.includes('correct') || lower.includes('samajh gaya');
        diagnosticResult = {
          concept_id: concept_hint || 'physics_electrostatics_general',
          concept_name: concept_hint || 'Electrostatics & Formula Application',
          topic: 'Physics',
          is_correct: isGeneralAffirmative,
          traps_triggered: [],
          calculation_sound: true,
          confidence: 0.8,
          remediation_hint: null
        };
      }

      res.setHeader('Content-Type', 'application/json');
      res.json({
        success: true,
        diagnostic: diagnosticResult
      });
    } catch (error: any) {
      console.error('Error in /api/neuro-sync/diagnose:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: error.message || 'Diagnostic evaluation failed' });
    }
  });

  // Dedicated High-Fidelity Podcast Audio Synthesizer (Gemini Flash TTS)
  app.post('/api/podcast/generate-audio', async (req, res) => {
    try {
      const { text, title, voice, language } = req.body;
      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ error: 'Text or script content is required.' });
      }

      // Extract custom API key if sent by client
      const customGeminiKey = (req.headers['x-gemini-api-key'] as string) || req.body?.customGeminiKey;
      const activeGenAi = customGeminiKey
        ? new GoogleGenAI({
            apiKey: customGeminiKey.trim(),
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          })
        : ai;

      const voiceName = voice || 'Kore'; // 'Kore', 'Fenrir', 'Puck', 'Charon', 'Zephyr'
      const cleanNarrationText = text
        .replace(/\[\/?(EPISODE_META|AUDIO_SCRIPT_HINDI|MEMORY_ANCHOR_NOTES|NEXT_STEPS)\]/gi, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[*#`_~]/g, '')
        .trim()
        .substring(0, 4000); // Sized for rich 2-4 min audio narration

      let audioBase64: string | null = null;
      let mimeType = 'audio/mp3';

      try {
        const ttsResponse = await activeGenAi.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: [{ parts: [{ text: cleanNarrationText }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        });

        const part = ttsResponse.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData?.data) {
          audioBase64 = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'audio/mp3';
        }
      } catch (ttsErr: any) {
        console.warn('Gemini Flash TTS generation error:', ttsErr?.message);
      }

      const safeTitle = (title || 'podcast_episode').toLowerCase().replace(/[^a-z0-9]/gi, '_');
      const filename = `${safeTitle}.mp3`;

      if (audioBase64) {
        res.setHeader('Content-Type', 'application/json');
        return res.json({
          success: true,
          audioBase64,
          mimeType,
          filename,
          durationSeconds: Math.ceil(cleanNarrationText.split(/\s+/).length / 2.5)
        });
      } else {
        // Fallback flag to let frontend encode audio cleanly
        return res.status(200).json({
          success: false,
          fallbackNeeded: true,
          message: 'Audio synthesis fallback required',
          filename
        });
      }
    } catch (error: any) {
      console.error('Error in /api/podcast/generate-audio:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: error.message || 'Podcast audio generation failed' });
    }
  });

  // 1-Click Story Script + Voice Narration Generator for Direct MP3 Export
  app.post('/api/podcast/generate-story-audio', async (req, res) => {
    try {
      const { topic, targetExam, language, voice } = req.body;
      if (!topic || typeof topic !== 'string' || !topic.trim()) {
        return res.status(400).json({ error: 'Topic or notes prompt is required.' });
      }

      // Extract custom API key if sent by client
      const customGeminiKey = (req.headers['x-gemini-api-key'] as string) || req.body?.customGeminiKey;
      const activeGenAi = customGeminiKey
        ? new GoogleGenAI({
            apiKey: customGeminiKey.trim(),
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          })
        : ai;

      let langDirective = 'conversational Hinglish / Hindi';
      if (language === 'hindi') langDirective = 'pure conversational Hindi';
      if (language === 'english') langDirective = 'spoken English';

      const examSnippet = targetExam ? ` (Target Exam/Class: ${targetExam})` : '';

      const storyPrompt = `You are Examix AI's Story Studio & Educational Podcast Narrator.
Transform the following topic into an immersive, cinematic audio story podcast in ${langDirective}${examSnippet}:
"${topic}"

CRITICAL FORMATTING INSTRUCTIONS:
You MUST structure your output with these EXACT XML-like tags:

[EPISODE_META]
TITLE: <Engaging Catchy Title>
SUBJECT: <Subject & Chapter>
DURATION: <e.g., 3 Min Story>
VOICE_TONE: <Storytelling, Cinematic, Conversational>
[/EPISODE_META]

[AUDIO_SCRIPT_HINDI]
HOOK: <Opening attention-grabbing real-world scene, dramatic hook, or mystery question>
JOURNEY: <The core journey/concept explained through character dialogue, vivid analogy, and historical/real-world context. Speak naturally sentence by sentence.>
CLIMAX: <The lightbulb moment, key formula or turning point, and the golden exam insight.>
[/AUDIO_SCRIPT_HINDI]

[MEMORY_ANCHOR_NOTES]
KEY_TAKEAWAYS:
- <Takeaway 1: Core definition/principle>
- <Takeaway 2: Formula or golden exam rule>
- <Takeaway 3: Common trap/misconception to avoid>
MNEMONIC_TRICK: <A memorable rhyme, acronym, or one-liner mnemonic to lock it into permanent memory>
[/MEMORY_ANCHOR_NOTES]

Make the narration fluid, conversational, and energetic.`;

      const storyGenResponse = await activeGenAi.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: [{ role: 'user', parts: [{ text: storyPrompt }] }]
      });

      const storyText = storyGenResponse.text || '';

      // Parse fields
      let title = topic;
      const titleMatch = storyText.match(/TITLE:\s*([^\n\r]+)/i);
      if (titleMatch) title = titleMatch[1].trim();

      let subjectTopic = 'General Science & Concepts';
      const subjectMatch = storyText.match(/SUBJECT:\s*([^\n\r]+)/i);
      if (subjectMatch) subjectTopic = subjectMatch[1].trim();

      let duration = '3 Min Story';
      const durMatch = storyText.match(/DURATION:\s*([^\n\r]+)/i);
      if (durMatch) duration = durMatch[1].trim();

      let hook = '';
      const hookMatch = storyText.match(/HOOK:\s*([\s\S]*?)(?=JOURNEY:|CLIMAX:|\[\/AUDIO_SCRIPT_HINDI\]|$)/i);
      if (hookMatch) hook = hookMatch[1].trim();

      let journey = '';
      const journeyMatch = storyText.match(/JOURNEY:\s*([\s\S]*?)(?=CLIMAX:|\[\/AUDIO_SCRIPT_HINDI\]|$)/i);
      if (journeyMatch) journey = journeyMatch[1].trim();

      let climax = '';
      const climaxMatch = storyText.match(/CLIMAX:\s*([\s\S]*?)(?=\[\/AUDIO_SCRIPT_HINDI\]|$)/i);
      if (climaxMatch) climax = climaxMatch[1].trim();

      const scriptContent = [hook, journey, climax].filter(Boolean).join(' ') || storyText;

      const takeaways: string[] = [];
      const takeawayMatches = storyText.match(/-\s*([^\n\r]+)/g);
      if (takeawayMatches) {
        takeawayMatches.slice(0, 3).forEach(t => takeaways.push(t.replace(/^-\s*/, '').trim()));
      }

      let mnemonic = 'Remember: Concept creates intuition, practice creates perfection.';
      const mnemMatch = storyText.match(/MNEMONIC_TRICK:\s*([^\n\r]+)/i);
      if (mnemMatch) mnemonic = mnemMatch[1].trim();

      const episodeData = {
        title,
        subjectTopic,
        estimatedDuration: duration,
        fullScript: scriptContent,
        hook,
        journey,
        climax,
        takeaways: takeaways.length > 0 ? takeaways : ['Fundamental core concept', 'Formula & derivation insight', 'Exam-ready application'],
        mnemonic
      };

      // Synthesize audio using Gemini TTS
      const cleanNarration = scriptContent
        .replace(/\[\/?(EPISODE_META|AUDIO_SCRIPT_HINDI|MEMORY_ANCHOR_NOTES)\]/gi, '')
        .replace(/[*#`_~]/g, '')
        .trim();

      let audioBase64: string | null = null;
      let mimeType = 'audio/mp3';

      try {
        const ttsResponse = await activeGenAi.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: [{ parts: [{ text: cleanNarration.substring(0, 4000) }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
              },
            },
          },
        });

        const part = ttsResponse.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData?.data) {
          audioBase64 = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'audio/mp3';
        }
      } catch (ttsErr: any) {
        console.warn('TTS step during story generation:', ttsErr?.message);
      }

      const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/gi, '_');
      const filename = `${safeTitle}_podcast.mp3`;

      res.setHeader('Content-Type', 'application/json');
      res.json({
        success: true,
        episode: episodeData,
        audioBase64,
        mimeType,
        filename,
        durationSeconds: Math.ceil(cleanNarration.split(/\s+/).length / 2.5)
      });
    } catch (error: any) {
      console.error('Error in /api/podcast/generate-story-audio:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: error.message || 'Podcast story & audio generation failed' });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
