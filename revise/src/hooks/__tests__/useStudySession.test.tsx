import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useStudySession } from '../useStudySession';
import { db } from '../../lib/db';
import * as planQueries from '../../lib/planQueries';
import type { StudyDay, StudyPlan, Flashcard, QuizQuestion } from '../../types';

// Mock the dependencies
vi.mock('../../lib/db', () => ({
  db: {
    studyPlans: {
      get: vi.fn(),
    },
    studyDays: {
      get: vi.fn(),
      update: vi.fn(),
    },
    userStats: {
      get: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../lib/planQueries', () => ({
  getTodayStudyDay: vi.fn(),
  getCardsByTopicIds: vi.fn(),
  getQuizzesByTopicIds: vi.fn(),
}));

describe('useStudySession', () => {
  const mockPlanId = 'plan-123';
  
  const mockStudyDay: StudyDay = {
    id: 'day-1',
    planId: mockPlanId,
    dayNumber: 1,
    date: new Date('2026-02-23'),
    completed: false,
    newTopicIds: ['topic-1', 'topic-2'],
    reviewTopicIds: ['topic-3'],
    flashcardIds: [],
    quizIds: [],
    estimatedMinutes: 30,
  };

  const mockPlan: StudyPlan = {
    id: mockPlanId,
    subject: 'Biology',
    testDate: new Date('2026-03-15'),
    createdDate: new Date('2026-02-20'),
    totalDays: 21,
    suggestedMinutesPerDay: 30,
    topics: [
      { id: 'topic-1', name: 'Cell Structure', importance: 'high', keyPoints: ['Nucleus', 'Mitochondria'] },
      { id: 'topic-2', name: 'DNA', importance: 'high', keyPoints: ['Double helix', 'Base pairs'] },
      { id: 'topic-3', name: 'Proteins', importance: 'medium', keyPoints: ['Amino acids', 'Folding'] },
    ],
  };

  const mockFlashcards: Flashcard[] = [
    {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'What is the powerhouse of the cell?',
      back: 'Mitochondria',
      reviewDates: [],
      masteryLevel: 0,
    },
    {
      id: 'card-2',
      topicId: 'topic-2',
      front: 'What shape is DNA?',
      back: 'Double helix',
      reviewDates: [],
      masteryLevel: 0,
    },
  ];

  const mockQuizzes: QuizQuestion[] = [
    {
      id: 'quiz-1',
      topicId: 'topic-1',
      question: 'Which organelle produces energy?',
      options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi'],
      correctAnswerIndex: 1,
      explanation: 'Mitochondria is the powerhouse of the cell',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(planQueries.getTodayStudyDay).mockResolvedValue(mockStudyDay);
    vi.mocked(db.studyPlans.get).mockResolvedValue(mockPlan);
    vi.mocked(planQueries.getCardsByTopicIds).mockResolvedValue(mockFlashcards);
    vi.mocked(planQueries.getQuizzesByTopicIds).mockResolvedValue(mockQuizzes);
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useStudySession(mockPlanId));
    
    expect(result.current.step).toBe('loading');
    expect(result.current.studyDay).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should load session data successfully', async () => {
    const { result } = renderHook(() => useStudySession(mockPlanId));

    await waitFor(() => {
      expect(result.current.step).toBe('concepts');
    });

    expect(result.current.studyDay).toEqual(mockStudyDay);
    expect(result.current.newTopics).toHaveLength(2);
    expect(result.current.reviewTopics).toHaveLength(1);
    expect(result.current.flashcards).toEqual(mockFlashcards);
    expect(result.current.quizzes).toEqual(mockQuizzes);
  });

  it('should handle initialization error when no study day exists', async () => {
    vi.mocked(planQueries.getTodayStudyDay).mockResolvedValue(undefined);

    const { result } = renderHook(() => useStudySession(mockPlanId));

    await waitFor(() => {
      expect(result.current.step).toBe('error');
    });

    expect(result.current.error).toBe('No study session for today');
  });

  it('should handle initialization error when plan not found', async () => {
    vi.mocked(db.studyPlans.get).mockResolvedValue(undefined);

    const { result } = renderHook(() => useStudySession(mockPlanId));

    await waitFor(() => {
      expect(result.current.step).toBe('error');
    });

    expect(result.current.error).toBe('Study plan not found');
  });

  it('should advance through steps correctly', async () => {
    const { result } = renderHook(() => useStudySession(mockPlanId));

    await waitFor(() => {
      expect(result.current.step).toBe('concepts');
    });

    act(() => {
      result.current.advanceStep();
    });
    expect(result.current.step).toBe('flashcards');

    act(() => {
      result.current.advanceStep();
    });
    expect(result.current.step).toBe('quiz');

    act(() => {
      result.current.advanceStep();
    });
    expect(result.current.step).toBe('completion');

    // Should not advance past completion
    act(() => {
      result.current.advanceStep();
    });
    expect(result.current.step).toBe('completion');
  });

  it('should navigate flashcards correctly', async () => {
    const { result } = renderHook(() => useStudySession(mockPlanId));

    await waitFor(() => {
      expect(result.current.step).toBe('concepts');
    });

    expect(result.current.currentFlashcardIndex).toBe(0);

    act(() => {
      result.current.nextFlashcard();
    });
    expect(result.current.currentFlashcardIndex).toBe(1);

    // Should not go past last card
    act(() => {
      result.current.nextFlashcard();
    });
    expect(result.current.currentFlashcardIndex).toBe(1);

    act(() => {
      result.current.prevFlashcard();
    });
    expect(result.current.currentFlashcardIndex).toBe(0);

    // Should not go below 0
    act(() => {
      result.current.prevFlashcard();
    });
    expect(result.current.currentFlashcardIndex).toBe(0);
  });

  it('should record quiz answers', async () => {
    const { result } = renderHook(() => useStudySession(mockPlanId));

    await waitFor(() => {
      expect(result.current.step).toBe('concepts');
    });

    expect(result.current.quizAnswers.size).toBe(0);

    act(() => {
      result.current.answerQuiz(0, 1);
    });

    expect(result.current.quizAnswers.size).toBe(1);
    expect(result.current.quizAnswers.get('quiz-1')).toBe(1);

    // Change answer
    act(() => {
      result.current.answerQuiz(0, 2);
    });

    expect(result.current.quizAnswers.size).toBe(1);
    expect(result.current.quizAnswers.get('quiz-1')).toBe(2);
  });

  it('should navigate quiz questions correctly', async () => {
    const { result } = renderHook(() => useStudySession(mockPlanId));

    await waitFor(() => {
      expect(result.current.step).toBe('concepts');
    });

    expect(result.current.currentQuizIndex).toBe(0);

    // With only 1 quiz, should not advance
    act(() => {
      result.current.nextQuiz();
    });
    expect(result.current.currentQuizIndex).toBe(0);

    act(() => {
      result.current.prevQuiz();
    });
    expect(result.current.currentQuizIndex).toBe(0);
  });

  it('should complete session and update database', async () => {
    const mockUserStats = {
      id: 'default',
      totalXP: 100,
      currentStreak: 5,
      longestStreak: 10,
      badges: [],
    };

    vi.mocked(db.userStats.get).mockResolvedValue(mockUserStats);

    const { result } = renderHook(() => useStudySession(mockPlanId));

    await waitFor(() => {
      expect(result.current.step).toBe('concepts');
    });

    await act(async () => {
      await result.current.completeSession(75);
    });

    expect(result.current.step).toBe('completion');
    expect(result.current.xpEarned).toBe(75);

    // Verify database updates
    expect(db.studyDays.update).toHaveBeenCalledWith('day-1', {
      completed: true,
    });

    expect(db.userStats.update).toHaveBeenCalledWith('default', {
      totalXP: 175,
    });
  });

  it('should handle completing session without user stats', async () => {
    vi.mocked(db.userStats.get).mockResolvedValue(undefined);

    const { result } = renderHook(() => useStudySession(mockPlanId));

    await waitFor(() => {
      expect(result.current.step).toBe('concepts');
    });

    await act(async () => {
      await result.current.completeSession(50);
    });

    expect(result.current.step).toBe('completion');
    expect(result.current.xpEarned).toBe(50);
    
    // Should update day but not crash on missing stats
    expect(db.studyDays.update).toHaveBeenCalled();
    expect(db.userStats.update).not.toHaveBeenCalled();
  });
});
