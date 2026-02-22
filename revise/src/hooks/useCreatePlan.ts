import { useMemo, useReducer } from 'react';
import { daysBetween, clampDateToToday } from '../lib/dateUtils';
import type { PlanResponse } from '../lib/api';

export interface WizardState {
  step: number;
  extractedText: string;
  testDate: Date | null;
  recommendedMinutesPerDay: number | null;
  minutesPerDay: number | null;
  plan: PlanResponse | null;
  isGenerating: boolean;
  error: string | null;
}

export function getInitialWizardState(): WizardState {
  return {
    step: 1,
    extractedText: '',
    testDate: null,
    recommendedMinutesPerDay: null,
    minutesPerDay: null,
    plan: null,
    isGenerating: false,
    error: null,
  };
}

// Reducer and hook will be completed in Task 2.
export function useCreatePlan() {
  const [state] = useReducer(() => getInitialWizardState(), getInitialWizardState());
  const daysAvailable = useMemo(() => {
    if (!state.testDate) return 0;
    const today = new Date();
    const clamped = clampDateToToday(state.testDate, today);
    return daysBetween(today, clamped);
  }, [state.testDate]);

  return {
    ...state,
    daysAvailable,
    setTestDate: () => undefined,
  };
}
