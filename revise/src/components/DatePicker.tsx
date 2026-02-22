import React from 'react';

export interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  label?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  error?: string;
}

export function DatePicker({
  value,
  onChange,
  label,
  minDate,
  maxDate,
  disabled = false,
  error,
}: DatePickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value;
    if (dateString) {
      const date = new Date(dateString + 'T00:00:00Z');
      onChange(date);
    }
  };

  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const formatDateForConstraint = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label}
        </label>
      )}
      <input
        type="date"
        value={formatDateForInput(value)}
        onChange={handleChange}
        disabled={disabled}
        min={formatDateForConstraint(minDate)}
        max={formatDateForConstraint(maxDate)}
        aria-label={label}
        aria-invalid={!!error}
        aria-describedby={error ? 'date-error' : undefined}
        className={`w-full px-4 py-2 border rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 ${
          disabled
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            : error
              ? 'border-red-500 focus:ring-red-500 bg-white'
              : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500 bg-white'
        }`}
      />
      {error && (
        <p id="date-error" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
