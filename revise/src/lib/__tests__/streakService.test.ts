import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  shouldResetStreak,
  isStreakActive,
  updateStreak,
  GRACE_PERIOD_DAYS,
  RESET_THRESHOLD_DAYS,
  type StreakUpdate,
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
  });
});
