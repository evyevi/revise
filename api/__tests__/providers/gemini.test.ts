import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('createGeminiProvider', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('calls Gemini REST API with the prompt and returns the text response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"result":"ok"}' }] } }],
      }),
    });

    const { createGeminiProvider } = await import('../../_providers/gemini');
    const provider = createGeminiProvider({ apiKey: 'fake-api-key' });
    const result = await provider('Hello prompt');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toBe('{"result":"ok"}');
  });

  it('throws when Gemini returns an empty response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [] } }],
      }),
    });

    const { createGeminiProvider } = await import('../../_providers/gemini');
    const provider = createGeminiProvider({ apiKey: 'fake-api-key' });

    await expect(provider('prompt')).rejects.toThrow('Gemini returned empty response');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    });

    const { createGeminiProvider } = await import('../../_providers/gemini');
    const provider = createGeminiProvider({ apiKey: 'fake-api-key' });

    await expect(provider('prompt')).rejects.toThrow('Gemini API error 403');
  });

  it('filters out thought parts from the response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [
              { text: 'thinking...', thought: true },
              { text: '{"result":"ok"}' },
            ],
          },
        }],
      }),
    });

    const { createGeminiProvider } = await import('../../_providers/gemini');
    const provider = createGeminiProvider({ apiKey: 'fake-api-key' });
    const result = await provider('prompt');

    expect(result).toBe('{"result":"ok"}');
  });

  it('passes thinkingBudget in the request body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'response' }] } }],
      }),
    });

    const { createGeminiProvider } = await import('../../_providers/gemini');
    const provider = createGeminiProvider({ apiKey: 'fake-key', thinkingBudget: 1024 });
    await provider('prompt');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.generationConfig.thinkingConfig.thinkingBudget).toBe(1024);
  });

  it('uses custom model name in the URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'response' }] } }],
      }),
    });

    const { createGeminiProvider } = await import('../../_providers/gemini');
    const provider = createGeminiProvider({ apiKey: 'fake-key', model: 'gemini-2.0-flash' });
    await provider('prompt');

    expect(mockFetch.mock.calls[0][0]).toContain('gemini-2.0-flash');
  });
});
