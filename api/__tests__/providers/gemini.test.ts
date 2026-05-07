import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleGenerativeAI } from '@google/generative-ai';

vi.mock('@google/generative-ai');

describe('createGeminiProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Gemini with the prompt and returns the text response', async () => {
    const mockText = vi.fn().mockReturnValue('{"result":"ok"}');
    const mockGenerateContent = vi.fn().mockResolvedValue({ response: { text: mockText } });
    vi.mocked(GoogleGenerativeAI).mockImplementation(function () {
      return { getGenerativeModel: vi.fn().mockReturnValue({ generateContent: mockGenerateContent }) };
    } as unknown as typeof GoogleGenerativeAI);

    const { createGeminiProvider } = await import('../../providers/gemini');
    const provider = createGeminiProvider('fake-api-key');
    const result = await provider('Hello prompt');

    expect(mockGenerateContent).toHaveBeenCalledWith('Hello prompt');
    expect(result).toBe('{"result":"ok"}');
  });

  it('throws when Gemini returns an empty response', async () => {
    const mockText = vi.fn().mockReturnValue('');
    const mockGenerateContent = vi.fn().mockResolvedValue({ response: { text: mockText } });
    vi.mocked(GoogleGenerativeAI).mockImplementation(function () {
      return { getGenerativeModel: vi.fn().mockReturnValue({ generateContent: mockGenerateContent }) };
    } as unknown as typeof GoogleGenerativeAI);

    const { createGeminiProvider } = await import('../../providers/gemini');
    const provider = createGeminiProvider('fake-api-key');

    await expect(provider('prompt')).rejects.toThrow('Gemini returned empty response');
  });
});
