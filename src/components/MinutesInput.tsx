import React from 'react';

const DEFAULT_MIN = 5;
const DEFAULT_MAX = 480;
const DEFAULT_STEP = 5;

export interface MinutesInputProps {
  value: number | null;
  onChange: (minutes: number | null) => void;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  error?: string;
  showRecommendation?: boolean;
  recommendedValue?: number;
}

export function MinutesInput({
  value,
  onChange,
  label,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  step = DEFAULT_STEP,
  disabled = false,
  error,
  showRecommendation = false,
  recommendedValue,
}: MinutesInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue === '') {
      onChange(null);
      return;
    }

    let numValue = parseFloat(inputValue);

    // Coerce decimal to integer
    numValue = Math.round(numValue);

    // Validate range
    if (numValue < min) {
      numValue = min;
    }
    if (numValue > max) {
      numValue = max;
    }

    onChange(numValue);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {label && (
          <label className="block text-sm font-semibold text-gray-700">
            {label}
          </label>
        )}
        {showRecommendation && recommendedValue !== undefined && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700">
            Recommended: {recommendedValue}
          </span>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="number"
          value={value ?? ''}
          onChange={handleChange}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          placeholder="0"
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? 'minutes-error' : undefined}
          className={`w-full px-4 py-2 border rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 ${
            disabled
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : error
                ? 'border-red-500 focus:ring-red-500 bg-white'
                : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500 bg-white'
          }`}
        />
        <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
          min/day
        </span>
      </div>
      {error && (
        <p id="minutes-error" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      {!error && min && max && (
        <p className="text-xs text-gray-500">
          {min} - {max} minutes
        </p>
      )}
    </div>
  );
}
