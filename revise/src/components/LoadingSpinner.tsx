export interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

const sizeMap = {
  sm: '20px',
  md: '40px',
  lg: '60px',
};

export function LoadingSpinner({
  message,
  size = 'md',
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinnerSize = sizeMap[size];

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        role="status"
        aria-label={message || 'Loading'}
        className="relative"
        style={{ width: spinnerSize, height: spinnerSize }}
      >
        <svg
          className="w-full h-full animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75 text-primary-500"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      {message && (
        <p className="text-center font-medium text-gray-700">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <div className="bg-white rounded-xl p-8 shadow-lg">
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
}
