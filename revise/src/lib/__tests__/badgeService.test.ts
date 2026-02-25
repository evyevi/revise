import { describe, it, expect } from 'vitest';
import {
  getAllBadges,
  getBadgeMetadata,
  checkBadgeUnlock,
  type Badge,
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
      const badgeIds = badges.map((b: Badge) => b.id);
      
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
      expect(badges.filter((b: BadgeType) => b === 'first-step')).toHaveLength(1);
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

    describe('edge case validation', () => {
      it('handles NaN values in context gracefully', () => {
        const context: BadgeUnlockContext = {
          sessionCount: NaN,
          currentStreak: NaN,
          quizScoresInSession: [NaN, 100, NaN],
          totalFlashcardsCompleted: NaN,
          studyPlansCompleted: NaN,
        };

        const badges = checkBadgeUnlock([], context);
        
        // Should only unlock quiz-champion (100 is valid)
        expect(badges).toEqual(['quiz-champion']);
      });

      it('handles Infinity values in context', () => {
        const context: BadgeUnlockContext = {
          sessionCount: Infinity,
          currentStreak: Infinity,
          quizScoresInSession: [Infinity, -Infinity],
          totalFlashcardsCompleted: Infinity,
          studyPlansCompleted: Infinity,
        };

        const badges = checkBadgeUnlock([], context);
        
        // Infinity should be sanitized to 0, no badges unlocked
        expect(badges).toEqual([]);
      });

      it('handles negative numbers in all fields', () => {
        const context: BadgeUnlockContext = {
          sessionCount: -10,
          currentStreak: -100,
          quizScoresInSession: [-5, -100, -999],
          totalFlashcardsCompleted: -50,
          studyPlansCompleted: -3,
        };

        const badges = checkBadgeUnlock([], context);
        
        // All negatives should be treated as 0, no badges unlocked
        expect(badges).toEqual([]);
      });

      it('handles float quiz scores with rounding', () => {
        const context: BadgeUnlockContext = {
          sessionCount: 1,
          currentStreak: 0,
          quizScoresInSession: [99.5, 85.3, 72.8],
          totalFlashcardsCompleted: 0,
          studyPlansCompleted: 0,
        };

        const badges = checkBadgeUnlock([], context);
        
        // 99.5 rounds to 100, should unlock quiz-champion
        expect(badges).toContain('quiz-champion');
        expect(badges).toContain('first-step');
      });

      it('handles float scores very close to 100', () => {
        const context: BadgeUnlockContext = {
          sessionCount: 0,
          currentStreak: 0,
          quizScoresInSession: [99.9999, 99.8, 100.1],
          totalFlashcardsCompleted: 0,
          studyPlansCompleted: 0,
        };

        const badges = checkBadgeUnlock([], context);
        
        // 99.9999 and 100.1 both round to 100
        expect(badges).toContain('quiz-champion');
      });

      it('filters out invalid quiz scores outside 0-100 range', () => {
        const context: BadgeUnlockContext = {
          sessionCount: 0,
          currentStreak: 0,
          quizScoresInSession: [150, 200, -50, 100.4, 99.6],
          totalFlashcardsCompleted: 0,
          studyPlansCompleted: 0,
        };

        const badges = checkBadgeUnlock([], context);
        
        // 150, 200, -50 filtered out; 100.4 filtered; 99.6 rounds to 100
        expect(badges).toContain('quiz-champion');
      });

      it('handles empty quiz scores array gracefully', () => {
        const context: BadgeUnlockContext = {
          sessionCount: 1,
          currentStreak: 0,
          quizScoresInSession: [],
          totalFlashcardsCompleted: 0,
          studyPlansCompleted: 0,
        };

        const badges = checkBadgeUnlock([], context);
        
        // Should unlock first-step but not quiz-champion
        expect(badges).toContain('first-step');
        expect(badges).not.toContain('quiz-champion');
        expect(badges).toHaveLength(1);
      });

      it('handles mixed valid and invalid data in context', () => {
        const context: BadgeUnlockContext = {
          sessionCount: 5, // valid
          currentStreak: NaN, // invalid
          quizScoresInSession: [NaN, -10, 85, 150, 99.7], // mix
          totalFlashcardsCompleted: Infinity, // invalid
          studyPlansCompleted: -1, // invalid
        };

        const badges = checkBadgeUnlock([], context);
        
        // Should unlock: first-step (sessionCount=5), quiz-champion (99.7 rounds to 100)
        expect(badges).toContain('first-step');
        expect(badges).toContain('quiz-champion');
        expect(badges).toHaveLength(2);
      });

      it('handles undefined quiz scores array gracefully', () => {
        const context = {
          sessionCount: 1,
          currentStreak: 0,
          quizScoresInSession: undefined as any,
          totalFlashcardsCompleted: 0,
          studyPlansCompleted: 0,
        };

        const badges = checkBadgeUnlock([], context);
        
        // Should not crash and should unlock first-step
        expect(badges).toContain('first-step');
        expect(badges).not.toContain('quiz-champion');
      });

      it('validates float values in all numeric fields', () => {
        const context: BadgeUnlockContext = {
          sessionCount: 1.9, // Should work (>= 1)
          currentStreak: 7.2, // Should work (>= 7)
          quizScoresInSession: [],
          totalFlashcardsCompleted: 50.5, // Should work (>= 50)
          studyPlansCompleted: 1.1, // Should work (>= 1)
        };

        const badges = checkBadgeUnlock([], context);
        
        // All conditions met
        expect(badges).toContain('first-step');
        expect(badges).toContain('unstoppable');
        expect(badges).toContain('flashcard-master');
        expect(badges).toContain('test-ready');
      });
    });
  });
});
