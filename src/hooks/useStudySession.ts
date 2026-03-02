import { useReducer, useCallback, useEffect } from 'react';
import { db } from '../lib/db';
import {
  getTodayStudyDay,
  getCardsByTopicIds,
  getQuizzesByTopicIds,
} from '../lib/planQueries';
import { recordFlashcardReview } from '../lib/reviewService';
import { calculateQuizScore, saveQuizResults } from '../lib/quizGrader';
import { Quality } from '../lib/sm2Calculator';
import type { StudyDay, Flashcard, QuizQuestion, QuizAttempt } from '../types';

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
  flashcardsReviewed: number;
  quizAttempts: QuizAttempt[];
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
  | { type: 'COMPLETE_SESSION'; payload: number }
  | { type: 'INCREMENT_FLASHCARDS_REVIEWED' }
  | { type: 'ADD_QUIZ_ATTEMPT'; payload: QuizAttempt };

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
    flashcardsReviewed: 0,
    quizAttempts: [],
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
    
    case 'INCREMENT_FLASHCARDS_REVIEWED':
      return { ...state, flashcardsReviewed: state.flashcardsReviewed + 1 };
    
    case 'ADD_QUIZ_ATTEMPT':
      return { ...state, quizAttempts: [...state.quizAttempts, action.payload] };
    
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
      const getTopicById = (id: string) => {
        const topic = topicsMap.get(id);
        if (!topic) {
          throw new Error('Study topic not found');
        }
        return topic;
      };
      const newTopics = studyDay.newTopicIds.map(getTopicById);
      const reviewTopics = studyDay.reviewTopicIds.map(getTopicById);

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
    void initializeSession();
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

  const gradeFlashcard = useCallback(async (cardId: string, quality: Quality) => {
    await recordFlashcardReview(cardId, quality);
    
    // Update count in state
    dispatch({ type: 'INCREMENT_FLASHCARDS_REVIEWED' });
  }, []);

  const answerQuiz = useCallback((quizIndex: number, answerIndex: number) => {
    dispatch({ type: 'ANSWER_QUIZ', payload: { quizIndex, answerIndex } });
    
    // Record attempt
    const quiz = state.quizzes[quizIndex];
    if (quiz) {
      const isCorrect = answerIndex === quiz.correctAnswerIndex;
      const attempt: QuizAttempt = {
        questionId: quiz.id,
        selectedAnswer: answerIndex,
        correct: isCorrect,
        // Derive Quality from correctness: correct → Good, incorrect → Again
        quality: isCorrect ? Quality.Good : Quality.Again,
      };
      dispatch({ type: 'ADD_QUIZ_ATTEMPT', payload: attempt });
    }
  }, [state.quizzes]);

  const nextQuiz = useCallback(() => {
    dispatch({ type: 'NEXT_QUIZ' });
  }, []);

  const prevQuiz = useCallback(() => {
    dispatch({ type: 'PREV_QUIZ' });
  }, []);

  const completeSession = useCallback(async () => {
    if (!state.studyDay) return;

    try {
      // Calculate XP: (quiz score / 10) + (cards reviewed * 2)
      const quizScore = calculateQuizScore(state.quizAttempts);
      const xpEarned = Math.floor(quizScore / 10) + (state.flashcardsReviewed * 2);

      // Save quiz results - CRITICAL, must not fail silently
      await saveQuizResults(
        state.studyDay.planId,
        state.studyDay.id,
        state.quizAttempts,
        state.flashcardsReviewed,
        xpEarned
      );

      // Mark day as complete
      try {
        await db.studyDays.update(state.studyDay.id, {
          completed: true,
        });
      } catch (dayError) {
        console.error('Warning: Could not mark day complete:', dayError);
        // Don't fail - non-critical
      }

      // Update user stats (non-critical)
      try {
        const stats = await db.userStats.get('default');
        if (stats) {
          await db.userStats.update('default', {
            totalXP: stats.totalXP + xpEarned,
            lastStudyDate: new Date(),
          });
        }
      } catch (statsError) {
        console.error('Warning: Could not update stats:', statsError);
        // Don't fail - non-critical
      }

      dispatch({ type: 'COMPLETE_SESSION', payload: xpEarned });
    } catch (error) {
      console.error('Failed to save quiz results (critical):', error);
      // THROW - this is critical, user needs to know
      throw error;
    }
  }, [state.studyDay, state.quizAttempts, state.flashcardsReviewed]);

  return {
    ...state,
    advanceStep,
    nextFlashcard,
    prevFlashcard,
    gradeFlashcard,
    answerQuiz,
    nextQuiz,
    prevQuiz,
    completeSession,
    flashcardsReviewed: state.flashcardsReviewed,
    quizAttempts: state.quizAttempts,
  };
}
