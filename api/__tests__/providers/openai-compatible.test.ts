import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('createOpenAICompatibleProvider', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('posts to the chat/completions endpoint with correct auth header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' } }],
      }),
    });

    const { createOpenAICompatibleProvider } = await import('../../providers/openai-compatible');
    const provider = createOpenAICompatibleProvider({
      apiKey: 'sk-test',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    });

    const result = await provider('My prompt');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test',
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('"My prompt"'),
      })
    );
    expect(result).toBe('{"ok":true}');
  });

  it('throws when the API returns a non-ok status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Rate limited',
    });

    const { createOpenAICompatibleProvider } = await import('../../providers/openai-compatible');
    const provider = createOpenAICompatibleProvider({
      apiKey: 'sk-test',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    });

    await expect(provider('prompt')).rejects.toThrow('OpenAI API error 429');
  });

  it('throws when the response has no choices', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    const { createOpenAICompatibleProvider } = await import('../../providers/openai-compatible');
    const provider = createOpenAICompatibleProvider({
      apiKey: 'sk-test',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    });

    await expect(provider('prompt')).rejects.toThrow('No content in OpenAI response');
  });
});
