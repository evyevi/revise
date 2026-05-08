import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('createAnthropicProvider', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('calls the Anthropic messages endpoint with correct headers', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: '{"answer":42}' }],
      }),
    });

    const { createAnthropicProvider } = await import('../../_providers/anthropic');
    const provider = createAnthropicProvider({ apiKey: 'sk-ant-test', model: 'claude-3-5-haiku-20241022' });
    const result = await provider('My prompt');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'sk-ant-test',
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('"My prompt"'),
      })
    );
    // Also verify key body fields
    const callArgs = mockFetch.mock.calls[0][1] as { body: string };
    const body = JSON.parse(callArgs.body) as { model: string; max_tokens: number; messages: Array<{role: string; content: string}> };
    expect(body.model).toBe('claude-3-5-haiku-20241022');
    expect(body.max_tokens).toBe(8192);
    expect(body.messages).toEqual([{ role: 'user', content: 'My prompt' }]);
    expect(result).toBe('{"answer":42}');
  });

  it('throws when the API returns a non-ok status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    const { createAnthropicProvider } = await import('../../_providers/anthropic');
    const provider = createAnthropicProvider({ apiKey: 'bad', model: 'claude-3-5-haiku-20241022' });

    await expect(provider('prompt')).rejects.toThrow('Anthropic API error 401');
  });

  it('throws when the response has no text content block', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ content: [] }),
    });

    const { createAnthropicProvider } = await import('../../_providers/anthropic');
    const provider = createAnthropicProvider({ apiKey: 'sk-ant-test', model: 'claude-3-5-haiku-20241022' });

    await expect(provider('prompt')).rejects.toThrow('No text content in Anthropic response');
  });
});
