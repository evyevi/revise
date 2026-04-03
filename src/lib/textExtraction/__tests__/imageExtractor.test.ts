import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRecognize } = vi.hoisted(() => ({
  mockRecognize: vi.fn(),
}));

vi.mock('tesseract.js', () => ({
  default: {
    recognize: mockRecognize,
  },
}));

import { extractTextFromImage } from '../imageExtractor';

describe('Image text extraction', () => {
  beforeEach(() => {
    mockRecognize.mockReset();
    mockRecognize.mockResolvedValue({ data: { text: 'extracted text' } });
  });

  it('passes eng as default language to Tesseract', async () => {
    const file = new File(['fake-image-data'], 'photo.jpg', { type: 'image/jpeg' });

    await extractTextFromImage(file);

    expect(mockRecognize).toHaveBeenCalledWith(
      file,
      'eng',
      expect.objectContaining({ logger: expect.any(Function) })
    );
  });

  it('accepts a custom language parameter', async () => {
    const file = new File(['fake-image-data'], 'photo.png', { type: 'image/png' });

    await extractTextFromImage(file, undefined, 'deu');

    expect(mockRecognize).toHaveBeenCalledWith(
      file,
      'deu',
      expect.objectContaining({ logger: expect.any(Function) })
    );
  });

  it('returns extracted text from Tesseract result', async () => {
    mockRecognize.mockResolvedValue({ data: { text: 'Hej världen' } });
    const file = new File(['fake-image-data'], 'photo.jpg', { type: 'image/jpeg' });

    const result = await extractTextFromImage(file);

    expect(result).toBe('Hej världen');
  });

  it('rejects images larger than 10MB', async () => {
    const bigFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });

    await expect(extractTextFromImage(bigFile)).rejects.toThrow('Image too large');
    expect(mockRecognize).not.toHaveBeenCalled();
  });

  it('forwards progress updates from Tesseract logger', async () => {
    mockRecognize.mockImplementation(async (_file, _lang, opts) => {
      opts.logger({ status: 'recognizing text', progress: 0.5 });
      opts.logger({ status: 'loading language', progress: 1.0 }); // should be ignored
      return { data: { text: 'done' } };
    });

    const file = new File(['fake-image-data'], 'photo.jpg', { type: 'image/jpeg' });
    const onProgress = vi.fn();

    await extractTextFromImage(file, onProgress);

    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(50);
  });

  it('wraps Tesseract errors with a descriptive message', async () => {
    mockRecognize.mockRejectedValue(new Error('network timeout'));
    const file = new File(['fake-image-data'], 'photo.jpg', { type: 'image/jpeg' });

    await expect(extractTextFromImage(file)).rejects.toThrow(
      'Failed to extract text from image: network timeout'
    );
  });
});
