import { useState } from 'react';
import { extractTextFromFile } from '../lib/textExtraction';

export interface UploadedFileInfo {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedText?: string;
  error?: string;
  progress?: number;
}

export interface UseFileUploadReturn {
  files: UploadedFileInfo[];
  addFiles: (newFiles: File[]) => Promise<UploadedFileInfo[]>;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  getAllExtractedText: () => string;
}

/**
 * Generate a unique ID for file tracking
 * Uses crypto.randomUUID() for guaranteed uniqueness
 */
function generateFileId(): string {
  return crypto.randomUUID();
}

export function useFileUpload(): UseFileUploadReturn {
  const [files, setFiles] = useState<UploadedFileInfo[]>([]);

  /**
   * Add and process multiple files in parallel
   * Each file is processed independently to extract text
   */
  const addFiles = async (newFiles: File[]): Promise<UploadedFileInfo[]> => {
    const fileInfos: UploadedFileInfo[] = newFiles.map((file) => ({
      id: generateFileId(),
      file,
      status: 'pending',
    }));
    
    setFiles((prev) => [...prev, ...fileInfos]);
    
    // Process all files in parallel instead of sequentially
    const processingPromises = fileInfos.map((fileInfo) =>
      processFile(fileInfo.id, fileInfo.file)
    );
    
    await Promise.all(processingPromises);
    
    return fileInfos;
  };

  /**
   * Process individual file with progress tracking
   * Captures file directly to avoid stale closure issues with state lookups
   */
  const processFile = async (id: string, file: File): Promise<void> => {
    updateFileStatus(id, 'processing');
    
    try {
      const text = await extractTextFromFile(file, (progress) => {
        updateFileProgress(id, progress);
      });
      
      updateFileStatus(id, 'completed', { extractedText: text });
    } catch (error) {
      updateFileStatus(id, 'error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /** Remove file from list */
  const removeFile = (id: string): void => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  /** Update file status and optional metadata in batch */
  const updateFileStatus = (
    id: string,
    status: UploadedFileInfo['status'],
    data?: Partial<UploadedFileInfo>
  ): void => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status, ...data } : f))
    );
  };

  /** Update file processing progress (0-100) */
  const updateFileProgress = (id: string, progress: number): void => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, progress } : f))
    );
  };

  /** Clear all files from list */
  const clearFiles = (): void => {
    setFiles([]);
  };

  /**
   * Get all successfully extracted text joined with separator
   * Useful for creating study materials from multiple files
   */
  const getAllExtractedText = (): string => {
    return files
      .filter((f) => f.status === 'completed' && f.extractedText)
      .map((f) => f.extractedText!)
      .join('\n\n---\n\n');
  };

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    getAllExtractedText,
  };
}
