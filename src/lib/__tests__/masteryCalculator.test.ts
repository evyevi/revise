import { describe, it, expect } from 'vitest';
import { updateMastery } from '../masteryCalculator';
import type { MasteryLevel } from '../../types';

describe('updateMastery', () => {
  it('increases mastery level by 1 on correct answer', () => {
    expect(updateMastery(0, true)).toBe(1);
    expect(updateMastery(2, true)).toBe(3);
    expect(updateMastery(4, true)).toBe(5);
  });

  it('decreases mastery level by 1 on incorrect answer', () => {
    expect(updateMastery(5, false)).toBe(4);
    expect(updateMastery(3, false)).toBe(2);
    expect(updateMastery(1, false)).toBe(0);
  });

  it('clamps mastery level to maximum of 5', () => {
    expect(updateMastery(5, true)).toBe(5);
  });

  it('clamps mastery level to minimum of 0', () => {
    expect(updateMastery(0, false)).toBe(0);
  });

  it('handles all mastery levels correctly', () => {
    // Test all levels
    for (let level = 0; level <= 5; level++) {
      const increased = updateMastery(level as MasteryLevel, true);
      const decreased = updateMastery(level as MasteryLevel, false);
      
      expect(increased).toBeGreaterThanOrEqual(0);
      expect(increased).toBeLessThanOrEqual(5);
      expect(decreased).toBeGreaterThanOrEqual(0);
      expect(decreased).toBeLessThanOrEqual(5);
    }
  });
});
