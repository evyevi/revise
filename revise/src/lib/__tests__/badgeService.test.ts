import { describe, it, expect } from 'vitest';
import {
  getAllBadges,
  getBadgeMetadata,
  checkBadgeUnlock,
  type BadgeType,
  type BadgeUnlockContext,
} from '../badgeService';

describe('badgeService', () => {
  describe('getAllBadges', () => {
    it('returns 7 badges', () => {
      const badges = getAllBadges();
      expect(badges).toHaveLength(7);
    });

    it('includes all badge IDs', () => {
      const badges = getAllBadges();
      const badgeIds = badges.map(b => b.id);
      
      expect(badgeIds).toContain('first-step');
      expect(badgeIds).toContain('dedicated-student');
      expect(badgeIds).toContain('on-fire');
      expect(badgeIds).toContain('unstoppable');
      expect(badgeIds).toContain('quiz-champion');
      expect(badgeIds).toContain('flashcard-master');
      expect(badgeIds).toContain('test-ready');
    });
  });

  describe('getBadgeMetadata', () => {
    it('returns correct metadata for a badge', () => {
      const badge = getBadgeMetadata('first-step');
      
      expect(badge).toBeDefined();
      expect(badge?.id).toBe('first-step');
      expect(badge?.name).toBe('First Step');
      expect(badge?.description).toBe('Complete your first study session');
      expect(badge?.icon).toBe('🎯');
      expect(badge?.condition).toBeTruthy();
    });

    it('returns undefined for unknown badge', () => {
      const badge = getBadgeMetadata('non-existent' as BadgeType);
      expect(badge).toBeUndefined();
    });
  });

  describe('checkBadgeUnlock', () => {
    const emptyContext: BadgeUnlockContext = {
      sessionCount: 0,
      currentStreak: 0,
      quizScoresInSession: [],
      totalFlashcardsCompleted: 0,
      studyPlansCompleted: 0,
    };

    it('unlocks first-step badge when sessionCount >= 1', () => {
      const context: BadgeUnlockContext = {
        ...emptyContext,
        sessionCount: 1,
      };
      
      const badges = checkBadgeUnlock([], context);
      expect(badges).toContain('first-step');
    });

    it('unlocks dedicated-student badge when currentStreak >= 3', () => {
      const context: BadgeUnlockContext = {
        ...emptyContext,
        currentStreak: 3,
      };
      
      const badges = checkBadgeUnlock([], context);
      expect(badges).toContain('dedicated-student');
    });

    it('unlocks on-fire badge when currentStreak >= 5', () => {
      const context: BadgeUnlockContext = {
        ...emptyContext,
        currentStreak: 5,
      };
      
      const badges = checkBadgeUnlock([], context);
      expect(badges).toContain('on-fire');
    });

    it('unlocks unstoppable badge when currentStreak >= 7', () => {
      const context: BadgeUnlockContext = {
        ...emptyContext,
        currentStreak: 7,
      };
      
      const badges = checkBadgeUnlock([], context);
      expect(badges).toContain('unstoppable');
    });

    it('unlocks quiz-champion badge when any quiz score === 100', () => {
      const context: BadgeUnlockContext = {
        ...emptyContext,
        quizScoresInSession: [80, 100, 90],
      };
      
      const badges = checkBadgeUnlock([], context);
      expect(badges).toContain('quiz-champion');
    });

    it('unlocks flashcard-master badge when totalFlashcardsCompleted >= 50', () => {
      const context: BadgeUnlockContext = {
        ...emptyContext,
        totalFlashcardsCompleted: 50,
      };
      
      const badges = checkBadgeUnlock([], context);
      expect(badges).toContain('flashcard-master');
    });

    it('unlocks test-ready badge when studyPlansCompleted >= 1', () => {
      const context: BadgeUnlockContext = {
        ...emptyContext,
        studyPlansCompleted: 1,
      };
      
      const badges = checkBadgeUnlock([], context);
      expect(badges).toContain('test-ready');
    });

    it('does not re-unlock existing badges', () => {
      const context: BadgeUnlockContext = {
        ...emptyContext,
        sessionCount: 1,
      };
      
      const currentBadges: BadgeType[] = ['first-step'];
      const badges = checkBadgeUnlock(currentBadges, context);
      
      // Should still contain first-step
      expect(badges).toContain('first-step');
      // But only once
      expect(badges.filter(b => b === 'first-step')).toHaveLength(1);
      // Total length should be 1
      expect(badges).toHaveLength(1);
    });

    it('can unlock multiple badges at once', () => {
      const context: BadgeUnlockContext = {
        sessionCount: 10,
        currentStreak: 7,
        quizScoresInSession: [100],
        totalFlashcardsCompleted: 50,
        studyPlansCompleted: 2,
      };
      
      const badges = checkBadgeUnlock([], context);
      
      // Should unlock multiple badges
      expect(badges).toContain('first-step');
      expect(badges).toContain('dedicated-student');
      expect(badges).toContain('on-fire');
      expect(badges).toContain('unstoppable');
      expect(badges).toContain('quiz-champion');
      expect(badges).toContain('flashcard-master');
      expect(badges).toContain('test-ready');
      expect(badges).toHaveLength(7);
    });

    it('returns empty array when no conditions are met', () => {
      const badges = checkBadgeUnlock([], emptyContext);
      expect(badges).toEqual([]);
    });

    it('validates input types and handles edge cases', () => {
      const context: BadgeUnlockContext = {
        sessionCount: 0,
        currentStreak: 0,
        quizScoresInSession: [],
        totalFlashcardsCompleted: 0,
        studyPlansCompleted: 0,
      };
      
      // Should not crash with empty arrays
      const badges = checkBadgeUnlock([], context);
      expect(Array.isArray(badges)).toBe(true);
      
      // Should handle negative values safely (no unlocks)
      const negativeContext: BadgeUnlockContext = {
        sessionCount: -1,
        currentStreak: -5,
        quizScoresInSession: [-10],
        totalFlashcardsCompleted: -50,
        studyPlansCompleted: -1,
      };
      
      const negativeBadges = checkBadgeUnlock([], negativeContext);
      expect(negativeBadges).toEqual([]);
    });
  });
});
