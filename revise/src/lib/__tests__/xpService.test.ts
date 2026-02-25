import { describe, it, expect } from 'vitest';
import {
  calculateSessionXP,
  calculateQuizAnswerXP,
  calculateFlashcardXP,
  calculatePerfectQuizBonus,
  calculateStreakBonus,
  calculateTotalSessionXP,
  type SessionXPContext,
} from '../xpService';

describe('XP Service', () => {
  describe('calculateSessionXP', () => {
    it('should return 50 XP for completing a study session', () => {
      expect(calculateSessionXP()).toBe(50);
    });
  });

  describe('calculateQuizAnswerXP', () => {
    it('should return 10 XP per correct answer', () => {
      expect(calculateQuizAnswerXP(5)).toBe(50);
    });

    it('should return 0 XP for no correct answers', () => {
      expect(calculateQuizAnswerXP(0)).toBe(0);
    });

    it('should throw Error for negative correctCount', () => {
      expect(() => calculateQuizAnswerXP(-1)).toThrow(
        'Invalid correctCount: -1. Must be between 0 and 999.'
      );
    });

    it('should throw Error for correctCount > 999', () => {
      expect(() => calculateQuizAnswerXP(1000)).toThrow(
        'Invalid correctCount: 1000. Must be between 0 and 999.'
      );
    });
  });

  describe('calculateFlashcardXP', () => {
    it('should return 15 XP for completing flashcard deck', () => {
      expect(calculateFlashcardXP()).toBe(15);
    });
  });

  describe('calculatePerfectQuizBonus', () => {
    it('should return 30 XP if perfect quiz', () => {
      expect(calculatePerfectQuizBonus(true)).toBe(30);
    });

    it('should return 0 XP if not a perfect quiz', () => {
      expect(calculatePerfectQuizBonus(false)).toBe(0);
    });
  });

  describe('calculateStreakBonus', () => {
    it('should return 0 XP for non-milestone streak (less than 3 days)', () => {
      expect(calculateStreakBonus(2)).toBe(0);
    });

    it('should return 20 XP for first milestone (3-5 days)', () => {
      expect(calculateStreakBonus(3)).toBe(20);
    });

    it('should return 40 XP for multiple milestones (6 days)', () => {
      expect(calculateStreakBonus(6)).toBe(40);
    });

    it('should handle higher milestones (9+ days)', () => {
      expect(calculateStreakBonus(9)).toBe(60);
    });

    it('should throw Error for negative streak', () => {
      expect(() => calculateStreakBonus(-1)).toThrow(
        'Invalid streak: -1. Must be greater than or equal to 0.'
      );
    });
  });

  describe('calculateTotalSessionXP', () => {
    it('should sum all components when all conditions are met', () => {
      const context: SessionXPContext = {
        baseSession: true,
        correctAnswers: 5,
        carddeckCompleted: true,
        perfectQuiz: true,
        currentStreak: 6,
      };
      // 50 (session) + 50 (5 * 10) + 15 (flashcard) + 30 (perfect) + 40 (2 * 20) = 185
      expect(calculateTotalSessionXP(context)).toBe(185);
    });

    it('should handle partial completion', () => {
      const context: SessionXPContext = {
        baseSession: true,
        correctAnswers: 3,
        carddeckCompleted: false,
        perfectQuiz: false,
        currentStreak: 2,
      };
      // 50 (session) + 30 (3 * 10) + 0 (no flashcard) + 0 (no perfect) + 0 (streak < 3) = 80
      expect(calculateTotalSessionXP(context)).toBe(80);
    });
  });
});
