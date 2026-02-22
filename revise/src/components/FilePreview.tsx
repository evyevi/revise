interface FilePreviewProps {
  fileName: string;
  fileSize: number;
  onRemove: () => void;
}

export function FilePreview({ fileName, fileSize, onRemove }: FilePreviewProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
        <p className="text-xs text-gray-500">{formatSize(fileSize)}</p>
      </div>
      
      <button
        onClick={onRemove}
        className="ml-4 text-red-500 font-semibold text-sm px-3 py-1 rounded hover:bg-red-50"
      >
        Remove
      </button>
    </div>
  );
}
