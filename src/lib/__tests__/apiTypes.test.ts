import { describe, it, expect } from 'vitest';
import type { PlanResponse } from '../api';

describe('PlanResponse', () => {
  it('includes recommendedMinutesPerDay as number', () => {
    // Type-level assertion: this compiles only if PlanResponse has recommendedMinutesPerDay: number
    const response: PlanResponse = {
      topics: [],
      schedule: [],
      flashcards: [],
      quizQuestions: [],
      recommendedMinutesPerDay: 30,
    };
    expect(typeof response.recommendedMinutesPerDay).toBe('number');
  });
});
