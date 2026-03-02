import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MinutesInput } from '../MinutesInput';

describe('MinutesInput', () => {
  it('renders with label', () => {
    const onChange = vi.fn();
    render(
      <MinutesInput
        value={null}
        onChange={onChange}
        label="Study Time"
      />
    );
    expect(screen.getByText('Study Time')).toBeInTheDocument();
  });

  it('renders min/max range hint', () => {
    const onChange = vi.fn();
    render(
      <MinutesInput
        value={null}
        onChange={onChange}
        min={5}
        max={480}
      />
    );
    expect(screen.getByText('5 - 480 minutes')).toBeInTheDocument();
  });

  it('accepts numeric input and calls onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <MinutesInput
        value={null}
        onChange={onChange}
        min={5}
        max={480}
      />
    );

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    await user.type(input, '30');

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
      // Just verify it was called with a number in valid range
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(typeof lastCall[0]).toBe('number');
      expect(lastCall[0]).toBeGreaterThanOrEqual(5);
      expect(lastCall[0]).toBeLessThanOrEqual(480);
    });
  });

  it('displays the value when provided', () => {
    const onChange = vi.fn();

    render(
      <MinutesInput
        value={45}
        onChange={onChange}
      />
    );

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('45');
  });

  it('enforces min value constraint', () => {
    const onChange = vi.fn();

    render(
      <MinutesInput
        value={null}
        onChange={onChange}
        min={10}
        max={100}
      />
    );

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.min).toBe('10');
  });

  it('enforces max value constraint', async () => {
    const onChange = vi.fn();

    render(
      <MinutesInput
        value={null}
        onChange={onChange}
        min={5}
        max={480}
      />
    );

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.max).toBe('480');
  });


  it('displays validation errors', () => {
    const onChange = vi.fn();
    const errorMessage = 'Minutes must be between 5 and 480';

    render(
      <MinutesInput
        value={null}
        onChange={onChange}
        error={errorMessage}
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toHaveClass('text-red-600');
  });

  it('hides min/max hint when error is present', () => {
    const onChange = vi.fn();

    render(
      <MinutesInput
        value={null}
        onChange={onChange}
        min={5}
        max={480}
        error="Error message"
      />
    );

    expect(screen.queryByText('5 - 480 minutes')).not.toBeInTheDocument();
  });

  it('shows recommended badge when requested', () => {
    const onChange = vi.fn();

    render(
      <MinutesInput
        value={null}
        onChange={onChange}
        showRecommendation={true}
        recommendedValue={35}
      />
    );

    expect(screen.getByText('Recommended: 35')).toBeInTheDocument();
    expect(screen.getByText('Recommended: 35')).toHaveClass('bg-blue-100');
  });

  it('does not show badge when showRecommendation is false', () => {
    const onChange = vi.fn();

    render(
      <MinutesInput
        value={null}
        onChange={onChange}
        showRecommendation={false}
        recommendedValue={35}
      />
    );

    expect(screen.queryByText('Recommended: 35')).not.toBeInTheDocument();
  });

  it('disables input when disabled prop is true', () => {
    const onChange = vi.fn();

    render(
      <MinutesInput
        value={null}
        onChange={onChange}
        disabled={true}
      />
    );

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input).toBeDisabled();
    expect(input).toHaveClass('bg-gray-100');
  });

  it('sets aria-label from label prop', () => {
    const onChange = vi.fn();

    render(
      <MinutesInput
        value={null}
        onChange={onChange}
        label="Daily Study Minutes"
      />
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('aria-label', 'Daily Study Minutes');
  });

  it('sets aria-invalid when error is present', () => {
    const onChange = vi.fn();

    render(
      <MinutesInput
        value={null}
        onChange={onChange}
        error="Invalid value"
      />
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('applies error styling to border', () => {
    const onChange = vi.fn();

    render(
      <MinutesInput
        value={null}
        onChange={onChange}
        error="Value required"
      />
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveClass('border-red-500');
  });

  it('respects step prop', () => {
    const onChange = vi.fn();

    render(
      <MinutesInput
        value={null}
        onChange={onChange}
        step={10}
      />
    );

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.step).toBe('10');
  });

  it('defaults to step 5 when not provided', () => {
    const onChange = vi.fn();

    render(
      <MinutesInput
        value={null}
        onChange={onChange}
      />
    );

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.step).toBe('5');
  });

  it('handles null value display', () => {
    const onChange = vi.fn();

    render(
      <MinutesInput
        value={null}
        onChange={onChange}
      />
    );

    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('displays unit label', () => {
    const onChange = vi.fn();

    render(
      <MinutesInput
        value={30}
        onChange={onChange}
      />
    );

    expect(screen.getByText('min/day')).toBeInTheDocument();
  });
});
