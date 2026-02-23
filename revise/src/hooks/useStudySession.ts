import { useReducer, useCallback, useEffect } from 'react';
import { db } from '../lib/db';
import {
  getTodayStudyDay,
  getCardsByTopicIds,
  getQuizzesByTopicIds,
} from '../lib/planQueries';
import type { StudyDay, Flashcard, QuizQuestion } from '../types';

export interface SessionState {
  step: 'concepts' | 'flashcards' | 'quiz' | 'completion' | 'loading' | 'error';
  studyDay: StudyDay | null;
  newTopics: Array<{ id: string; name: string; keyPoints: string[] }>;
  reviewTopics: Array<{ id: string; name: string; keyPoints: string[] }>;
  flashcards: Flashcard[];
  quizzes: QuizQuestion[];
  currentFlashcardIndex: number;
  currentQuizIndex: number;
  quizAnswers: Map<string, number>; // quiz id -> answer index
  xpEarned: number;
  error: string | null;
}

type SessionAction =
  | { type: 'INIT_SUCCESS'; payload: { studyDay: StudyDay; newTopics: Array<{ id: string; name: string; keyPoints: string[] }>; reviewTopics: Array<{ id: string; name: string; keyPoints: string[] }>; flashcards: Flashcard[]; quizzes: QuizQuestion[] } }
  | { type: 'INIT_ERROR'; payload: string }
  | { type: 'ADVANCE_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'NEXT_FLASHCARD' }
  | { type: 'PREV_FLASHCARD' }
  | { type: 'ANSWER_QUIZ'; payload: { quizIndex: number; answerIndex: number } }
  | { type: 'NEXT_QUIZ' }
  | { type: 'PREV_QUIZ' }
  | { type: 'COMPLETE_SESSION'; payload: number };

function getInitialState(): SessionState {
  return {
    step: 'loading',
    studyDay: null,
    newTopics: [],
    reviewTopics: [],
    flashcards: [],
    quizzes: [],
    currentFlashcardIndex: 0,
    currentQuizIndex: 0,
    quizAnswers: new Map(),
    xpEarned: 0,
    error: null,
  };
}

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'INIT_SUCCESS':
      return {
        ...state,
        step: 'concepts',
        studyDay: action.payload.studyDay,
        newTopics: action.payload.newTopics,
        reviewTopics: action.payload.reviewTopics,
        flashcards: action.payload.flashcards,
        quizzes: action.payload.quizzes,
      };
    
    case 'INIT_ERROR':
      return {
        ...state,
        step: 'error',
        error: action.payload,
      };
    
    case 'ADVANCE_STEP': {
      const steps: SessionState['step'][] = ['concepts', 'flashcards', 'quiz', 'completion'];
      const currentIndex = steps.indexOf(state.step);
      if (currentIndex < steps.length - 1) {
        return { ...state, step: steps[currentIndex + 1] };
      }
      return state;
    }
    
    case 'NEXT_FLASHCARD':
      return {
        ...state,
        currentFlashcardIndex: Math.min(
          state.currentFlashcardIndex + 1,
          state.flashcards.length - 1
        ),
      };
    
    case 'PREV_FLASHCARD':
      return {
        ...state,
        currentFlashcardIndex: Math.max(state.currentFlashcardIndex - 1, 0),
      };
    
    case 'ANSWER_QUIZ': {
      const newAnswers = new Map(state.quizAnswers);
      const quizId = state.quizzes[action.payload.quizIndex]?.id;
      if (quizId) {
        newAnswers.set(quizId, action.payload.answerIndex);
      }
      return { ...state, quizAnswers: newAnswers };
    }
    
    case 'NEXT_QUIZ':
      return {
        ...state,
        currentQuizIndex: Math.min(
          state.currentQuizIndex + 1,
          state.quizzes.length - 1
        ),
      };
    
    case 'PREV_QUIZ':
      return {
        ...state,
        currentQuizIndex: Math.max(state.currentQuizIndex - 1, 0),
      };
    
    case 'COMPLETE_SESSION':
      return {
        ...state,
        step: 'completion',
        xpEarned: action.payload,
      };
    
    default:
      return state;
  }
}

export function useStudySession(planId: string) {
  const [state, dispatch] = useReducer(sessionReducer, getInitialState());

  const initializeSession = useCallback(async () => {
    try {
      // Get today's study day
      const studyDay = await getTodayStudyDay(planId);
      if (!studyDay) {
        throw new Error('No study session for today');
      }

      // Get plan to access topics
      const plan = await db.studyPlans.get(planId);
      if (!plan) {
        throw new Error('Study plan not found');
      }

      // Separate new and review topics
      const topicsMap = new Map(plan.topics.map((t) => [t.id, t]));
      const newTopics = studyDay.newTopicIds.map((id) => topicsMap.get(id)!);
      const reviewTopics = studyDay.reviewTopicIds.map((id) => topicsMap.get(id)!);

      // Get cards and quizzes for all topics for today
      const allTopicIds = [...studyDay.newTopicIds, ...studyDay.reviewTopicIds];
      const flashcards = await getCardsByTopicIds(allTopicIds);
      const quizzes = await getQuizzesByTopicIds(allTopicIds);

      dispatch({
        type: 'INIT_SUCCESS',
        payload: {
          studyDay,
          newTopics,
          reviewTopics,
          flashcards,
          quizzes,
        },
      });
    } catch (error) {
      dispatch({
        type: 'INIT_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load session',
      });
    }
  }, [planId]);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  const advanceStep = useCallback(() => {
    dispatch({ type: 'ADVANCE_STEP' });
  }, []);

  const nextFlashcard = useCallback(() => {
    dispatch({ type: 'NEXT_FLASHCARD' });
  }, []);

  const prevFlashcard = useCallback(() => {
    dispatch({ type: 'PREV_FLASHCARD' });
  }, []);

  const answerQuiz = useCallback((quizIndex: number, answerIndex: number) => {
    dispatch({ type: 'ANSWER_QUIZ', payload: { quizIndex, answerIndex } });
  }, []);

  const nextQuiz = useCallback(() => {
    dispatch({ type: 'NEXT_QUIZ' });
  }, []);

  const prevQuiz = useCallback(() => {
    dispatch({ type: 'PREV_QUIZ' });
  }, []);

  const completeSession = useCallback(async (xp: number, studyDayId: string) => {
    if (!studyDayId) {
      dispatch({
        type: 'INIT_ERROR',
        payload: 'No study day found. Please try again.',
      });
      return;
    }

    try {
      // Mark day as complete
      await db.studyDays.update(studyDayId, {
        completed: true,
      });

      // Add XP to user stats
      const stats = await db.userStats.get('default');
      if (stats) {
        await db.userStats.update('default', {
          totalXP: stats.totalXP + xp,
        });
      }

      dispatch({ type: 'COMPLETE_SESSION', payload: xp });
    } catch (error) {
      dispatch({
        type: 'INIT_ERROR',
        payload: 'Failed to save progress. Please try again.',
      });
    }
  }, []);

  return {
    ...state,
    advanceStep,
    nextFlashcard,
    prevFlashcard,
    answerQuiz,
    nextQuiz,
    prevQuiz,
    completeSession,
  };
}
