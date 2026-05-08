import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL_NAME = 'gemini-2.5-flash';

export type LLMProvider = (prompt: string) => Promise<string>;

export function createGeminiProvider(apiKey: string): LLMProvider {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  return async (prompt: string): Promise<string> => {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    if (!text) {
      throw new Error('Gemini returned empty response');
    }
    return text;
  };
}
