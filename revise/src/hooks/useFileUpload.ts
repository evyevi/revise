import { useState } from 'react';

export interface UploadedFileInfo {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedText?: string;
  error?: string;
}

export function useFileUpload() {
  const [files, setFiles] = useState<UploadedFileInfo[]>([]);

  const addFiles = (newFiles: File[]) => {
    const fileInfos: UploadedFileInfo[] = newFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
    }));
    
    setFiles((prev) => [...prev, ...fileInfos]);
    return fileInfos;
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFileStatus = (
    id: string,
    status: UploadedFileInfo['status'],
    data?: Partial<UploadedFileInfo>
  ) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status, ...data } : f))
    );
  };

  const clearFiles = () => {
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
