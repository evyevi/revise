import { Layout } from '../components/Layout';
import { FileUpload } from '../components/FileUpload';
import { FilePreview } from '../components/FilePreview';
import { useFileUpload } from '../hooks/useFileUpload';

export function CreatePlan() {
  const { files, addFiles, removeFile } = useFileUpload();

  const handleFilesSelected = (newFiles: File[]) => {
    addFiles(newFiles);
  };

  return (
    <Layout showBottomNav={false}>
      <div className="p-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">Create Study Plan</h1>
        <p className="text-gray-600 mb-6">Upload your study materials to get started</p>
        
        <FileUpload onFilesSelected={handleFilesSelected} />
        
        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="font-semibold text-gray-700">Uploaded Files ({files.length})</h2>
            {files.map((fileInfo) => (
              <FilePreview
                key={fileInfo.id}
                fileName={fileInfo.file.name}
                fileSize={fileInfo.file.size}
                onRemove={() => removeFile(fileInfo.id)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
