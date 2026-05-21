const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_THINKING_BUDGET = 2048;

export type LLMProvider = (prompt: string) => Promise<string>;

export interface GeminiProviderOptions {
  apiKey: string;
  model?: string;
  thinkingBudget?: number;
}

export function createGeminiProvider(options: GeminiProviderOptions): LLMProvider {
  const { apiKey, model = DEFAULT_MODEL, thinkingBudget = DEFAULT_THINKING_BUDGET } = options;

  return async (prompt: string): Promise<string> => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body: Record<string, unknown> = {
      contents: [{ parts: [{ text: prompt }] }],
    };

    if (thinkingBudget >= 0) {
      body.generationConfig = {
        thinkingConfig: { thinkingBudget },
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${error}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string; thought?: boolean }> };
      }>;
    };

    const parts = data.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error('Gemini returned empty response');
    }

    const text = parts
      .filter((p) => p.text && !p.thought)
      .map((p) => p.text)
      .join('');

    if (!text) {
      throw new Error('Gemini returned empty response');
    }

    return text;
  };
}
