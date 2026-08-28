import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const res = await ai.models.generateImages({
      model: 'imagen-3.0-generate-001',
      prompt: 'A detailed scientific concept diagram of an ant',
      config: {
        numberOfImages: 1,
        outputMimeType: "image/jpeg",
        aspectRatio: "1:1"
      }
    });
    console.log(res.generatedImages?.[0]?.image?.imageBytes ? "SUCCESS" : "FAIL");
  } catch(e) {
    console.error(e);
  }
}
run();
