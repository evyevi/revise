import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreatePlan, getInitialWizardState } from '../useCreatePlan';

vi.mock('../../lib/api', () => ({
  generateStudyPlan: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe('useCreatePlan', () => {
  it('initializes to step 1 with empty values', () => {
    const state = getInitialWizardState();
    expect(state.step).toBe(1);
    expect(state.testDate).toBeNull();
    expect(state.minutesPerDay).toBeNull();
    expect(state.recommendedMinutesPerDay).toBeNull();
    expect(state.plan).toBeNull();
  });

  it('exposes derived daysAvailable when testDate is set', () => {
    const { result } = renderHook(() => useCreatePlan());
    const testDate = new Date('2026-02-24T00:00:00Z');

    act(() => {
      result.current.setTestDate(testDate);
    });

    expect(result.current.daysAvailable).toBe(2);
  });

  it('advances steps only when current step is valid', () => {
    const { result } = renderHook(() => useCreatePlan());

    act(() => {
      result.current.nextStep();
    });

    // No files/extracted text yet, should not advance
    expect(result.current.step).toBe(1);

    act(() => {
      result.current.setExtractedText('Some content');
      result.current.nextStep();
    });

    expect(result.current.step).toBe(2);
  });
});
