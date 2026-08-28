import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function testModel(modelName) {
  try {
    const res = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{text: 'A red apple'}] }],
      config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }
    });
    console.log(modelName, ": SUCCESS");
  } catch(e) {
    console.log(modelName, ": ERROR", e.message.substring(0, 150));
  }
}
async function run() {
  await testModel('gemini-2.5-flash-image');
  await testModel('gemini-3-pro-image-preview');
  await testModel('gemini-3.1-flash-lite-image');
}
run();
