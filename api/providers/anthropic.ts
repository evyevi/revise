import type { LLMProvider } from './gemini';

interface AnthropicConfig {
  apiKey: string;
  model: string;
}

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
}

const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOKENS = 8192;

export function createAnthropicProvider(config: AnthropicConfig): LLMProvider {
  return async (prompt: string): Promise<string> => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as AnthropicResponse;
    const textBlock = data.content.find(block => block.type === 'text');
    if (!textBlock?.text) {
      throw new Error('No text content in Anthropic response');
    }
    return textBlock.text;
  };
}
