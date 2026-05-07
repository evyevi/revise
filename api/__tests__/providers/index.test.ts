import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../providers/openai-compatible', () => ({
  createOpenAICompatibleProvider: vi.fn().mockReturnValue(async () => 'openai response'),
}));

vi.mock('../../providers/gemini', () => ({
  createGeminiProvider: vi.fn().mockReturnValue(async () => 'gemini response'),
}));

vi.mock('../../providers/anthropic', () => ({
  createAnthropicProvider: vi.fn().mockReturnValue(async () => 'anthropic response'),
}));

describe('getProvider', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.LLM_PROVIDER;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
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

  it('returns a function when LLM_PROVIDER=openai and key is set', async () => {
    process.env.LLM_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'sk-test';
    const { getProvider } = await import('../../providers/index');
    expect(typeof getProvider()).toBe('function');
  });

  it('throws when openai is selected but OPENAI_API_KEY is missing', async () => {
    process.env.LLM_PROVIDER = 'openai';
    const { getProvider } = await import('../../providers/index');
    expect(() => getProvider()).toThrow('OPENAI_API_KEY');
  });

  it('throws when groq is selected but GROQ_API_KEY is missing', async () => {
    process.env.LLM_PROVIDER = 'groq';
    const { getProvider } = await import('../../providers/index');
    expect(() => getProvider()).toThrow('GROQ_API_KEY');
  });

  it('passes GEMINI_API_KEY to createGeminiProvider', async () => {
    process.env.LLM_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    const { getProvider } = await import('../../providers/index');
    const { createGeminiProvider } = await import('../../providers/gemini');
    getProvider();
    expect(vi.mocked(createGeminiProvider)).toHaveBeenCalledWith('test-key');
  });

  it('throws when anthropic is selected but ANTHROPIC_API_KEY is missing', async () => {
    process.env.LLM_PROVIDER = 'anthropic';
    const { getProvider } = await import('../../providers/index');
    expect(() => getProvider()).toThrow('ANTHROPIC_API_KEY');
  });

  it('returns a function when LLM_PROVIDER=anthropic and key is set', async () => {
    process.env.LLM_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const { getProvider } = await import('../../providers/index');
    expect(typeof getProvider()).toBe('function');
  });

  it('passes ANTHROPIC_API_KEY and model to createAnthropicProvider', async () => {
    process.env.LLM_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const { getProvider } = await import('../../providers/index');
    const { createAnthropicProvider } = await import('../../providers/anthropic');
    getProvider();
    expect(vi.mocked(createAnthropicProvider)).toHaveBeenCalledWith({
      apiKey: 'sk-ant-test',
      model: 'claude-3-5-haiku-20241022',
    });
  });
});
