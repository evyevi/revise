import { createGeminiProvider, type LLMProvider } from './gemini';
import { createOpenAICompatibleProvider } from './openai-compatible';

export type { LLMProvider };

const SUPPORTED = ['gemini', 'openai', 'groq'] as const;

export function getProvider(): LLMProvider {
  const name = process.env.LLM_PROVIDER ?? 'gemini';

  switch (name) {
    case 'gemini': {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is required');
      return createGeminiProvider(apiKey);
    }
    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is required');
      return createOpenAICompatibleProvider({
        apiKey,
        baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      });
    }
    case 'groq': {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error('GROQ_API_KEY environment variable is required');
      return createOpenAICompatibleProvider({
        apiKey,
        baseUrl: 'https://api.groq.com/openai/v1',
        model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
      });
    }
    default:
      throw new Error(`Unknown LLM_PROVIDER: "${name}". Supported: ${SUPPORTED.join(', ')}`);
  }
}
