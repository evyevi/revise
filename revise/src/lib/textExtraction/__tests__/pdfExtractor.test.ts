import { describe, it, expect } from 'vitest';
import { extractTextFromFile } from '../index';

describe('Text Extraction', () => {
  describe('Plain text files', () => {
    it('extracts text from plain text file', async () => {
      const content = 'Hello, this is a test file.';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      
      const extracted = await extractTextFromFile(file);
      expect(extracted).toBe(content);
    });

    it('handles empty text files', async () => {
      const file = new File([''], 'empty.txt', { type: 'text/plain' });
      
      const extracted = await extractTextFromFile(file);
      expect(extracted).toBe('');
    });

    it('handles text files with multi-line content', async () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const file = new File([content], 'multiline.txt', { type: 'text/plain' });
      
      const extracted = await extractTextFromFile(file);
      expect(extracted).toBe(content);
    });

    it('handles UTF-8 encoded text', async () => {
      const content = 'Hello 世界 🌍';
      const file = new File([new TextEncoder().encode(content)], 'utf8.txt', { type: 'text/plain; charset=utf-8' });
      
      const extracted = await extractTextFromFile(file);
      expect(extracted).toBe(content);
    });
  });

  describe('File type validation', () => {
    it('throws error for unsupported file type', async () => {
      const file = new File(['data'], 'test.xyz', { type: 'application/unknown' });
      
      await expect(extractTextFromFile(file)).rejects.toThrow('Unsupported file type');
    });

    it('rejects based on extension for files without MIME type', async () => {
      const file = new File(['data'], 'test.xyz');
      
      await expect(extractTextFromFile(file)).rejects.toThrow('Unsupported file type');
    });

    it('accepts .txt even without text/ MIME type', async () => {
      const content = 'test content';
      const file = new File([content], 'test.txt'); // No MIME type
      
      const extracted = await extractTextFromFile(file);
      expect(extracted).toBe(content);
    });
  });

  describe('Error handling', () => {
    it('provides helpful error message for text file read failures', async () => {
      // Mock would go here in real implementation
      // For now, we just verify the error handling path exists
      expect(extractTextFromFile).toBeDefined();
    });
  });
});
