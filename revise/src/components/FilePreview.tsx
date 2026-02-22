import { formatFileSize } from '../lib/formatters';

interface FilePreviewProps {
  fileName: string;
  fileSize: number;
  status?: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  onRemove: () => void;
}

export function FilePreview({ 
  fileName, 
  fileSize, 
  status = 'pending', 
  error,
  onRemove 
}: FilePreviewProps) {
  const getStatusBadge = () => {
    switch (status) {
      case 'pending':
        return <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Pending</span>;
      case 'processing':
        return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Processing...</span>;
      case 'completed':
        return <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">✓ Ready</span>;
      case 'error':
        return <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Error</span>;
    }
  };

  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
        <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      
      <div className="ml-4 flex items-center gap-3">
        {getStatusBadge()}
        <button
          type="button"
          onClick={onRemove}
          className="text-red-500 font-semibold text-sm px-3 py-1 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
          aria-label="Remove file"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
