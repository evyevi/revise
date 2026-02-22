import { useRef } from 'react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  acceptedTypes?: string;
}

export function FileUpload({ onFilesSelected, acceptedTypes = '.pdf,.txt,.jpg,.jpeg,.png,.pptx' }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full bg-primary-500 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg active:scale-95 transition-transform"
      >
        📁 Upload Files
      </button>
      
      <button
        onClick={() => cameraInputRef.current?.click()}
        className="w-full bg-accent-200 text-gray-800 py-4 px-6 rounded-xl font-semibold text-lg shadow-lg active:scale-95 transition-transform"
      >
        📸 Take Photo
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
