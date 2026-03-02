import { describe, it, expect } from 'vitest';
import type { ProgressLog, StudyDay, Topic, Flashcard, MasteryLevel } from '../../types';
import {
  getStudyActivity,
  getPlanProgress,
  getTopicMasteryData,
  getRecentQuizScores,
} from '../progressService';

// ── Factory helpers ──────────────────────────────────────────────────

function makeProgressLog(overrides: Partial<ProgressLog> = {}): ProgressLog {
  return {
    id: 'log-1',
    planId: 'plan-1',
    dayId: 'day-1',
    completedAt: new Date('2026-02-20T10:00:00Z'),
    xpEarned: 50,
    quizScore: 80,
    flashcardsReviewed: 5,
    ...overrides,
  };
}

function makeStudyDay(overrides: Partial<StudyDay> = {}): StudyDay {
  return {
    id: 'day-1',
    planId: 'plan-1',
    dayNumber: 1,
    date: new Date('2026-02-20'),
    completed: false,
    newTopicIds: [],
    reviewTopicIds: [],
    estimatedMinutes: 30,
    ...overrides,
  };
}

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: 'topic-1',
    name: 'Algebra',
    importance: 'high',
    keyPoints: ['equations', 'variables'],
    ...overrides,
  };
}

function makeFlashcard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'fc-1',
    topicId: 'topic-1',
    front: 'What is x?',
    back: 'A variable',
    reviewDates: [],
    masteryLevel: 3 as MasteryLevel,
    ...overrides,
  };
}

// ── getStudyActivity ─────────────────────────────────────────────────

describe('getStudyActivity', () => {
  it('returns an empty map for empty logs', () => {
    const result = getStudyActivity([]);
    expect(result.size).toBe(0);
  });

  it('groups multiple logs on the same day with summed XP and session count', () => {
    const logs: ProgressLog[] = [
      makeProgressLog({ id: 'l1', completedAt: new Date('2026-02-20T08:00:00Z'), xpEarned: 30 }),
      makeProgressLog({ id: 'l2', completedAt: new Date('2026-02-20T14:00:00Z'), xpEarned: 20 }),
      makeProgressLog({ id: 'l3', completedAt: new Date('2026-02-21T10:00:00Z'), xpEarned: 50 }),
    ];

    const result = getStudyActivity(logs);

    expect(result.size).toBe(2);

    const feb20 = result.get('2026-02-20');
    expect(feb20).toEqual({ sessions: 2, xpEarned: 50 });

    const feb21 = result.get('2026-02-21');
    expect(feb21).toEqual({ sessions: 1, xpEarned: 50 });
  });
});

// ── getPlanProgress ──────────────────────────────────────────────────

describe('getPlanProgress', () => {
  it('returns zeros for empty days', () => {
    expect(getPlanProgress([])).toEqual({ completed: 0, total: 0, percentage: 0 });
  });

  it('calculates correct percentage for mixed completion', () => {
    const days: StudyDay[] = [
      makeStudyDay({ id: 'd1', completed: true }),
      makeStudyDay({ id: 'd2', completed: false }),
      makeStudyDay({ id: 'd3', completed: true }),
      makeStudyDay({ id: 'd4', completed: false }),
    ];

    expect(getPlanProgress(days)).toEqual({ completed: 2, total: 4, percentage: 50 });
  });

  it('returns 100% when all days are completed', () => {
    const days: StudyDay[] = [
      makeStudyDay({ id: 'd1', completed: true }),
      makeStudyDay({ id: 'd2', completed: true }),
    ];

    expect(getPlanProgress(days)).toEqual({ completed: 2, total: 2, percentage: 100 });
  });
});

// ── getTopicMasteryData ──────────────────────────────────────────────

describe('getTopicMasteryData', () => {
  it('returns empty array for empty inputs', () => {
    expect(getTopicMasteryData([], [])).toEqual([]);
  });

  it('calculates average mastery per topic from flashcards', () => {
    const topics: Topic[] = [
      makeTopic({ id: 't1', name: 'Algebra' }),
      makeTopic({ id: 't2', name: 'Geometry' }),
    ];
    const flashcards: Flashcard[] = [
      makeFlashcard({ id: 'f1', topicId: 't1', masteryLevel: 2 }),
      makeFlashcard({ id: 'f2', topicId: 't1', masteryLevel: 4 }),
      makeFlashcard({ id: 'f3', topicId: 't2', masteryLevel: 5 }),
    ];

    const result = getTopicMasteryData(topics, flashcards);

    expect(result).toEqual([
      { topicId: 't1', topicName: 'Algebra', averageMastery: 3, cardCount: 2 },
      { topicId: 't2', topicName: 'Geometry', averageMastery: 5, cardCount: 1 },
    ]);
  });

  it('returns 0 mastery for a topic with no flashcards', () => {
    const topics: Topic[] = [makeTopic({ id: 't1', name: 'Algebra' })];

    const result = getTopicMasteryData(topics, []);

    expect(result).toEqual([
      { topicId: 't1', topicName: 'Algebra', averageMastery: 0, cardCount: 0 },
    ]);
  });
});

// ── getRecentQuizScores ──────────────────────────────────────────────

describe('getRecentQuizScores', () => {
  it('returns empty array for empty logs', () => {
    expect(getRecentQuizScores([], 5)).toEqual([]);
  });

  it('returns most recent N scores sorted oldest→newest', () => {
    const logs: ProgressLog[] = [
      makeProgressLog({ id: 'l1', completedAt: new Date('2026-02-18T10:00:00Z'), quizScore: 70 }),
      makeProgressLog({ id: 'l2', completedAt: new Date('2026-02-20T10:00:00Z'), quizScore: 90 }),
      makeProgressLog({ id: 'l3', completedAt: new Date('2026-02-19T10:00:00Z'), quizScore: 80 }),
      makeProgressLog({ id: 'l4', completedAt: new Date('2026-02-21T10:00:00Z'), quizScore: 95 }),
    ];

    const result = getRecentQuizScores(logs, 3);

    expect(result).toEqual([
      { date: '2026-02-19', score: 80 },
      { date: '2026-02-20', score: 90 },
      { date: '2026-02-21', score: 95 },
    ]);
  });

  it('returns all scores if fewer than limit', () => {
    const logs: ProgressLog[] = [
      makeProgressLog({ id: 'l1', completedAt: new Date('2026-02-20T10:00:00Z'), quizScore: 85 }),
    ];

    const result = getRecentQuizScores(logs, 5);

    expect(result).toEqual([{ date: '2026-02-20', score: 85 }]);
  });
});
