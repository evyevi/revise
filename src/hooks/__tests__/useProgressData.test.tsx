import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProgressData } from '../useProgressData';
import { db } from '../../lib/db';
import type { StudyPlan, UserStats, ProgressLog, StudyDay } from '../../types';

describe('useProgressData', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('returns loading true initially', () => {
    const { result } = renderHook(() => useProgressData());
    expect(result.current.isLoading).toBe(true);
  });

  it('loads user stats', async () => {
    const stats: UserStats = {
      id: 'default',
      totalXP: 200,
      currentStreak: 3,
      longestStreak: 5,
      badges: ['first-step'],
    };
    await db.userStats.add(stats);

    const { result } = renderHook(() => useProgressData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats?.totalXP).toBe(200);
    expect(result.current.stats?.currentStreak).toBe(3);
  });

  it('loads plan progress data', async () => {
    const plan: StudyPlan = {
      id: 'plan-1',
      subject: 'Math',
      testDate: new Date('2026-03-15'),
      createdDate: new Date('2026-02-01'),
      totalDays: 2,
      suggestedMinutesPerDay: 30,
      topics: [{ id: 't1', name: 'Algebra', importance: 'high', keyPoints: ['x'] }],
    };
    await db.studyPlans.add(plan);

    const day1: StudyDay = {
      id: 'd1', planId: 'plan-1', dayNumber: 1, date: new Date('2026-02-10'),
      completed: true, newTopicIds: [], reviewTopicIds: [],
      flashcardIds: [], quizIds: [], estimatedMinutes: 30,
    };
    const day2: StudyDay = {
      id: 'd2', planId: 'plan-1', dayNumber: 2, date: new Date('2026-02-11'),
      completed: false, newTopicIds: [], reviewTopicIds: [],
      flashcardIds: [], quizIds: [], estimatedMinutes: 30,
    };
    await db.studyDays.bulkAdd([day1, day2]);

    const { result } = renderHook(() => useProgressData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.planProgress).toHaveLength(1);
    expect(result.current.planProgress[0].subject).toBe('Math');
    expect(result.current.planProgress[0].percentage).toBe(50);
  });

  it('loads progress logs for activity calendar', async () => {
    const log: ProgressLog = {
      id: 'log-1', planId: 'plan-1', dayId: 'd1',
      completedAt: new Date('2026-02-20'), xpEarned: 75,
      quizScore: 80, flashcardsReviewed: 5,
    };
    await db.progressLogs.add(log);

    const { result } = renderHook(() => useProgressData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.studyActivity.size).toBeGreaterThan(0);
  });

  it('handles empty database gracefully', async () => {
    const { result } = renderHook(() => useProgressData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.planProgress).toHaveLength(0);
    expect(result.current.studyActivity.size).toBe(0);
    expect(result.current.quizScores).toHaveLength(0);
  });
});
