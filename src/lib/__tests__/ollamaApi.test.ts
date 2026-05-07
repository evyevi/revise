import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('callOllama', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('posts to /v1/chat/completions on the given baseUrl', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"topics":[]}' } }],
      }),
    });

    const { callOllama } = await import('../ollamaApi');
    const result = await callOllama({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2',
      prompt: 'Generate a plan',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: expect.stringContaining('"llama3.2"'),
      })
    );
    expect(result).toBe('{"topics":[]}');
  });

  it('throws a helpful error when Ollama is not running', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'));

    const { callOllama } = await import('../ollamaApi');

    await expect(
      callOllama({ baseUrl: 'http://localhost:11434', model: 'llama3.2', prompt: 'x' })
    ).rejects.toThrow('Cannot reach Ollama at http://localhost:11434');
  });

  it('throws when the response is non-ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => 'model not found',
    });

    const { callOllama } = await import('../ollamaApi');

    await expect(
      callOllama({ baseUrl: 'http://localhost:11434', model: 'llama3.2', prompt: 'x' })
    ).rejects.toThrow('Ollama error 404');
  });

  it('throws when the response content is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: null } }] }),
    });

    const { callOllama } = await import('../ollamaApi');

    await expect(
      callOllama({ baseUrl: 'http://localhost:11434', model: 'llama3.2', prompt: 'x' })
    ).rejects.toThrow('Ollama returned empty response');
  });
});
