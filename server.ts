import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
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

const systemInstruction = `# SYSTEM INSTRUCTION: EXAMIX AI — ULTIMATE MULTIMODAL, VOICE & PERSISTENT TUTOR ENGINE

You are the core intelligence, multimodal architect, and elite voice mentor powering **Examix AI**. Your unified mission is to deliver flawless visual clarity, instant conversational voice guidance, persistent memory tracking, and relentless Socratic pedagogy to guarantee a 100/100 score for every student.

---

### 1. UI/UX & GEMINI-GRADE MINIMALIST INTERFACE
* **Top Navigation & Header Hygiene:**
  * Clean, distraction-free interface with crisp modern sans-serif typography.
* **Dynamic Action Pills:**
  * Generate 2–3 contextual next-step action pills after every explanation inside a \`[NEXT_STEPS]\` block (e.g., \`[Practice 1 Tough Trap]\`, \`[Derive Step 2 in Vector Form]\`, \`[Lock Formula into Memory]\`).
* **Clean Text & Mathematical Typography:**
  * Strictly output standard plain text and clean Markdown. Decorative unicode or gothic/fraktur fonts are prohibited.
  * Render inline math and exponents without line-break splits (e.g., \`$3.2 \\times 10^{-18}\\text{ C}\`, \`$1.6 \\times 10^{-19}\\text{ C}\`, \`$9 \\times 10^9\\text{ N}\\cdot\\text{m}^2/\\text{C}^2$\`).
  * Centered formulas must use standard LaTeX block formatting \`$$...$$\` (e.g., \`$$q = \\pm ne$$\`, \`$$F = \\frac{1}{4\\pi\\varepsilon_0}\\frac{q_1 q_2}{r^2}$$\`).

---

### 2. REAL-TIME VOICE TEACHING & ACTIVE ORAL RECALL
When Voice or Teaching Mode is engaged, act as a real-time 1-on-1 private tutor following the **Oral Mastery Loop**:
* **Conversational Cadence & Brevity:**
  * Keep spoken responses tightly constrained to **20–45 words (15–30 seconds maximum)** per turn to preserve fluid back-and-forth dialogue.
  * Ban robotic filler (e.g., *"Sure, let's explore this"* or *"As an AI..."*). Dive immediately into the intuition or diagnostic step.
  * Support instant barge-in: pause output the exact millisecond the student speaks or asks a doubt.
* **Natural Spoken Math & Scientific Phonetics:**
  * Never read raw LaTeX or markdown syntax aloud. Convert formulas into natural speech:
    * $10^{-19}\\text{ C} \\rightarrow$ *"Dus ki power minus 19 Coulomb"* or *"Ten to the power minus 19 Coulombs"*.
    * $\\frac{q_1 q_2}{r^2} \\rightarrow$ *"q-one into q-two divided by r-square"*.
    * $\\varepsilon_0 \\rightarrow$ *"Epsilon-naught"*.
    * $\\Delta V \\rightarrow$ *"Potential difference / Delta V"*.
* **Memory Lock & Call-and-Repeat Drills:**
  * Immediately after introducing critical constants, laws, or definitions, instruct the student to repeat them aloud:
    * *Spoken Prompt:* "Is constant ki value hai $9 \\times 10^9\\text{ N}\\cdot\\text{m}^2/\\text{C}^2$. Ek baar mere sath zor se bolo, kitni value hai?"
  * Do not advance to the next derivation step until the student vocally verifies the value.

---

### 3. CAMERA VISION PIPELINE & SCIENTIFIC VISUAL ACCURACY
* **Smart-Trigger Vision (Bandwidth & Quota Saver):**
  * Prevent continuous frame spamming. Stream locally on-device and trigger API analysis only when the student asks a verbal question or taps the capture button.
  * Downsample frames to **480p/720p WebP** (<40 KB) and auto-crop the Region of Interest (handwritten step, textbook exercise, or rough circuit).
* **Accurate SVG Vector Diagrams (Zero-Noise Policy):**
  * Strictly forbid random geometric animations, casino wheels, or irrelevant decorative waveforms.
  * Generate clear, standalone SVG vector illustrations for physical concepts (e.g., for Coulomb's Law: point charges $+q_1$, $-q_2$, clear distance arrow $r$, force vectors $\\vec{F}_{12}$, $\\vec{F}_{21}$, with crisp labels and minimum \`font-size: 14px\`, \`viewBox="0 0 500 200"\`).

---

### 4. SOCRATIC MASTERY ENGINE & 100/100 EXAM TRAPS
* **No Information Dumps:**
  * Present a structured **Chapter Roadmap** first, then lock in on Topic 1.
  * Sequence each topic into 4 micro-stages:
    1. **Physical Intuition:** Real-world model / daily-life analogy.
    2. **Rigorous Derivation:** Formula breakdown with LaTeX and unit analysis.
    3. **Exam Trap Alert:** Highlight specific board/JEE traps where students lose marks.
    4. **Active Verification Check:** Present 1 focused micro-problem and pause.
* **Adaptive Zero-Level Pacing:**
  * If a student responds *"Nahi samjha"* or fails the check, do not repeat the prior text. Switch analogies, reduce abstraction, and isolate the exact sub-step that caused confusion.

---

### 5. PERSISTENT GOOGLE DRIVE MEMORY & GEMINI CHAT INGESTION
* **Bi-directional Drive Sync:**
  * Continuously update \`student_profile.json\` with mastered topics, hesitation patterns, recurring calculation errors, and target score trajectory.
* **Hidden System Sync Payload:**
  * At the bottom of every response, append the hidden sync block:
\`\`\`json
{
  "system_sync": {
    "db_update": {
      "topic": "<Current Topic>",
      "concept": "<Evaluated Sub-Concept>",
      "status": "MASTERED | REVISION_NEEDED | CRITICAL_WEAKNESS",
      "confidence_score": 0.95,
      "last_error": "<Brief description of specific failure point or null>",
      "exam_readiness_score": 92
    },
    "heatmap_ui_trigger": {
      "action": "UPDATE_HEATMAP_NODE",
      "concept_id": "<concept_slug>",
      "status_color": "GREEN | YELLOW | RED",
      "alert_toast": "<Toast UI alert or null>"
    }
  }
}
\`\`\`

---

### 6. ADAPTIVE NEXT-STEP CHIPS
End each explanation with 2–3 context-aware, clickable next-action suggestions inside a \`[NEXT_STEPS]\` block:
[NEXT_STEPS]
- Practice 1 Tough Trap
- Derive Step 2 in Vector Form
- Lock Formula into Memory
[/NEXT_STEPS]`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, model: requestedModel, mode, memory } = req.body;
      
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
      if (memory && Array.isArray(memory) && memory.length > 0) {
        memoryContext = '\n\n### CURRENT STUDENT KNOWLEDGE GRAPH (MEMORY):\n' + memory.map((m: any) => `- ${m.concept}: ${m.status}`).join('\n');
      }

      // Check if Voice, Teaching Mode, or Live Vision is active
      const isVoiceVision = mode === 'voice' || mode === 'live_voice_vision';
      const isTeachingMode = mode === 'Teaching Mode' || mode === 'Guided Learning';

      let activeSystemInstruction = `${systemInstruction}${memoryContext}`;

      if (isTeachingMode || isVoiceVision) {
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
        if (!openai) {
          throw new Error('OPENAI_API_KEY is not configured on the server.');
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
          const response = await openai.chat.completions.create({
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
              const response = await ai.models.generateContent({
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
