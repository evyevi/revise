import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFileUpload } from '../useFileUpload';
import * as textExtraction from '../../lib/textExtraction';

// Mock text extraction
vi.mock('../../lib/textExtraction', () => ({
  extractTextFromFile: vi.fn(),
}));

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty files array', () => {
    const { result } = renderHook(() => useFileUpload());
    expect(result.current.files).toEqual([]);
  });

  it('adds files with pending status', async () => {
    // Mock extractTextFromFile to delay, so we can verify file is being processed
    vi.mocked(textExtraction.extractTextFromFile).mockImplementation(() => new Promise(() => {}));
    
    const { result } = renderHook(() => useFileUpload());
    const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    
    // Don't await - we want to check the status while processing
    result.current.addFiles([mockFile]);
    
    await waitFor(() => {
      expect(result.current.files).toHaveLength(1);
      expect(result.current.files[0].file).toBe(mockFile);
      // File moves quickly from pending to processing
      expect(['pending', 'processing']).toContain(result.current.files[0].status);
    });
  });

  it('processes text files successfully', async () => {
    vi.mocked(textExtraction.extractTextFromFile).mockResolvedValue('Extracted text content');
    
    const { result } = renderHook(() => useFileUpload());
    const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    
    await result.current.addFiles([mockFile]);
    
    await waitFor(() => {
      expect(result.current.files[0].status).toBe('completed');
      expect(result.current.files[0].extractedText).toBe('Extracted text content');
    });
  });

  it('handles extraction errors', async () => {
    vi.mocked(textExtraction.extractTextFromFile).mockRejectedValue(new Error('Extraction failed'));
    
    const { result } = renderHook(() => useFileUpload());
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    
    await result.current.addFiles([mockFile]);
    
    await waitFor(() => {
      expect(result.current.files[0].status).toBe('error');
      expect(result.current.files[0].error).toContain('Extraction failed');
    });
  });

  it('removes files by id', async () => {
    const { result } = renderHook(() => useFileUpload());
    const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    
    await result.current.addFiles([mockFile]);
    
    await waitFor(() => {
      expect(result.current.files).toHaveLength(1);
    });
    
    const fileId = result.current.files[0].id;
    result.current.removeFile(fileId);
    
    await waitFor(() => {
      expect(result.current.files).toHaveLength(0);
    });
  });

  it('clears all files', async () => {
    const { result } = renderHook(() => useFileUpload());
    const mockFiles = [
      new File(['content1'], 'test1.txt', { type: 'text/plain' }),
      new File(['content2'], 'test2.txt', { type: 'text/plain' }),
    ];
    
    await result.current.addFiles(mockFiles);
    
    await waitFor(() => {
      expect(result.current.files).toHaveLength(2);
    });
    
    result.current.clearFiles();
    
    await waitFor(() => {
      expect(result.current.files).toHaveLength(0);
    });
  });

  it('gets all extracted text concatenated', async () => {
    vi.mocked(textExtraction.extractTextFromFile)
      .mockResolvedValueOnce('Text from file 1')
      .mockResolvedValueOnce('Text from file 2');
    
    const { result } = renderHook(() => useFileUpload());
    const mockFiles = [
      new File(['content1'], 'test1.txt', { type: 'text/plain' }),
      new File(['content2'], 'test2.txt', { type: 'text/plain' }),
    ];
    
    await result.current.addFiles(mockFiles);
    
    await waitFor(() => {
      const allText = result.current.getAllExtractedText();
      expect(allText).toContain('Text from file 1');
      expect(allText).toContain('Text from file 2');
    });
  });

  it('handles timeout for slow file processing', async () => {
    // Mock a slow extraction that takes 10 seconds
    vi.mocked(textExtraction.extractTextFromFile).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve('Slow text'), 10000))
    );
    
    const { result } = renderHook(() => useFileUpload());
    const mockFile = new File(['content'], 'large.pdf', { type: 'application/pdf' });
    
    await result.current.addFiles([mockFile]);
    
    // Should still be processing after a short time
    expect(result.current.files[0].status).toBe('processing');
  }, 15000);

  it('tracks progress for files with progress callback', async () => {
    vi.mocked(textExtraction.extractTextFromFile).mockImplementation(
      async (file, onProgress) => {
        if (onProgress) {
          onProgress(50);
          await new Promise(resolve => setTimeout(resolve, 10));
          onProgress(100);
        }
        return 'Extracted with progress';
      }
    );
    
    const { result } = renderHook(() => useFileUpload());
    const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    
    await result.current.addFiles([mockFile]);
    
    await waitFor(() => {
      expect(result.current.files[0].progress).toBeGreaterThan(0);
    });
  });

  it('rejects files larger than 50MB', async () => {
    const { result } = renderHook(() => useFileUpload());
    
    // Create a mock file that reports size > 50MB
    const largeFile = new File(['x'.repeat(1000)], 'large.pdf', { 
      type: 'application/pdf' 
    });
    Object.defineProperty(largeFile, 'size', { value: 51 * 1024 * 1024 });
    
    await result.current.addFiles([largeFile]);
    
    await waitFor(() => {
      expect(result.current.files[0].status).toBe('error');
      expect(result.current.files[0].error).toContain('too large');
    });
  });

  it('validates file types', async () => {
    const { result } = renderHook(() => useFileUpload());
    const invalidFile = new File(['content'], 'test.exe', { 
      type: 'application/x-msdownload' 
    });
    
    await result.current.addFiles([invalidFile]);
    
    await waitFor(() => {
      expect(result.current.files[0].status).toBe('error');
      expect(result.current.files[0].error).toContain('Unsupported file type');
    });
  });
});
