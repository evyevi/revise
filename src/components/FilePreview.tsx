import { formatFileSize } from '../lib/formatters';

interface FilePreviewProps {
  fileName: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  error?: string;
  onRemove: () => void;
}

export function FilePreview({
  fileName,
  fileSize,
  status,
  progress,
  error,
  onRemove,
}: FilePreviewProps) {
  const getStatusDisplay = () => {
    if (status === 'processing') {
      return (
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full" />
          <span className="text-xs text-gray-600">
            {progress !== undefined ? `${progress}%` : 'Processing...'}
          </span>
        </div>
      );
    }
    if (status === 'completed') {
      return <span className="text-xs text-green-600 font-semibold">✓ Ready</span>;
    }
    if (status === 'error') {
      return <span className="text-xs text-red-600 font-semibold">✗ Error</span>;
    }
    return <span className="text-xs text-gray-400">Pending</span>;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
          <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
        
        <div className="ml-4 flex flex-col items-end space-y-2">
          {getStatusDisplay()}
          <button
            type="button"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 font-semibold text-sm px-3 py-1 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
            aria-label="Remove file"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
