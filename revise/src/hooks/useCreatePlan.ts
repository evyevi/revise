import { useMemo, useReducer, useCallback } from 'react';
import { daysBetween, clampDateToToday } from '../lib/dateUtils';
import { generateStudyPlan, type PlanResponse } from '../lib/api';
import { db } from '../lib/db';
import type { StudyPlan, StudyDay, Flashcard, QuizQuestion, UploadedFile } from '../types';

/**
 * Transform PlanResponse and wizard state into StudyPlan database entity
 */
function transformToStudyPlan(
  plan: PlanResponse,
  testDate: Date,
  createdDate: Date,
  daysAvailable: number,
  minutesPerDay: number
): StudyPlan {
  return {
    id: crypto.randomUUID(),
    subject: plan.topics.length > 0 
      ? `${plan.topics[0].name} Study Plan` 
      : 'Study Plan',
    testDate,
    createdDate,
    totalDays: daysAvailable,
    suggestedMinutesPerDay: minutesPerDay,
    topics: plan.topics.map(t => ({
      id: t.id,
      name: t.name,
      importance: t.importance,
      keyPoints: t.keyPoints,
    })),
  };
}

/**
 * Transform schedule array into StudyDay database entities
 */
function transformToStudyDays(
  schedule: PlanResponse['schedule'],
  planId: string,
  createdDate: Date
): StudyDay[] {
  return schedule.map(day => ({
    id: crypto.randomUUID(),
    planId,
    dayNumber: day.dayNumber,
    date: new Date(createdDate.getTime() + (day.dayNumber - 1) * 86400000),
    completed: false,
    newTopicIds: day.newTopicIds,
    reviewTopicIds: day.reviewTopicIds,
    flashcardIds: [],
    quizIds: [],
    estimatedMinutes: day.estimatedMinutes,
  }));
}

/**
 * Transform flashcards array into Flashcard database entities
 */
function transformToFlashcards(flashcards: PlanResponse['flashcards']): Flashcard[] {
  return flashcards.map(card => ({
    id: crypto.randomUUID(),
    topicId: card.topicId,
    front: card.front,
    back: card.back,
    firstShownDate: undefined,
    reviewDates: [],
    masteryLevel: 0,
    needsPractice: false,
  }));
}

/**
 * Transform quiz questions array into QuizQuestion database entities
 */
function transformToQuizQuestions(quizQuestions: PlanResponse['quizQuestions']): QuizQuestion[] {
  return quizQuestions.map(q => ({
    id: crypto.randomUUID(),
    topicId: q.topicId,
    question: q.question,
    options: q.options,
    correctAnswerIndex: q.correctIndex,  // Field name mapping
    explanation: q.explanation,
  }));
}

/**
 * Transform uploaded files into UploadedFile database entities
 */
function transformToUploadedFiles(
  files: File[],
  planId: string,
  extractedText: string
): UploadedFile[] {
  return files.map(file => ({
    id: crypto.randomUUID(),
    planId,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    uploadedAt: new Date(),
    extractedText,
    fileBlob: file,
  }));
}

export interface WizardState {
  step: number;
  extractedText: string;
  testDate: Date | null;
  recommendedMinutesPerDay: number | null;
  minutesPerDay: number | null;
  plan: PlanResponse | null;
  isGenerating: boolean;
  isSaving: boolean;
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
  | { type: 'SET_SAVING'; payload: boolean }
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
    isSaving: false,
    error: null,
  };
}

function computeDaysAvailable(testDate: Date | null): number {
  if (!testDate) return 0;
  const today = new Date();
  const clamped = clampDateToToday(testDate, today);
  return daysBetween(today, clamped);
}

function isStepValidInState(state: WizardState, step: number): boolean {
  const daysAvailable = computeDaysAvailable(state.testDate);
  
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
    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };
    case 'NEXT_STEP':
      // Only advance if current step is valid
      if (isStepValidInState(state, state.step)) {
        return { ...state, step: state.step + 1 };
      }
      return state;
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
    dispatch({ type: 'NEXT_STEP' });
  }, []);

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

  const generatePlan = useCallback(async (): Promise<void> => {
    if (state.isGenerating) return;
    if (!state.extractedText || daysAvailable <= 0) {
      dispatch({ type: 'SET_ERROR', payload: 'Missing required data to generate plan.' });
      return;
    }

    dispatch({ type: 'SET_GENERATING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const request: { content: string; daysAvailable: number; minutesPerDay?: number } = {
        content: state.extractedText,
        daysAvailable,
      };

      if (state.minutesPerDay !== null) {
        request.minutesPerDay = state.minutesPerDay;
      }

      const plan = await generateStudyPlan(request, () => {});

      dispatch({ type: 'SET_PLAN', payload: plan });
      dispatch({ type: 'SET_RECOMMENDED_MINUTES', payload: plan.recommendedMinutesPerDay });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to generate plan',
      });
    } finally {
      dispatch({ type: 'SET_GENERATING', payload: false });
    }
  }, [state.extractedText, state.isGenerating, state.minutesPerDay, daysAvailable]);

  const savePlan = useCallback(
    async (files: File[]): Promise<string> => {
      // Validation
      if (!state.testDate) {
        throw new Error('Test date is required to save plan');
      }
      if (!state.plan) {
        throw new Error('Plan must be generated before saving');
      }
      if (!state.extractedText) {
        throw new Error('Extracted text is required to save plan');
      }

      dispatch({ type: 'SET_SAVING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        const createdDate = new Date();
        const minutesPerDay = state.minutesPerDay || state.recommendedMinutesPerDay || 30;

        // Transform data
        const studyPlan = transformToStudyPlan(
          state.plan,
          state.testDate,
          createdDate,
          daysAvailable,
          minutesPerDay
        );
        const studyDays = transformToStudyDays(state.plan.schedule, studyPlan.id, createdDate);
        const flashcards = transformToFlashcards(state.plan.flashcards);
        const quizQuestions = transformToQuizQuestions(state.plan.quizQuestions);
        const uploadedFiles = transformToUploadedFiles(files, studyPlan.id, state.extractedText);

        // Save to database in transaction
        await db.transaction('rw', [
          db.studyPlans,
          db.studyDays,
          db.flashcards,
          db.quizQuestions,
          db.uploadedFiles,
        ], async () => {
          await db.studyPlans.add(studyPlan);
          await db.studyDays.bulkAdd(studyDays);
          await db.flashcards.bulkAdd(flashcards);
          await db.quizQuestions.bulkAdd(quizQuestions);
          await db.uploadedFiles.bulkAdd(uploadedFiles);
        });

        dispatch({ type: 'SET_SAVING', payload: false });
        return studyPlan.id;
      } catch (error) {
        dispatch({ type: 'SET_SAVING', payload: false });
        const message = error instanceof Error ? error.message : 'Failed to save study plan';
        dispatch({ type: 'SET_ERROR', payload: message });
        throw error;
      }
    },
    [state, daysAvailable]
  );

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
    generatePlan,
    savePlan,
    reset,
    clearError,
    isSaving: state.isSaving,
  };
}

export {
  transformToStudyPlan,
  transformToStudyDays,
  transformToFlashcards,
  transformToQuizQuestions,
  transformToUploadedFiles,
};
