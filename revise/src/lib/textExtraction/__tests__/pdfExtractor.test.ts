import { describe, it, expect } from 'vitest';
import { extractTextFromFile } from '../index';

describe('Text Extraction', () => {
  it('extracts text from plain text file', async () => {
    const content = 'Hello, this is a test file.';
    const file = new File([content], 'test.txt', { type: 'text/plain' });
    
    const extracted = await extractTextFromFile(file);
    expect(extracted).toBe(content);
  });

  it('throws error for unsupported file type', async () => {
    const file = new File(['data'], 'test.xyz', { type: 'application/unknown' });
    
    await expect(extractTextFromFile(file)).rejects.toThrow('Unsupported file type');
  });
});
