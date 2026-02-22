import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DatePicker } from '../DatePicker';

describe('DatePicker', () => {
  it('renders with label', () => {
    const onChange = vi.fn();
    render(
      <DatePicker
        value={null}
        onChange={onChange}
        label="Test Date"
      />
    );
    expect(screen.getByText('Test Date')).toBeInTheDocument();
  });

  it('renders input without label when not provided', () => {
    const onChange = vi.fn();
    render(
      <DatePicker
        value={null}
        onChange={onChange}
      />
    );
    const input = screen.getByDisplayValue('') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it('accepts date input and calls onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    
    render(
      <DatePicker
        value={null}
        onChange={onChange}
        label="Select Date"
      />
    );

    const input = screen.getByLabelText('Select Date') as HTMLInputElement;
    await user.type(input, '2026-03-15');

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
  });

  it('displays the value when provided', () => {
    const onChange = vi.fn();
    const testDate = new Date('2026-03-15T00:00:00Z');
    
    render(
      <DatePicker
        value={testDate}
        onChange={onChange}
      />
    );

    const input = screen.getByDisplayValue('2026-03-15') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it('enforces min date constraint', () => {
    const onChange = vi.fn();
    const minDate = new Date('2026-03-01T00:00:00Z');

    render(
      <DatePicker
        value={null}
        onChange={onChange}
        minDate={minDate}
      />
    );

    const input = screen.getByDisplayValue('') as HTMLInputElement;
    expect(input.min).toBe('2026-03-01');
  });

  it('enforces max date constraint', () => {
    const onChange = vi.fn();
    const maxDate = new Date('2026-03-31T00:00:00Z');

    render(
      <DatePicker
        value={null}
        onChange={onChange}
        maxDate={maxDate}
      />
    );

    const input = screen.getByDisplayValue('') as HTMLInputElement;
    expect(input.max).toBe('2026-03-31');
  });

  it('displays validation errors', () => {
    const onChange = vi.fn();
    const errorMessage = 'Please select a date after today';

    render(
      <DatePicker
        value={null}
        onChange={onChange}
        error={errorMessage}
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toHaveClass('text-red-600');
  });

  it('disables input when disabled prop is true', () => {
    const onChange = vi.fn();

    render(
      <DatePicker
        value={null}
        onChange={onChange}
        disabled={true}
      />
    );

    const input = screen.getByDisplayValue('') as HTMLInputElement;
    expect(input).toBeDisabled();
    expect(input).toHaveClass('bg-gray-100');
  });

  it('sets aria-label from label prop', () => {
    const onChange = vi.fn();

    render(
      <DatePicker
        value={null}
        onChange={onChange}
        label="Exam Date"
      />
    );

    const input = screen.getByLabelText('Exam Date');
    expect(input).toHaveAttribute('aria-label', 'Exam Date');
  });

  it('sets aria-invalid when error is present', () => {
    const onChange = vi.fn();

    render(
      <DatePicker
        value={null}
        onChange={onChange}
        error="Invalid date"
      />
    );

    const input = screen.getByDisplayValue('');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('applies error styling to border', () => {
    const onChange = vi.fn();

    render(
      <DatePicker
        value={null}
        onChange={onChange}
        error="Date required"
      />
    );

    const input = screen.getByDisplayValue('');
    expect(input).toHaveClass('border-red-500');
  });

  it('handles null value correctly', () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <DatePicker
        value={null}
        onChange={onChange}
      />
    );

    let input = screen.getByDisplayValue('') as HTMLInputElement;
    expect(input.value).toBe('');

    rerender(
      <DatePicker
        value={new Date('2026-03-15T00:00:00Z')}
        onChange={onChange}
      />
    );

    input = screen.getByDisplayValue('2026-03-15') as HTMLInputElement;
    expect(input.value).toBe('2026-03-15');
  });
});
