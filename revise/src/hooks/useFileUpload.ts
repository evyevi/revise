import { useState } from 'react';

export interface UploadedFileInfo {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedText?: string;
  error?: string;
}

export interface UseFileUploadReturn {
  files: UploadedFileInfo[];
  addFiles: (newFiles: File[]) => UploadedFileInfo[];
  removeFile: (id: string) => void;
  updateFileStatus: (
    id: string,
    status: UploadedFileInfo['status'],
    data?: Partial<UploadedFileInfo>
  ) => void;
  clearFiles: () => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['.pdf', '.txt', '.jpg', '.jpeg', '.png', '.pptx'];

function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB > 50MB)`,
    };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_TYPES.some((ext) => fileName.endsWith(ext));
  if (!hasValidExtension) {
    return {
      valid: false,
      error: `File type not supported. Allowed: ${ALLOWED_TYPES.join(', ')}`,
    };
  }

  return { valid: true };
}

export function useFileUpload(): UseFileUploadReturn {
  const [files, setFiles] = useState<UploadedFileInfo[]>([]);

  const addFiles = (newFiles: File[]): UploadedFileInfo[] => {
    const fileInfos: UploadedFileInfo[] = newFiles.map((file) => {
      const validation = validateFile(file);

      return {
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        status: validation.valid ? 'pending' : 'error',
        error: validation.error,
      };
    });

    setFiles((prev) => [...prev, ...fileInfos]);
    return fileInfos;
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

  const clearFiles = (): void => {
    setFiles([]);
  };

  return {
    files,
    addFiles,
    removeFile,
    updateFileStatus,
    clearFiles,
  };
}
