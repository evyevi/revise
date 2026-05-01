import { describe, it, expect } from 'vitest';
import { enforceScheduleConstraints } from '../generate-plan';

const basePlan = {
  topics: [
    { id: 't1', name: 'Topic 1', importance: 'high' as const, keyPoints: [], estimatedMinutes: 30 },
    { id: 't2', name: 'Topic 2', importance: 'medium' as const, keyPoints: [], estimatedMinutes: 20 },
    { id: 't3', name: 'Topic 3', importance: 'low' as const, keyPoints: [], estimatedMinutes: 15 },
  ],
  flashcards: [],
  quizQuestions: [],
  recommendedMinutesPerDay: 30,
};

describe('enforceScheduleConstraints', () => {
  it('removes schedule entries beyond daysAvailable', () => {
    const plan = {
      ...basePlan,
      schedule: [
        { dayNumber: 1, newTopicIds: ['t1'], reviewTopicIds: [], estimatedMinutes: 30 },
        { dayNumber: 2, newTopicIds: ['t2'], reviewTopicIds: ['t1'], estimatedMinutes: 30 },
        { dayNumber: 3, newTopicIds: ['t3'], reviewTopicIds: ['t2'], estimatedMinutes: 30 },
        // AI incorrectly scheduled day 4 — the test day
        { dayNumber: 4, newTopicIds: [], reviewTopicIds: ['t1', 't2', 't3'], estimatedMinutes: 30 },
      ],
    };

    const result = enforceScheduleConstraints(plan, 3);

    expect(result.schedule).toHaveLength(3);
    expect(result.schedule.map(d => d.dayNumber)).toEqual([1, 2, 3]);
  });

  it('makes the last study day a full review with no new topics', () => {
    const plan = {
      ...basePlan,
      schedule: [
        { dayNumber: 1, newTopicIds: ['t1'], reviewTopicIds: [], estimatedMinutes: 30 },
        { dayNumber: 2, newTopicIds: ['t2'], reviewTopicIds: ['t1'], estimatedMinutes: 30 },
        // Last day has new topics — should be corrected
        { dayNumber: 3, newTopicIds: ['t3'], reviewTopicIds: ['t1', 't2'], estimatedMinutes: 30 },
      ],
    };

    const result = enforceScheduleConstraints(plan, 3);
    const lastDay = result.schedule.find(d => d.dayNumber === 3)!;

    expect(lastDay.newTopicIds).toEqual([]);
    expect(lastDay.reviewTopicIds).toEqual(['t1', 't2', 't3']);
  });

  it('last day reviews all topics even when AI only listed some', () => {
    const plan = {
      ...basePlan,
      schedule: [
        { dayNumber: 1, newTopicIds: ['t1', 't2', 't3'], reviewTopicIds: [], estimatedMinutes: 60 },
        { dayNumber: 2, newTopicIds: [], reviewTopicIds: ['t1'], estimatedMinutes: 20 }, // AI missed t2/t3
      ],
    };

    const result = enforceScheduleConstraints(plan, 2);
    const lastDay = result.schedule.find(d => d.dayNumber === 2)!;

    expect(lastDay.newTopicIds).toEqual([]);
    expect(lastDay.reviewTopicIds).toEqual(['t1', 't2', 't3']);
  });

  it('does not modify earlier days', () => {
    const plan = {
      ...basePlan,
      schedule: [
        { dayNumber: 1, newTopicIds: ['t1'], reviewTopicIds: [], estimatedMinutes: 30 },
        { dayNumber: 2, newTopicIds: ['t2'], reviewTopicIds: ['t1'], estimatedMinutes: 30 },
        { dayNumber: 3, newTopicIds: [], reviewTopicIds: ['t1', 't2', 't3'], estimatedMinutes: 30 },
      ],
    };

    const result = enforceScheduleConstraints(plan, 3);
    const day1 = result.schedule.find(d => d.dayNumber === 1)!;
    const day2 = result.schedule.find(d => d.dayNumber === 2)!;

    expect(day1.newTopicIds).toEqual(['t1']);
    expect(day1.reviewTopicIds).toEqual([]);
    expect(day2.newTopicIds).toEqual(['t2']);
    expect(day2.reviewTopicIds).toEqual(['t1']);
  });

  it('handles an empty schedule gracefully', () => {
    const plan = { ...basePlan, schedule: [] };
    const result = enforceScheduleConstraints(plan, 5);
    expect(result.schedule).toEqual([]);
  });

  it('does not mutate the original plan', () => {
    const plan = {
      ...basePlan,
      schedule: [
        { dayNumber: 1, newTopicIds: ['t1'], reviewTopicIds: [], estimatedMinutes: 30 },
        { dayNumber: 2, newTopicIds: ['t2'], reviewTopicIds: ['t1'], estimatedMinutes: 30 },
      ],
    };
    const originalLastDayTopics = [...plan.schedule[1].newTopicIds];

    enforceScheduleConstraints(plan, 2);

    // Original object should be unmodified
    expect(plan.schedule[1].newTopicIds).toEqual(originalLastDayTopics);
  });
});
