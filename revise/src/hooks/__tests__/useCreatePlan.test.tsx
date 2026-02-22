import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreatePlan, getInitialWizardState } from '../useCreatePlan';
import { generateStudyPlan } from '../../lib/api';

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

  it('calls generateStudyPlan without minutes on first generate', async () => {
    const { result } = renderHook(() => useCreatePlan());

    act(() => {
      result.current.setExtractedText('content');
      result.current.setTestDate(new Date('2026-02-24T00:00:00Z'));
    });

    vi.mocked(generateStudyPlan).mockResolvedValueOnce({
      topics: [],
      schedule: [],
      flashcards: [],
      quizQuestions: [],
      recommendedMinutesPerDay: 30,
    });

    await act(async () => {
      await result.current.generatePlan();
    });

    expect(generateStudyPlan).toHaveBeenCalledWith(
      { content: 'content', daysAvailable: 2 },
      expect.any(Function)
    );
    expect(result.current.recommendedMinutesPerDay).toBe(30);
  });

  it('sends minutesPerDay when user sets it', async () => {
    const { result } = renderHook(() => useCreatePlan());

    act(() => {
      result.current.setExtractedText('content');
      result.current.setTestDate(new Date('2026-02-24T00:00:00Z'));
      result.current.setMinutesPerDay(45);
    });

    vi.mocked(generateStudyPlan).mockResolvedValueOnce({
      topics: [],
      schedule: [],
      flashcards: [],
      quizQuestions: [],
      recommendedMinutesPerDay: 30,
    });

    await act(async () => {
      await result.current.generatePlan();
    });

    expect(generateStudyPlan).toHaveBeenCalledWith(
      { content: 'content', daysAvailable: 2, minutesPerDay: 45 },
      expect.any(Function)
    );
  });
});
