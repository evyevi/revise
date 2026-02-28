import { describe, it, expect } from 'vitest';
import {
  shouldResetStreak,
  isStreakActive,
  updateStreak,
} from '../streakService';

describe('streakService', () => {
  // Helper to create a date with time normalized to midnight
  const createDate = (daysAgo: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  describe('shouldResetStreak', () => {
    it('returns false if studied yesterday', () => {
      const yesterday = createDate(1);
      expect(shouldResetStreak(yesterday)).toBe(false);
    });

    it('returns false if studied today', () => {
      const today = createDate(0);
      expect(shouldResetStreak(today)).toBe(false);
    });

    it('returns false for grace period (2 days ago)', () => {
      const twoDaysAgo = createDate(2);
      expect(shouldResetStreak(twoDaysAgo)).toBe(false);
    });

    it('returns true when gap expired (3+ days ago)', () => {
      const threeDaysAgo = createDate(3);
      expect(shouldResetStreak(threeDaysAgo)).toBe(true);
    });

    it('returns true if no lastStudyDate', () => {
      expect(shouldResetStreak(undefined)).toBe(true);
    });
  });

  describe('isStreakActive', () => {
    it('returns true if studied yesterday', () => {
      const yesterday = createDate(1);
      expect(isStreakActive(yesterday)).toBe(true);
    });

    it('returns true if studied today', () => {
      const today = createDate(0);
      expect(isStreakActive(today)).toBe(true);
    });

    it('returns false if not studied recently (7+ days)', () => {
      const sevenDaysAgo = createDate(7);
      expect(isStreakActive(sevenDaysAgo)).toBe(false);
    });

    it('returns false if no lastStudyDate', () => {
      expect(isStreakActive(undefined)).toBe(false);
    });
  });

  describe('updateStreak', () => {
    it('increments streak if studied yesterday', () => {
      const yesterday = createDate(1);
      const result = updateStreak(5, yesterday);
      expect(result.currentStreak).toBe(6);
      expect(result.shouldIncrease).toBe(true);
    });

    it('maintains streak if 2 days ago (grace period)', () => {
      const twoDaysAgo = createDate(2);
      const result = updateStreak(5, twoDaysAgo);
      expect(result.currentStreak).toBe(5);
      expect(result.shouldIncrease).toBe(false);
    });

    it('resets streak if gap too long (7+ days)', () => {
      const sevenDaysAgo = createDate(7);
      const result = updateStreak(10, sevenDaysAgo);
      expect(result.currentStreak).toBe(1);
      expect(result.shouldIncrease).toBe(true);
    });

    it('starts new streak if no previous activity', () => {
      const result = updateStreak(0, undefined);
      expect(result.currentStreak).toBe(1);
      expect(result.shouldIncrease).toBe(true);
    });

    it('updates longest streak when exceeded', () => {
      const yesterday = createDate(1);
      const result = updateStreak(5, yesterday, 5);
      expect(result.currentStreak).toBe(6);
      expect(result.longestStreak).toBe(6);
    });

    it('preserves longest streak when not exceeded', () => {
      const yesterday = createDate(1);
      const result = updateStreak(5, yesterday, 10);
      expect(result.currentStreak).toBe(6);
      expect(result.longestStreak).toBe(10);
    });

    it('handles same-day repeated study (no increase)', () => {
      const today = createDate(0);
      const result = updateStreak(5, today);
      expect(result.currentStreak).toBe(5);
      expect(result.shouldIncrease).toBe(false);
    });

    it('defaults longestStreak to currentStreak when not provided', () => {
      const yesterday = createDate(1);
      const result = updateStreak(3, yesterday);
      expect(result.longestStreak).toBe(4);
    });

    it('resets streak and updates longest streak appropriately', () => {
      const sevenDaysAgo = createDate(7);
      const result = updateStreak(15, sevenDaysAgo, 20);
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(20);
      expect(result.shouldIncrease).toBe(true);
    });

    it('handles zero streak value', () => {
      const yesterday = createDate(1);
      const result = updateStreak(0, yesterday);
      expect(result.currentStreak).toBe(1);
      expect(result.shouldIncrease).toBe(true);
    });

    it('throws error for negative streak value', () => {
      const yesterday = createDate(1);
      expect(() => updateStreak(-1, yesterday)).toThrow('currentStreak cannot be negative');
    });

    it('throws error for non-finite streak value (NaN)', () => {
      const yesterday = createDate(1);
      expect(() => updateStreak(NaN, yesterday)).toThrow('currentStreak must be a finite number');
    });

    it('throws error for non-finite streak value (Infinity)', () => {
      const yesterday = createDate(1);
      expect(() => updateStreak(Infinity, yesterday)).toThrow('currentStreak must be a finite number');
    });

    it('throws error when longestStreak < currentStreak', () => {
      const yesterday = createDate(1);
      expect(() => updateStreak(10, yesterday, 5)).toThrow('longestStreak cannot be less than currentStreak');
    });

    it('handles large streak values near max safe integer', () => {
      const yesterday = createDate(1);
      const largeStreak = Number.MAX_SAFE_INTEGER - 1;
      const result = updateStreak(largeStreak, yesterday);
      expect(result.currentStreak).toBe(largeStreak + 1);
      expect(result.shouldIncrease).toBe(true);
    });

    it('handles Invalid Date object', () => {
      const invalidDate = new Date('invalid');
      const result = updateStreak(5, invalidDate);
      expect(result.currentStreak).toBe(1);
      expect(result.shouldIncrease).toBe(true);
    });

    it('handles future date (should treat as invalid)', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const result = updateStreak(5, futureDate);
      expect(result.currentStreak).toBe(1);
      expect(result.shouldIncrease).toBe(true);
    });

    it('correctly handles exact 3-day boundary (reset threshold)', () => {
      const threeDaysAgo = createDate(3);
      const result = updateStreak(5, threeDaysAgo);
      expect(result.currentStreak).toBe(1);
      expect(result.shouldIncrease).toBe(true);
    });
  });

  describe('edge cases - Invalid Dates and future dates', () => {
    it('shouldResetStreak returns true for Invalid Date', () => {
      const invalidDate = new Date('invalid');
      expect(shouldResetStreak(invalidDate)).toBe(true);
    });

    it('shouldResetStreak returns true for future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      expect(shouldResetStreak(futureDate)).toBe(true);
    });

    it('isStreakActive returns false for Invalid Date', () => {
      const invalidDate = new Date('invalid');
      expect(isStreakActive(invalidDate)).toBe(false);
    });

    it('isStreakActive returns false for future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(isStreakActive(futureDate)).toBe(false);
    });
  });
});
