import { useCallback } from 'react';
import { Layout } from '../components/Layout';
import { FileUpload } from '../components/FileUpload';
import { FilePreview } from '../components/FilePreview';
import { useFileUpload } from '../hooks/useFileUpload';

export function CreatePlan() {
  const { files, addFiles, removeFile } = useFileUpload();

  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    await addFiles(newFiles);
  }, [addFiles]);

  const completedFilesCount = files.filter((f) => f.status === 'completed').length;
  const hasError = files.some((f) => f.status === 'error');

  return (
    <Layout showBottomNav={false}>
      <div className="p-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">Create Study Plan</h1>
        <p className="text-gray-600 mb-6">Upload your study materials to get started</p>
        
        <FileUpload onFilesSelected={handleFilesSelected} />
        
        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold text-gray-700">
                Uploaded Files ({completedFilesCount}/{files.length})
              </h2>
              {hasError && (
                <p className="text-xs text-red-600">Some files failed</p>
              )}
            </div>
            {files.map((fileInfo) => (
              <FilePreview
                key={fileInfo.id}
                fileName={fileInfo.file.name}
                fileSize={fileInfo.file.size}
                status={fileInfo.status}
                progress={fileInfo.progress}
                error={fileInfo.error}
                onRemove={() => removeFile(fileInfo.id)}
              />
            ))}
            
            {completedFilesCount > 0 && (
              <button
                className="w-full mt-6 bg-primary-500 text-white py-3 px-4 rounded-lg font-semibold active:scale-95 transition-transform hover:bg-primary-600"
              >
                Continue to Study Plan
              </button>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
