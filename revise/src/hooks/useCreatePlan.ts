import { useMemo, useReducer, useCallback } from 'react';
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

type WizardAction =
  | { type: 'SET_EXTRACTED_TEXT'; payload: string }
  | { type: 'SET_TEST_DATE'; payload: Date | null }
  | { type: 'SET_MINUTES'; payload: number | null }
  | { type: 'SET_RECOMMENDED_MINUTES'; payload: number | null }
  | { type: 'SET_PLAN'; payload: PlanResponse | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GO_TO_STEP'; payload: number }
  | { type: 'RESET' };

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

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_EXTRACTED_TEXT':
      return { ...state, extractedText: action.payload };
    case 'SET_TEST_DATE':
      return { ...state, testDate: action.payload };
    case 'SET_MINUTES':
      return { ...state, minutesPerDay: action.payload };
    case 'SET_RECOMMENDED_MINUTES':
      return { ...state, recommendedMinutesPerDay: action.payload };
    case 'SET_PLAN':
      return { ...state, plan: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    case 'NEXT_STEP':
      return { ...state, step: state.step + 1 };
    case 'PREV_STEP':
      return { ...state, step: Math.max(1, state.step - 1) };
    case 'GO_TO_STEP':
      return { ...state, step: action.payload };
    case 'RESET':
      return getInitialWizardState();
    default:
      return state;
  }
}

// Reducer and hook will be completed in Task 2.
export function useCreatePlan() {
  const [state, dispatch] = useReducer(reducer, getInitialWizardState());
  
  const daysAvailable = useMemo(() => {
    if (!state.testDate) return 0;
    const today = new Date();
    const clamped = clampDateToToday(state.testDate, today);
    return daysBetween(today, clamped);
  }, [state.testDate]);

  const isStepValid = useCallback((step: number): boolean => {
    switch (step) {
      case 1: // Upload step
        return state.extractedText.length > 0;
      case 2: // Test date step
        return state.testDate !== null && daysAvailable > 0;
      case 3: // Minutes step
        return (
          state.minutesPerDay !== null ||
          state.recommendedMinutesPerDay !== null
        );
      case 4: // Generate step
        return state.plan !== null;
      case 5: // Review step
        return state.plan !== null;
      default:
        return false;
    }
  }, [state.extractedText, state.testDate, state.minutesPerDay, state.recommendedMinutesPerDay, state.plan, daysAvailable]);

  const canProceed = useMemo(() => {
    return isStepValid(state.step);
  }, [state.step, isStepValid]);

  const setExtractedText = useCallback((text: string) => {
    dispatch({ type: 'SET_EXTRACTED_TEXT', payload: text });
  }, []);

  const setTestDate = useCallback((date: Date | null) => {
    dispatch({ type: 'SET_TEST_DATE', payload: date });
  }, []);

  const setMinutesPerDay = useCallback((minutes: number | null) => {
    dispatch({ type: 'SET_MINUTES', payload: minutes });
  }, []);

  const setRecommendedMinutesPerDay = useCallback((minutes: number | null) => {
    dispatch({ type: 'SET_RECOMMENDED_MINUTES', payload: minutes });
  }, []);

  const nextStep = useCallback(() => {
    if (canProceed) {
      dispatch({ type: 'NEXT_STEP' });
    }
  }, [canProceed]);

  const prevStep = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, []);

  const goToStep = useCallback((step: number) => {
    dispatch({ type: 'GO_TO_STEP', payload: step });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  return {
    ...state,
    daysAvailable,
    canProceed,
    isStepValid,
    setExtractedText,
    setTestDate,
    setMinutesPerDay,
    setRecommendedMinutesPerDay,
    nextStep,
    prevStep,
    goToStep,
    reset,
    clearError,
  };
}
