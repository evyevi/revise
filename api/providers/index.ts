import { createGeminiProvider, type LLMProvider } from './gemini';

export type { LLMProvider };

const SUPPORTED = ['gemini'] as const;

export function getProvider(): LLMProvider {
  const name = process.env.LLM_PROVIDER ?? 'gemini';

  switch (name) {
    case 'gemini': {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is required');
      return createGeminiProvider(apiKey);
    }
    default:
      throw new Error(`Unknown LLM_PROVIDER: "${name}". Supported: ${SUPPORTED.join(', ')}`);
  }
}
