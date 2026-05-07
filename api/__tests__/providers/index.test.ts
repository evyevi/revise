import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../providers/gemini', () => ({
  createGeminiProvider: vi.fn().mockReturnValue(async () => 'gemini response'),
}));

describe('getProvider', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.LLM_PROVIDER;
    delete process.env.GEMINI_API_KEY;
  });

  it('returns a function when LLM_PROVIDER=gemini and key is set', async () => {
    process.env.LLM_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    const { getProvider } = await import('../../providers/index');
    expect(typeof getProvider()).toBe('function');
  });

  it('defaults to gemini when LLM_PROVIDER is not set', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const { getProvider } = await import('../../providers/index');
    expect(typeof getProvider()).toBe('function');
  });

  it('throws when gemini is selected but GEMINI_API_KEY is missing', async () => {
    process.env.LLM_PROVIDER = 'gemini';
    const { getProvider } = await import('../../providers/index');
    expect(() => getProvider()).toThrow('GEMINI_API_KEY');
  });

  it('throws for an unknown provider name', async () => {
    process.env.LLM_PROVIDER = 'mystery-llm';
    const { getProvider } = await import('../../providers/index');
    expect(() => getProvider()).toThrow('Unknown LLM_PROVIDER');
  });
});
