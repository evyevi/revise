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

export function useFileUpload(): UseFileUploadReturn {
  const [files, setFiles] = useState<UploadedFileInfo[]>([]);

  const addFiles = async (newFiles: File[]): Promise<UploadedFileInfo[]> => {
    const fileInfos: UploadedFileInfo[] = newFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
    }));
    
    setFiles((prev) => [...prev, ...fileInfos]);
    
    // Process each file sequentially
    for (const fileInfo of fileInfos) {
      await processFile(fileInfo.id);
    }
    
    return fileInfos;
  };

  const processFile = async (id: string): Promise<void> => {
    updateFileStatus(id, 'processing');
    
    const fileInfo = files.find((f) => f.id === id);
    if (!fileInfo) return;

    try {
      const text = await extractTextFromFile(fileInfo.file, (progress) => {
        updateFileProgress(id, progress);
      });
      
      updateFileStatus(id, 'completed', { extractedText: text });
    } catch (error) {
      updateFileStatus(id, 'error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const removeFile = (id: string): void => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFileStatus = (
    id: string,
    status: UploadedFileInfo['status'],
    data?: Partial<UploadedFileInfo>
  ): void => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status, ...data } : f))
    );
  };

  const updateFileProgress = (id: string, progress: number): void => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, progress } : f))
    );
  };

  const clearFiles = (): void => {
    setFiles([]);
  };

  /**
   * Get all successfully extracted text joined with separator
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
