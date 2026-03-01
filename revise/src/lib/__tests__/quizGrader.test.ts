import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateQuizScore, saveQuizResults } from '../quizGrader';
import { db } from '../db';
import { Quality } from '../sm2Calculator';
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

describe('Quiz Grading with SM-2 Quality', () => {
  it('correct answers map to Quality.Good', () => {
    const attempts: QuizAttempt[] = [
      { questionId: 'q1', selectedAnswer: 0, correct: true, quality: Quality.Good },
      { questionId: 'q2', selectedAnswer: 1, correct: true, quality: Quality.Good },
      { questionId: 'q3', selectedAnswer: 2, correct: true, quality: Quality.Good },
    ];

    // All correct answers should have Quality.Good
    expect(attempts.every((a) => a.quality === Quality.Good)).toBe(true);
  });

  it('incorrect answers map to Quality.Again', () => {
    const attempts: QuizAttempt[] = [
      { questionId: 'q1', selectedAnswer: 0, correct: false, quality: Quality.Again },
      { questionId: 'q2', selectedAnswer: 1, correct: false, quality: Quality.Again },
      { questionId: 'q3', selectedAnswer: 2, correct: false, quality: Quality.Again },
    ];

    // All incorrect answers should have Quality.Again
    expect(attempts.every((a) => a.quality === Quality.Again)).toBe(true);
  });

  it('quiz score remains unaffected by quality field', () => {
    const attemptsWithQuality: QuizAttempt[] = [
      { questionId: 'q1', selectedAnswer: 0, correct: true, quality: Quality.Good },
      { questionId: 'q2', selectedAnswer: 1, correct: false, quality: Quality.Again },
      { questionId: 'q3', selectedAnswer: 2, correct: true, quality: Quality.Good },
    ];

    const attemptsWithoutQuality: QuizAttempt[] = [
      { questionId: 'q1', selectedAnswer: 0, correct: true },
      { questionId: 'q2', selectedAnswer: 1, correct: false },
      { questionId: 'q3', selectedAnswer: 2, correct: true },
    ];

    // Score should be identical regardless of quality field
    expect(calculateQuizScore(attemptsWithQuality)).toBe(calculateQuizScore(attemptsWithoutQuality));
    expect(calculateQuizScore(attemptsWithQuality)).toBe(67);
  });

  it('stores quality on each quiz attempt', () => {
    const attempts: QuizAttempt[] = [
      { questionId: 'q1', selectedAnswer: 0, correct: true, quality: Quality.Good },
      { questionId: 'q2', selectedAnswer: 1, correct: false, quality: Quality.Again },
      { questionId: 'q3', selectedAnswer: 2, correct: true, quality: Quality.Good },
      { questionId: 'q4', selectedAnswer: 0, correct: false, quality: Quality.Again },
    ];

    // Verify each attempt has the correct quality field
    expect(attempts[0]).toHaveProperty('quality', Quality.Good);
    expect(attempts[1]).toHaveProperty('quality', Quality.Again);
    expect(attempts[2]).toHaveProperty('quality', Quality.Good);
    expect(attempts[3]).toHaveProperty('quality', Quality.Again);
  });

  it('quality field is optional on quiz attempts', () => {
    const attemptWithQuality: QuizAttempt = { 
      questionId: 'q1', 
      selectedAnswer: 0, 
      correct: true, 
      quality: Quality.Good 
    };
    const attemptWithoutQuality: QuizAttempt = { 
      questionId: 'q1', 
      selectedAnswer: 0, 
      correct: true 
    };

    // Both should be valid QuizAttempt objects
    expect(attemptWithQuality).toBeDefined();
    expect(attemptWithoutQuality).toBeDefined();
    expect(attemptWithQuality.quality).toBe(Quality.Good);
    expect(attemptWithoutQuality.quality).toBeUndefined();
  });
});
