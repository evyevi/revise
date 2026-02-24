import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateQuizScore, saveQuizResults } from '../quizGrader';
import { db } from '../db';
import type { QuizAttempt } from '../../types';

vi.mock('../db', () => ({
  db: {
    progressLogs: {
      add: vi.fn(),
    },
  },
}));

describe('calculateQuizScore', () => {
  it('returns 100 for all correct answers', () => {
    const attempts: QuizAttempt[] = [
      { questionId: 'q1', selectedAnswer: 0, correct: true },
      { questionId: 'q2', selectedAnswer: 1, correct: true },
      { questionId: 'q3', selectedAnswer: 2, correct: true },
    ];

    expect(calculateQuizScore(attempts)).toBe(100);
  });

  it('returns 0 for all incorrect answers', () => {
    const attempts: QuizAttempt[] = [
      { questionId: 'q1', selectedAnswer: 0, correct: false },
      { questionId: 'q2', selectedAnswer: 1, correct: false },
      { questionId: 'q3', selectedAnswer: 2, correct: false },
    ];

    expect(calculateQuizScore(attempts)).toBe(0);
  });

  it('calculates mixed score correctly', () => {
    const attempts: QuizAttempt[] = [
      { questionId: 'q1', selectedAnswer: 0, correct: true },
      { questionId: 'q2', selectedAnswer: 1, correct: false },
      { questionId: 'q3', selectedAnswer: 2, correct: true },
      { questionId: 'q4', selectedAnswer: 0, correct: false },
    ];

    // 2/4 = 50%
    expect(calculateQuizScore(attempts)).toBe(50);
  });

  it('rounds score to nearest integer', () => {
    const attempts: QuizAttempt[] = [
      { questionId: 'q1', selectedAnswer: 0, correct: true },
      { questionId: 'q2', selectedAnswer: 1, correct: false },
      { questionId: 'q3', selectedAnswer: 2, correct: false },
    ];

    // 1/3 = 33.333... -> 33
    expect(calculateQuizScore(attempts)).toBe(33);
  });

  it('returns 0 for empty attempts', () => {
    expect(calculateQuizScore([])).toBe(0);
  });
});

describe('saveQuizResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves quiz results to database', async () => {
    const attempts: QuizAttempt[] = [
      { questionId: 'q1', selectedAnswer: 0, correct: true },
      { questionId: 'q2', selectedAnswer: 1, correct: true },
    ];

    vi.mocked(db.progressLogs.add).mockResolvedValue('log-1');

    const result = await saveQuizResults('plan-1', 'day-1', attempts, 10, 50);

    expect(db.progressLogs.add).toHaveBeenCalledWith({
      id: expect.any(String),
      planId: 'plan-1',
      dayId: 'day-1',
      completedAt: expect.any(Date),
      xpEarned: 50,
      quizScore: 100,
      flashcardsReviewed: 10,
    });

    expect(result).toMatchObject({
      planId: 'plan-1',
      dayId: 'day-1',
      quizScore: 100,
      flashcardsReviewed: 10,
      xpEarned: 50,
    });
  });

  it('re-throws database errors', async () => {
    const attempts: QuizAttempt[] = [
      { questionId: 'q1', selectedAnswer: 0, correct: true },
    ];

    vi.mocked(db.progressLogs.add).mockRejectedValue(new Error('DB error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      saveQuizResults('plan-1', 'day-1', attempts, 5, 20)
    ).rejects.toThrow('DB error');

    consoleSpy.mockRestore();
  });
});
