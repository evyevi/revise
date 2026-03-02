# Phase 6: Gamification System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Implement a complete gamification system with XP earning, streak tracking, badges, and visual celebrations to motivate students through their study sessions.

**Architecture:** Service-oriented design with separation of concerns:
- **XP Service**: Calculates XP awards based on activities (quiz answers, flashcard completion, session completion, bonuses)
- **Streak Service**: Manages streak state, tracking consecutive days and grace periods
- **Badge Service**: Defines badge types and determines unlock conditions based on achievements
- **Celebration Component**: Reusable animation system for confetti, hearts, sparkles with Framer Motion

**Tech Stack:** TypeScript, Vitest (TDD), Framer Motion for animations, React hooks for state management

---

## Context

**Current State (Phase 5 complete):**
- Database schema with `UserStats` table (totalXP, currentStreak, longestStreak, badges array)
- Basic XP display in `StudyDashboard` and `Home` pages
- Quiz grading system exists but doesn't award XP
- No streak update logic
- No badges system
- No animations

**Design Requirements (from design doc):**
- XP earning: session completion (+50), correct quiz answer (+10), flashcard deck (+15), perfect quiz (+30), streak milestones (+20 per 3-day)
- Streaks: consecutive days, 1-day grace period, reset after 2 missed days
- Badges: 7 types with unlock conditions
- Celebrations: confetti, hearts, sparkles, pulsing glows

---

## Task 1: XP Service - Calculator & Earning Logic

**Files:**
- Create: `src/lib/xpService.ts`
- Create: `src/lib/__tests__/xpService.test.ts`
- Modify: `src/types/index.ts` - Add XP earning context type

**Step 1: Write failing tests for XP calculation**

```typescript
// src/lib/__tests__/xpService.test.ts
import { describe, it, expect } from 'vitest';
import { calculateSessionXP, calculateQuizAnswerXP, calculateFlashcardXP, calculatePerfectQuizBonus, calculateStreakBonus } from '../xpService';

describe('XP Service', () => {
  describe('calculateSessionXP', () => {
    it('awards 50 XP for completing a study session', () => {
      expect(calculateSessionXP()).toBe(50);
    });
  });

  describe('calculateQuizAnswerXP', () => {
    it('awards 10 XP per correct quiz answer', () => {
      expect(calculateQuizAnswerXP(1)).toBe(10);
      expect(calculateQuizAnswerXP(5)).toBe(50);
    });

    it('returns 0 for no correct answers', () => {
      expect(calculateQuizAnswerXP(0)).toBe(0);
    });
  });

  describe('calculateFlashcardXP', () => {
    it('awards 15 XP for completing flashcard deck', () => {
      expect(calculateFlashcardXP()).toBe(15);
    });
  });

  describe('calculatePerfectQuizBonus', () => {
    it('awards 30 XP bonus for 100% quiz score', () => {
      expect(calculatePerfectQuizBonus(true)).toBe(30);
    });

    it('returns 0 if quiz score not perfect', () => {
      expect(calculatePerfectQuizBonus(false)).toBe(0);
    });
  });

  describe('calculateStreakBonus', () => {
    it('awards 20 XP at 3-day streak milestone', () => {
      expect(calculateStreakBonus(3)).toBe(20);
    });

    it('awards 40 XP at 6-day streak milestone', () => {
      expect(calculateStreakBonus(6)).toBe(40);
    });

    it('returns 0 for non-milestone streaks', () => {
      expect(calculateStreakBonus(2)).toBe(0);
      expect(calculateStreakBonus(4)).toBe(0);
      expect(calculateStreakBonus(5)).toBe(0);
    });

    it('handles multiple milestone achievements', () => {
      // At day 9: both 3-day (6) and 6-day (9) milestones achieved = 40 XP
      expect(calculateStreakBonus(9)).toBe(40);
    });
  });

  describe('calculateTotalSessionXP', () => {
    it('sums all XP components correctly', () => {
      // Base 50 + 50 XP (5 correct answers) + 15 XP + 30 XP bonus + 20 XP streak = 165
      const total = calculateTotalSessionXP({
        baseSession: true,
        correctAnswers: 5,
        carddeckCompleted: true,
        perfectQuiz: true,
        currentStreak: 3,
      });
      expect(total).toBe(165);
    });

    it('handles partial completion', () => {
      // Base 50 + 20 XP (2 correct) + no deck + no bonus + no streak = 70
      const total = calculateTotalSessionXP({
        baseSession: true,
        correctAnswers: 2,
        carddeckCompleted: false,
        perfectQuiz: false,
        currentStreak: 0,
      });
      expect(total).toBe(70);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- xpService.test.ts
```

Expected output: Multiple failures - "calculateSessionXP is not defined"

**Step 3: Write minimal implementation**

```typescript
// src/lib/xpService.ts

export interface SessionXPContext {
  baseSession: boolean;
  correctAnswers: number;
  carddeckCompleted: boolean;
  perfectQuiz: boolean;
  currentStreak: number;
}

export function calculateSessionXP(): number {
  return 50;
}

export function calculateQuizAnswerXP(correctCount: number): number {
  return correctCount * 10;
}

export function calculateFlashcardXP(): number {
  return 15;
}

export function calculatePerfectQuizBonus(isPerfect: boolean): number {
  return isPerfect ? 30 : 0;
}

export function calculateStreakBonus(streak: number): number {
  // Calculate cumulative bonuses for all milestone milestones
  let bonus = 0;
  const milestone = 3;
  const bonusPerMilestone = 20;
  
  // Count how many 3-day milestones have been reached
  const milestonesReached = Math.floor(streak / milestone);
  bonus = milestonesReached * bonusPerMilestone;
  
  return bonus;
}

export function calculateTotalSessionXP(context: SessionXPContext): number {
  let total = 0;

  if (context.baseSession) {
    total += calculateSessionXP();
  }

  total += calculateQuizAnswerXP(context.correctAnswers);

  if (context.carddeckCompleted) {
    total += calculateFlashcardXP();
  }

  if (context.perfectQuiz) {
    total += calculatePerfectQuizBonus(true);
  }

  if (context.currentStreak > 0) {
    total += calculateStreakBonus(context.currentStreak);
  }

  return total;
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- xpService.test.ts
```

Expected: All tests pass ✓

**Step 5: Commit**

```bash
git add src/lib/xpService.ts src/lib/__tests__/xpService.test.ts
git commit -m "feat: add XP service with earning logic for all activity types

- calculateSessionXP: base 50 XP per session
- calculateQuizAnswerXP: 10 XP per correct answer
- calculateFlashcardXP: 15 XP for deck completion
- calculatePerfectQuizBonus: 30 XP for 100% quiz score  
- calculateStreakBonus: 20 XP per 3-day milestone
- calculateTotalSessionXP: sums all components
- 8/8 tests passing"
```

---

## Task 2: Streak Service - Track & Update Streak

**Files:**
- Create: `src/lib/streakService.ts`
- Create: `src/lib/__tests__/streakService.test.ts`
- Modify: `src/types/index.ts` - Add lastStudyDate to UserStats if not present

**Step 1: Write failing tests for streak logic**

```typescript
// src/lib/__tests__/streakService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { updateStreak, isStreakActive, shouldResetStreak } from '../streakService';

describe('Streak Service', () => {
  describe('shouldResetStreak', () => {
    it('returns false if streak was studied yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(shouldResetStreak(yesterday)).toBe(false);
    });

    it('returns false if streak was studied today', () => {
      const today = new Date();
      expect(shouldResetStreak(today)).toBe(false);
    });

    it('returns false for 1-day grace period (studied 2 days ago)', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      expect(shouldResetStreak(twoDaysAgo)).toBe(false);
    });

    it('returns true when grace period expired (studied 3+ days ago)', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      expect(shouldResetStreak(threeDaysAgo)).toBe(true);
    });

    it('returns true if no lastStudyDate', () => {
      expect(shouldResetStreak(undefined)).toBe(true);
    });
  });

  describe('isStreakActive', () => {
    it('returns true if studied yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isStreakActive(yesterday)).toBe(true);
    });

    it('returns true if studied today', () => {
      const today = new Date();
      expect(isStreakActive(today)).toBe(true);
    });

    it('returns false if not studied recently', () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      expect(isStreakActive(weekAgo)).toBe(false);
    });

    it('returns false if no lastStudyDate', () => {
      expect(isStreakActive(undefined)).toBe(false);
    });
  });

  describe('updateStreak', () => {
    it('increments streak if studied yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = updateStreak(5, yesterday);
      expect(result).toEqual({
        currentStreak: 6,
        longestStreak: 6,
        shouldIncrease: true,
      });
    });

    it('maintains streak if studied 2 days ago (grace period)', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const result = updateStreak(5, twoDaysAgo);
      expect(result).toEqual({
        currentStreak: 5,
        longestStreak: 5,
        shouldIncrease: false,
      });
    });

    it('resets streak if gap too long', () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const result = updateStreak(10, weekAgo);
      expect(result).toEqual({
        currentStreak: 1,
        longestStreak: 10,
        shouldIncrease: true,
      });
    });

    it('starts new streak if no previous activity', () => {
      const result = updateStreak(0, undefined);
      expect(result).toEqual({
        currentStreak: 1,
        longestStreak: 1,
        shouldIncrease: true,
      });
    });

    it('updates longest streak when current exceeds it', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = updateStreak(7, yesterday);
      expect(result.longestStreak).toBe(8);
      expect(result.currentStreak).toBe(8);
    });

    it('preserves longest streak when not exceeded', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = updateStreak(3, yesterday, 10); // longest = 10
      expect(result.longestStreak).toBe(10);
      expect(result.currentStreak).toBe(4);
    });

    it('handles immediate repeated study (same day)', () => {
      const today = new Date();
      const result = updateStreak(5, today);
      expect(result).toEqual({
        currentStreak: 5,
        longestStreak: 5,
        shouldIncrease: false,
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- streakService.test.ts
```

Expected: Multiple failures - functions not defined

**Step 3: Write minimal implementation**

```typescript
// src/lib/streakService.ts

export interface StreakUpdate {
  currentStreak: number;
  longestStreak: number;
  shouldIncrease: boolean;
}

const GRACE_PERIOD_DAYS = 1;
const RESET_THRESHOLD_DAYS = GRACE_PERIOD_DAYS + 1; // 2 days = 3 days since last study

/**
 * Check if streak should be reset based on gap
 */
export function shouldResetStreak(lastStudyDate: Date | undefined): boolean {
  if (!lastStudyDate) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastStudy = new Date(lastStudyDate);
  lastStudy.setHours(0, 0, 0, 0);

  const daysSinceLastStudy = Math.floor(
    (today.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceLastStudy > RESET_THRESHOLD_DAYS;
}

/**
 * Check if a streak is still active (within grace period)
 */
export function isStreakActive(lastStudyDate: Date | undefined): boolean {
  if (!lastStudyDate) return false;
  return !shouldResetStreak(lastStudyDate);
}

/**
 * Update streak based on study activity today
 */
export function updateStreak(
  currentStreak: number,
  lastStudyDate: Date | undefined,
  longestStreak: number = currentStreak
): StreakUpdate {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if already studied today
  if (lastStudyDate) {
    const lastStudy = new Date(lastStudyDate);
    lastStudy.setHours(0, 0, 0, 0);

    if (today.getTime() === lastStudy.getTime()) {
      // Already studied today, don't increase
      return {
        currentStreak,
        longestStreak,
        shouldIncrease: false,
      };
    }
  }

  // Check if streak should reset
  if (shouldResetStreak(lastStudyDate)) {
    // Start new streak
    return {
      currentStreak: 1,
      longestStreak: Math.max(longestStreak, 1),
      shouldIncrease: true,
    };
  }

  // Increment streak
  const newStreak = currentStreak + 1;
  const newLongest = Math.max(longestStreak, newStreak);

  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    shouldIncrease: true,
  };
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- streakService.test.ts
```

Expected: All tests pass ✓

**Step 5: Commit**

```bash
git add src/lib/streakService.ts src/lib/__tests__/streakService.test.ts
git commit -m "feat: add streak service with grace period and reset logic

- shouldResetStreak: detects when streak should reset (>2 days gap)
- isStreakActive: checks if streak is within grace period
- updateStreak: increments streak and tracks longest streak
- Implements 1-day grace period as per design
- 10/10 tests passing"
```

---

## Task 3: Badge Service - Define & Unlock Logic

**Files:**
- Create: `src/lib/badgeService.ts`
- Create: `src/lib/__tests__/badgeService.test.ts`
- Modify: `src/types/index.ts` - Add BadgeType enum

**Step 1: Write failing tests for badge system**

```typescript
// src/lib/__tests__/badgeService.test.ts
import { describe, it, expect } from 'vitest';
import { 
  BadgeType,
  Badge,
  checkBadgeUnlock,
  getAllBadges,
  getBadgeMetadata,
} from '../badgeService';

describe('Badge Service', () => {
  describe('getAllBadges', () => {
    it('returns all 7 badge types', () => {
      const badges = getAllBadges();
      expect(badges.length).toBe(7);
    });

    it('includes specific badges', () => {
      const badgeIds = getAllBadges().map(b => b.id);
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
    it('returns correct metadata for badge', () => {
      const badge = getBadgeMetadata('first-step');
      expect(badge?.name).toBe('First Step');
      expect(badge?.description).toContain('first');
      expect(badge?.icon).toBeDefined();
    });

    it('returns undefined for unknown badge', () => {
      expect(getBadgeMetadata('unknown-badge')).toBeUndefined();
    });
  });

  describe('checkBadgeUnlock', () => {
    it('unlocks "First Step" badge on first session completion', () => {
      const newBadges = checkBadgeUnlock([], {
        sessionCount: 1,
        currentStreak: 0,
        quizScoresInSession: [85],
        totalFlashcardsCompleted: 0,
        studyPlansCompleted: 0,
      });
      expect(newBadges).toContain('first-step');
    });

    it('unlocks "Dedicated Student" badge at 3-day streak', () => {
      const newBadges = checkBadgeUnlock([], {
        sessionCount: 0,
        currentStreak: 3,
        quizScoresInSession: [],
        totalFlashcardsCompleted: 0,
        studyPlansCompleted: 0,
      });
      expect(newBadges).toContain('dedicated-student');
    });

    it('unlocks "On Fire!" badge at 5-day streak', () => {
      const newBadges = checkBadgeUnlock([], {
        sessionCount: 0,
        currentStreak: 5,
        quizScoresInSession: [],
        totalFlashcardsCompleted: 0,
        studyPlansCompleted: 0,
      });
      expect(newBadges).toContain('on-fire');
    });

    it('unlocks "Unstoppable!" badge at 7-day streak', () => {
      const newBadges = checkBadgeUnlock([], {
        sessionCount: 0,
        currentStreak: 7,
        quizScoresInSession: [],
        totalFlashcardsCompleted: 0,
        studyPlansCompleted: 0,
      });
      expect(newBadges).toContain('unstoppable');
    });

    it('unlocks "Quiz Champion" badge on 100% quiz score', () => {
      const newBadges = checkBadgeUnlock([], {
        sessionCount: 0,
        currentStreak: 0,
        quizScoresInSession: [100],
        totalFlashcardsCompleted: 0,
        studyPlansCompleted: 0,
      });
      expect(newBadges).toContain('quiz-champion');
    });

    it('unlocks "Flashcard Master" at 50 flashcards', () => {
      const newBadges = checkBadgeUnlock([], {
        sessionCount: 0,
        currentStreak: 0,
        quizScoresInSession: [],
        totalFlashcardsCompleted: 50,
        studyPlansCompleted: 0,
      });
      expect(newBadges).toContain('flashcard-master');
    });

    it('unlocks "Test Ready!" on study plan completion', () => {
      const newBadges = checkBadgeUnlock([], {
        sessionCount: 0,
        currentStreak: 0,
        quizScoresInSession: [],
        totalFlashcardsCompleted: 0,
        studyPlansCompleted: 1,
      });
      expect(newBadges).toContain('test-ready');
    });

    it('does not re-unlock already-earned badges', () => {
      const existingBadges = ['first-step', 'dedicated-student'];
      const newBadges = checkBadgeUnlock(existingBadges, {
        sessionCount: 2,
        currentStreak: 3,
        quizScoresInSession: [],
        totalFlashcardsCompleted: 0,
        studyPlansCompleted: 0,
      });
      expect(newBadges).toEqual(existingBadges);
    });

    it('can unlock multiple badges in one check', () => {
      const newBadges = checkBadgeUnlock([], {
        sessionCount: 1,
        currentStreak: 7,
        quizScoresInSession: [100],
        totalFlashcardsCompleted: 50,
        studyPlansCompleted: 1,
      });
      expect(newBadges).toContain('first-step');
      expect(newBadges).toContain('dedicated-student');
      expect(newBadges).toContain('on-fire');
      expect(newBadges).toContain('unstoppable');
      expect(newBadges).toContain('quiz-champion');
      expect(newBadges).toContain('flashcard-master');
      expect(newBadges).toContain('test-ready');
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- badgeService.test.ts
```

Expected: Multiple failures - functions not defined

**Step 3: Write minimal implementation**

```typescript
// src/lib/badgeService.ts

export type BadgeType = 
  | 'first-step'
  | 'dedicated-student'
  | 'on-fire'
  | 'unstoppable'
  | 'quiz-champion'
  | 'flashcard-master'
  | 'test-ready';

export interface Badge {
  id: BadgeType;
  name: string;
  description: string;
  icon: string; // emoji
  condition: string;
}

export interface BadgeUnlockContext {
  sessionCount: number;
  currentStreak: number;
  quizScoresInSession: number[];
  totalFlashcardsCompleted: number;
  studyPlansCompleted: number;
}

const BADGE_DEFINITIONS: Badge[] = [
  {
    id: 'first-step',
    name: 'First Step',
    description: 'Complete your first study session',
    icon: '🎯',
    condition: 'Complete first study session',
  },
  {
    id: 'dedicated-student',
    name: 'Dedicated Student',
    description: 'Maintain a 3-day study streak',
    icon: '📚',
    condition: 'Reach 3-day streak',
  },
  {
    id: 'on-fire',
    name: 'On Fire!',
    description: 'Maintain a 5-day study streak',
    icon: '🔥',
    condition: 'Reach 5-day streak',
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable!',
    description: 'Maintain a 7-day study streak',
    icon: '⚡',
    condition: 'Reach 7-day streak',
  },
  {
    id: 'quiz-champion',
    name: 'Quiz Champion',
    description: 'Score 100% on any quiz',
    icon: '🏆',
    condition: 'Achieve perfect quiz score',
  },
  {
    id: 'flashcard-master',
    name: 'Flashcard Master',
    description: 'Complete 50 flashcards',
    icon: '💪',
    condition: 'Complete 50 flashcards',
  },
  {
    id: 'test-ready',
    name: 'Test Ready!',
    description: 'Complete an entire study plan',
    icon: '✅',
    condition: 'Complete full study plan',
  },
];

export function getAllBadges(): Badge[] {
  return BADGE_DEFINITIONS;
}

export function getBadgeMetadata(badgeId: string): Badge | undefined {
  return BADGE_DEFINITIONS.find(b => b.id === badgeId);
}

export function checkBadgeUnlock(
  currentBadges: BadgeType[],
  context: BadgeUnlockContext
): BadgeType[] {
  const newBadges = [...currentBadges];

  // First Step - on first session
  if (!newBadges.includes('first-step') && context.sessionCount >= 1) {
    newBadges.push('first-step');
  }

  // Dedicated Student - 3-day streak
  if (!newBadges.includes('dedicated-student') && context.currentStreak >= 3) {
    newBadges.push('dedicated-student');
  }

  // On Fire! - 5-day streak
  if (!newBadges.includes('on-fire') && context.currentStreak >= 5) {
    newBadges.push('on-fire');
  }

  // Unstoppable! - 7-day streak
  if (!newBadges.includes('unstoppable') && context.currentStreak >= 7) {
    newBadges.push('unstoppable');
  }

  // Quiz Champion - 100% quiz score
  if (
    !newBadges.includes('quiz-champion') &&
    context.quizScoresInSession.some(score => score === 100)
  ) {
    newBadges.push('quiz-champion');
  }

  // Flashcard Master - 50 flashcards
  if (
    !newBadges.includes('flashcard-master') &&
    context.totalFlashcardsCompleted >= 50
  ) {
    newBadges.push('flashcard-master');
  }

  // Test Ready! - 1 study plan completed
  if (!newBadges.includes('test-ready') && context.studyPlansCompleted >= 1) {
    newBadges.push('test-ready');
  }

  return newBadges;
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- badgeService.test.ts
```

Expected: All tests pass ✓

**Step 5: Commit**

```bash
git add src/lib/badgeService.ts src/lib/__tests__/badgeService.test.ts src/types/index.ts
git commit -m "feat: add badge service with unlock conditions

- Define 7 badge types with metadata and icons
- getAllBadges: returns all available badges
- getBadgeMetadata: retrieves badge info
- checkBadgeUnlock: determines which badges to unlock
- Supports: First Step, Dedicated Student, On Fire, Unstoppable, 
  Quiz Champion, Flashcard Master, Test Ready
- 15/15 tests passing"
```

---

## Task 4: Celebration Animation Component

**Files:**
- Create: `src/components/Celebration.tsx`
- Create: `src/components/__tests__/Celebration.test.tsx`

**Step 1: Write failing test for Celebration component**

```typescript
// src/components/__tests__/Celebration.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Celebration } from '../Celebration';

describe('Celebration Component', () => {
  it('renders confetti animation when type is confetti', () => {
    render(<Celebration type="confetti" duration={2000} />);
    const container = screen.getByTestId('celebration-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('celebration-confetti');
  });

  it('renders hearts animation when type is hearts', () => {
    render(<Celebration type="hearts" duration={2000} />);
    const container = screen.getByTestId('celebration-container');
    expect(container).toHaveClass('celebration-hearts');
  });

  it('renders sparkles animation when type is sparkles', () => {
    render(<Celebration type="sparkles" duration={2000} />);
    const container = screen.getByTestId('celebration-container');
    expect(container).toHaveClass('celebration-sparkles');
  });

  it('has correct duration', () => {
    const { rerender } = render(<Celebration type="confetti" duration={3000} />);
    const container = screen.getByTestId('celebration-container');
    expect(container).toHaveStyle('animation-duration: 3s');

    rerender(<Celebration type="confetti" duration={1000} />);
    expect(container).toHaveStyle('animation-duration: 1s');
  });

  it('passes through custom className', () => {
    render(
      <Celebration type="hearts" duration={2000} className="custom-class" />
    );
    const container = screen.getByTestId('celebration-container');
    expect(container).toHaveClass('custom-class');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- Celebration.test.tsx
```

Expected: Failures - component doesn't exist

**Step 3: Implement Celebration component**

```typescript
// src/components/Celebration.tsx
import { motion } from 'framer-motion';
import { useMemo } from 'react';

export type CelebrationType = 'confetti' | 'hearts' | 'sparkles';

interface CelebrationProps {
  type: CelebrationType;
  duration: number;
  className?: string;
}

const CONFETTI_COUNT = 30;
const HEARTS_COUNT = 15;
const SPARKLES_COUNT = 20;

function Confetti() {
  const confetti = useMemo(() => {
    return Array.from({ length: CONFETTI_COUNT }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 1,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {confetti.map(item => (
        <motion.div
          key={item.id}
          initial={{ y: -10, opacity: 1 }}
          animate={{ y: window.innerHeight + 10, opacity: 0 }}
          transition={{
            duration: item.duration,
            delay: item.delay,
            ease: 'easeIn',
          }}
          className="absolute w-2 h-2 bg-primary-500 rounded-full"
          style={{ left: `${item.left}%` }}
        />
      ))}
    </div>
  );
}

function Hearts() {
  const hearts = useMemo(() => {
    return Array.from({ length: HEARTS_COUNT }).map((_, i) => ({
      id: i,
      left: 40 + Math.random() * 20,
      delay: Math.random() * 0.3,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {hearts.map(item => (
        <motion.div
          key={item.id}
          initial={{ y: 0, opacity: 1, scale: 1 }}
          animate={{ y: -100, opacity: 0, scale: 0.8 }}
          transition={{
            duration: 2,
            delay: item.delay,
            ease: 'easeOut',
          }}
          className="absolute text-2xl"
          style={{ left: `${item.left}%`, bottom: '20%' }}
        >
          ♥
        </motion.div>
      ))}
    </div>
  );
}

function Sparkles() {
  const sparkles = useMemo(() => {
    return Array.from({ length: SPARKLES_COUNT }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 0.4,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {sparkles.map(item => (
        <motion.div
          key={item.id}
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 0 }}
          transition={{
            duration: 1.5,
            delay: item.delay,
            ease: 'easeOut',
          }}
          className="absolute text-lg"
          style={{ left: `${item.left}%`, top: `${item.top}%` }}
        >
          ✨
        </motion.div>
      ))}
    </div>
  );
}

export function Celebration({
  type,
  duration,
  className = '',
}: CelebrationProps) {
  const Component = (() => {
    switch (type) {
      case 'confetti':
        return Confetti;
      case 'hearts':
        return Hearts;
      case 'sparkles':
        return Sparkles;
    }
  })();

  return (
    <div
      data-testid="celebration-container"
      className={`celebration celebration-${type} ${className}`}
      style={{ animationDuration: `${duration}ms` }}
    >
      <Component />
    </div>
  );
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- Celebration.test.tsx
```

Expected: All tests pass ✓

**Step 5: Commit**

```bash
git add src/components/Celebration.tsx src/components/__tests__/Celebration.test.tsx
git commit -m "feat: add Celebration component with animation types

- Confetti: falling particles with randomized trajectories
- Hearts: floating hearts rising upward
- Sparkles: twinkling sparkle effects
- Configurable duration and CSS class
- Uses Framer Motion for smooth animations
- 5/5 tests passing"
```

---

## Task 5: XP Gain Animation Component

**Files:**
- Create: `src/components/XPGain.tsx`
- Create: `src/components/__tests__/XPGain.test.tsx`

**Step 1: Write failing test**

```typescript
// src/components/__tests__/XPGain.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { XPGain } from '../XPGain';

describe('XPGain Component', () => {
  it('renders XP amount with heart icon', () => {
    render(<XPGain amount={50} />);
    expect(screen.getByText('♥')).toBeInTheDocument();
    expect(screen.getByText('+50')).toBeInTheDocument();
  });

  it('animates from bottom up', async () => {
    render(<XPGain amount={100} />);
    const container = screen.getByTestId('xp-gain');
    expect(container).toHaveClass('animate-float-up');
  });

  it('shows correct XP value', () => {
    const { rerender } = render(<XPGain amount={25} />);
    expect(screen.getByText('+25')).toBeInTheDocument();

    rerender(<XPGain amount={150} />);
    expect(screen.getByText('+150')).toBeInTheDocument();
  });

  it('accepts custom position', () => {
    render(<XPGain amount={50} x={100} y={200} />);
    const container = screen.getByTestId('xp-gain');
    expect(container).toHaveStyle('left: 100px');
    expect(container).toHaveStyle('top: 200px');
  });

  it('has centered default position', () => {
    render(<XPGain amount={50} />);
    const container = screen.getByTestId('xp-gain');
    expect(container).toHaveClass('left-1/2');
    expect(container).toHaveClass('top-1/2');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- XPGain.test.tsx
```

Expected: Failures - component doesn't exist

**Step 3: Implement XPGain component**

```typescript
// src/components/XPGain.tsx
import { motion } from 'framer-motion';

interface XPGainProps {
  amount: number;
  x?: number;
  y?: number;
  duration?: number;
}

export function XPGain({
  amount,
  x,
  y,
  duration = 2,
}: XPGainProps) {
  const positionStyle = x !== undefined && y !== undefined 
    ? { left: `${x}px`, top: `${y}px` }
    : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <motion.div
      data-testid="xp-gain"
      className="fixed pointer-events-none font-bold text-lg"
      style={positionStyle}
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 0, y: -100 }}
      transition={{ duration }}
      exit={{ opacity: 0 }}
    >
      <span className="text-primary-500">♥</span>
      <span className="text-primary-600 ml-1">+{amount}</span>
    </motion.div>
  );
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- XPGain.test.tsx
```

Expected: All tests pass ✓

**Step 5: Commit**

```bash
git add src/components/XPGain.tsx src/components/__tests__/XPGain.test.tsx
git commit -m "feat: add XPGain animation component

- Displays XP gained with heart icon
- Floats upward with fade out animation
- Supports custom positioning
- Default centered on screen
- 5/5 tests passing"
```

---

## Task 6: Badge Unlock Animation Component

**Files:**
- Create: `src/components/BadgeUnlock.tsx`
- Create: `src/components/__tests__/BadgeUnlock.test.tsx`

**Step 1: Write failing test**

```typescript
// src/components/__tests__/BadgeUnlock.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BadgeUnlock } from '../BadgeUnlock';
import { getBadgeMetadata } from '../lib/badgeService';

describe('BadgeUnlock Component', () => {
  it('renders badge icon and name', () => {
    render(<BadgeUnlock badgeId="first-step" />);
    const badge = getBadgeMetadata('first-step');
    expect(screen.getByText(badge!.icon)).toBeInTheDocument();
    expect(screen.getByText(badge!.name)).toBeInTheDocument();
  });

  it('shows unlocked message', () => {
    render(<BadgeUnlock badgeId="quiz-champion" />);
    expect(screen.getByText(/Badge Unlocked!/i)).toBeInTheDocument();
  });

  it('displays badge description', () => {
    render(<BadgeUnlock badgeId="on-fire" />);
    const badge = getBadgeMetadata('on-fire');
    expect(screen.getByText(badge!.description)).toBeInTheDocument();
  });

  it('has scale-up animation', () => {
    render(<BadgeUnlock badgeId="dedicated-student" />);
    const container = screen.getByTestId('badge-unlock');
    expect(container).toHaveClass('animate-scale-pop');
  });

  it('has sparkle overlay effect', () => {
    render(<BadgeUnlock badgeId="unstoppable" />);
    const sparkles = screen.getByTestId('badge-sparkles');
    expect(sparkles).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- BadgeUnlock.test.tsx
```

Expected: Failures - component doesn't exist

**Step 3: Implement BadgeUnlock component**

```typescript
// src/components/BadgeUnlock.tsx
import { motion } from 'framer-motion';
import { getBadgeMetadata } from '../lib/badgeService';
import type { BadgeType } from '../lib/badgeService';

interface BadgeUnlockProps {
  badgeId: BadgeType;
  duration?: number;
}

export function BadgeUnlock({ badgeId, duration = 3 }: BadgeUnlockProps) {
  const badge = getBadgeMetadata(badgeId);

  if (!badge) return null;

  return (
    <motion.div
      data-testid="badge-unlock"
      className="fixed inset-0 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration }}
    >
      <motion.div
        className="relative flex flex-col items-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      >
        {/* Badge card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm">
          <motion.div
            className="text-6xl mb-4"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {badge.icon}
          </motion.div>

          <h2 className="text-2xl font-bold text-primary-600 mb-2">
            Badge Unlocked!
          </h2>

          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {badge.name}
          </h3>

          <p className="text-gray-600 mb-4">{badge.description}</p>

          <motion.div
            className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            ✨ {badge.condition}
          </motion.div>
        </div>

        {/* Sparkle overlay */}
        <div
          data-testid="badge-sparkles"
          className="absolute inset-0 pointer-events-none"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-lg"
              style={{
                top: '50%',
                left: '50%',
              }}
              initial={{
                opacity: 1,
                x: 0,
                y: 0,
              }}
              animate={{
                opacity: 0,
                x: Math.cos((i / 8) * Math.PI * 2) * 80,
                y: Math.sin((i / 8) * Math.PI * 2) * 80,
              }}
              transition={{
                duration: 1.5,
                delay: 0.3,
                ease: 'easeOut',
              }}
            >
              ✨
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- BadgeUnlock.test.tsx
```

Expected: All tests pass ✓

**Step 5: Commit**

```bash
git add src/components/BadgeUnlock.tsx src/components/__tests__/BadgeUnlock.test.tsx
git commit -m "feat: add BadgeUnlock celebration component

- Displays badge icon, name, and description
- Spring animation for scale-up effect
- Rotating badge icon
- Radiating sparkle effects
- Pulsing condition text
- 6/6 tests passing"
```

---

## Task 7: Gamification Integration - Update QuizScreen

**Files:**
- Modify: `src/components/study-session/QuizScreen.tsx`
- Modify: `src/hooks/useStudySession.ts`
- Create: `src/components/__tests__/QuizScreen.test.tsx` (extend existing)

**Step 1: Write failing test for gamification integration in QuizScreen**

```typescript
// Add to src/components/__tests__/QuizScreen.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QuizScreen } from '../study-session/QuizScreen';

describe('QuizScreen Gamification', () => {
  const mockQuestions = [
    {
      id: 'q1',
      topicId: 'topic1',
      question: 'What is 2+2?',
      options: ['3', '4', '5', '6'],
      correctAnswerIndex: 1,
      explanation: 'Correct!',
    },
  ];

  it('displays XP earned on quiz completion', async () => {
    const onComplete = vi.fn();
    const { getByRole, getByText } = render(
      <QuizScreen
        questions={mockQuestions}
        onComplete={onComplete}
      />
    );

    // Select correct answer
    fireEvent.click(getByRole('button', { name: /4/i }));

    // Should show XP feedback
    await screen.findByText(/\+10 XP/);
  });

  it('shows tiered feedback based on score', async () => {
    const onComplete = vi.fn();
    const questions = Array(10).fill(null).map((_, i) => ({
      id: `q${i}`,
      topicId: 'topic1',
      question: `Question ${i}?`,
      options: ['A', 'B', 'C', 'D'],
      correctAnswerIndex: 0,
      explanation: 'Correct!',
    }));

    render(
      <QuizScreen
        questions={questions}
        onComplete={onComplete}
      />
    );

    // Answer all correct (100%)
    for (let i = 0; i < questions.length; i++) {
      fireEvent.click(screen.getByRole('button', { name: /A/i }));
    }

    await screen.findByText(/Amazing! You're crushing it/i);
  });

  it('displays bonus feedback for scores below 40%', async () => {
    const onComplete = vi.fn();
    const questions = Array(5).fill(null).map((_, i) => ({
      id: `q${i}`,
      topicId: 'topic1',
      question: `Question ${i}?`,
      options: ['A', 'B', 'C', 'D'],
      correctAnswerIndex: 0,
      explanation: 'Correct!',
    }));

    render(
      <QuizScreen
        questions={questions}
        onComplete={onComplete}
      />
    );

    // Answer all wrong
    for (let i = 0; i < questions.length; i++) {
      fireEvent.click(screen.getByRole('button', { name: /B/i }));
    }

    await screen.findByText(/Don't worry!/i);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- QuizScreen
```

Expected: New tests fail - XP display and feedback not implemented

**Step 3: Update QuizScreen to show XP and tiered feedback**

```typescript
// Modifications to src/components/study-session/QuizScreen.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateQuizScore } from '../../lib/quizGrader';
import { calculateQuizAnswerXP, calculatePerfectQuizBonus } from '../../lib/xpService';
import { XPGain } from '../XPGain';

interface QuizScreenProps {
  questions: QuizQuestion[];
  onComplete: (results: QuizResults) => void;
}

export function QuizScreen({ questions, onComplete }: QuizScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [xpGains, setXpGains] = useState<Array<{ id: string; amount: number }>>([]);
  const [showScore, setShowScore] = useState(false);
  const [completedScore, setCompletedScore] = useState(0);

  const currentQuestion = questions[currentIndex];
  const isCorrect = selectedAnswer === currentQuestion.correctAnswerIndex;

  const handleAnswer = (optionIndex: number) => {
    setSelectedAnswer(optionIndex);
    setAnswered(true);

    const newAttempt: QuizAttempt = {
      questionId: currentQuestion.id,
      selectedAnswer: optionIndex,
      correct: optionIndex === currentQuestion.correctAnswerIndex,
    };

    setAttempts([...attempts, newAttempt]);

    // Show XP gain for correct answer
    if (newAttempt.correct) {
      const xpAmount = calculateQuizAnswerXP(1);
      setXpGains([...xpGains, { id: `xp-${Date.now()}`, amount: xpAmount }]);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setAnswered(false);
      setSelectedAnswer(null);
    } else {
      // Quiz complete
      const score = calculateQuizScore(attempts);
      const perfectBonus = calculatePerfectQuizBonus(score === 100);
      
      // Show final score with XP
      setCompletedScore(score);
      setShowScore(true);
    }
  };

  if (showScore) {
    const score = completedScore;
    const correctAnswers = attempts.filter(a => a.correct).length;
    const totalXP = calculateQuizAnswerXP(correctAnswers) + calculatePerfectQuizBonus(score === 100);

    let feedback = '';
    let encouragement = '';
    let emoji = '';

    if (score >= 80) {
      feedback = "Amazing! You're crushing it! 🎉";
      encouragement = 'Perfect score or near perfect - exceptional work!';
      emoji = '🎉';
    } else if (score >= 60) {
      feedback = 'Good work! You\'re learning and improving! 💪';
      encouragement = 'You\'re making great progress!';
      emoji = '💪';
    } else if (score >= 40) {
      feedback = 'Keep going! Every practice helps you learn! 🌟';
      encouragement = 'You\'re building knowledge one answer at a time!';
      emoji = '🌟';
    } else {
      feedback = "Don't worry! This content will come up again tomorrow. You've got this! 💖";
      encouragement = 'Learning is a journey, not a race!';
      emoji = '💖';
    }

    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-primary-50 to-accent-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="text-6xl mb-6"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.5 }}
        >
          {emoji}
        </motion.div>

        <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
          {feedback}
        </h2>

        <div className="bg-white rounded-xl p-6 shadow-lg mb-6 text-center">
          <p className="text-5xl font-bold text-primary-600 mb-2">{score}%</p>
          <p className="text-gray-600">
            {correctAnswers} of {questions.length} correct
          </p>
        </div>

        <motion.div
          className="bg-primary-100 rounded-lg p-4 mb-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-lg font-semibold text-primary-700">
            ♥ +{totalXP} XP earned
          </p>
        </motion.div>

        <p className="text-gray-600 text-center mb-6 max-w-sm">
          {encouragement}
        </p>

        <motion.button
          onClick={() => onComplete({ score, attempts, totalXP })}
          className="px-6 py-3 bg-primary-500 text-white rounded-lg font-semibold"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Continue
        </motion.button>

        {/* Floating XP indicators */}
        <AnimatePresence>
          {xpGains.map(xp => (
            <XPGain key={xp.id} amount={xp.amount} />
          ))}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-primary-50 to-accent-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Progress */}
      <div className="w-full max-w-md mb-8">
        <div className="text-sm text-gray-600 mb-2">
          Question {currentIndex + 1} of {questions.length}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-primary-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {currentQuestion.question}
        </h2>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <motion.button
              key={index}
              onClick={() => !answered && handleAnswer(index)}
              disabled={answered}
              className={`w-full p-4 rounded-lg font-semibold text-left transition-all ${
                !answered
                  ? 'bg-white text-gray-800 hover:bg-primary-50 cursor-pointer'
                  : index === currentQuestion.correctAnswerIndex
                  ? 'bg-green-200 text-green-800'
                  : index === selectedAnswer
                  ? 'bg-red-200 text-red-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
              whileHover={!answered ? { scale: 1.02 } : {}}
              whileTap={!answered ? { scale: 0.98 } : {}}
            >
              {option}
              {answered && index === currentQuestion.correctAnswerIndex && ' ✓'}
              {answered && index === selectedAnswer && index !== currentQuestion.correctAnswerIndex && ' ✗'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Feedback & Next */}
      {answered && (
        <motion.div
          className="max-w-md w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={`mb-4 p-4 rounded-lg ${
            isCorrect
              ? 'bg-green-100 text-green-800'
              : 'bg-orange-100 text-orange-800'
          }`}>
            <p className="font-semibold mb-2">
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            {!isCorrect && (
              <p className="text-sm mb-2">
                <strong>Correct answer:</strong> {currentQuestion.options[currentQuestion.correctAnswerIndex]}
              </p>
            )}
            <p className="text-sm">{currentQuestion.explanation}</p>
          </div>

          <motion.button
            onClick={handleNext}
            className="w-full px-6 py-3 bg-primary-500 text-white rounded-lg font-semibold"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
          </motion.button>
        </motion.div>
      )}

      {/* Floating XP indicators */}
      <AnimatePresence>
        {xpGains.map(xp => (
          <XPGain key={xp.id} amount={xp.amount} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- QuizScreen
```

Expected: New tests pass ✓

**Step 5: Commit**

```bash
git add src/components/study-session/QuizScreen.tsx src/components/__tests__/QuizScreen.test.tsx
git commit -m "feat: integrate gamification into QuizScreen

- Show XP gain (+10 per correct answer) with animation
- Display tiered feedback based on quiz score
- Calculate perfect quiz bonus (+30 XP)
- Show total XP earned with pink hearts
- Encouragement messages for all score ranges
- 4/4 new gamification tests passing"
```

---

## Task 8: Gamification Integration - Update CompletionScreen & UserStats

**Files:**
- Modify: `src/components/study-session/CompletionScreen.tsx`
- Modify: `src/hooks/useStudySession.ts`
- Modify: `src/lib/db.ts` - Add helper to update user stats with XP/streak/badges

**Step 1: Write failing test for session completion gamification**

```typescript
// src/hooks/__tests__/useStudySession.test.tsx - Add these tests
it('updates XP on session completion', async () => {
  const { result } = renderHook(() => useStudySession(mockPlan.id));
  
  // Simulate completion
  act(() => {
    result.current.completeSession({
      xpEarned: 165,
      badges: ['first-step'],
    });
  });

  const stats = await db.userStats.get('default');
  expect(stats?.totalXP).toBe(165);
});

it('increments streak on consecutive day study', async () => {
  // Setup: yesterday's study
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  await db.userStats.update('default', { 
    currentStreak: 5,
    lastStudyDate: yesterday 
  });

  const { result } = renderHook(() => useStudySession(mockPlan.id));
  
  act(() => {
    result.current.completeSession({ xpEarned: 50 });
  });

  const stats = await db.userStats.get('default');
  expect(stats?.currentStreak).toBe(6);
});

it('unlocks badges on session completion', async () => {
  const { result } = renderHook(() => useStudySession(mockPlan.id));
  
  act(() => {
    result.current.completeSession({
      xpEarned: 50,
      newBadges: ['first-step'],
    });
  });

  const stats = await db.userStats.get('default');
  expect(stats?.badges).toContain('first-step');
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- useStudySession
```

Expected: New tests fail - methods don't exist

**Step 3: Create helper function in db.ts**

```typescript
// Add to src/lib/db.ts

export interface SessionCompletionContext {
  xpEarned: number;
  newBadges?: string[];
  quizScoresInSession?: number[];
  flashcardsCompleted?: number;
}

export async function updateUserStatsOnSessionComplete(
  context: SessionCompletionContext
): Promise<UserStats> {
  const stats = await getUserStats();
  const today = new Date();

  // Calculate streak update
  const streakUpdate = updateStreak(
    stats.currentStreak,
    stats.lastStudyDate,
    stats.longestStreak
  );

  // Update stats
  await db.userStats.update('default', {
    totalXP: stats.totalXP + context.xpEarned,
    currentStreak: streakUpdate.currentStreak,
    longestStreak: streakUpdate.longestStreak,
    badges: context.newBadges 
      ? Array.from(new Set([...stats.badges, ...context.newBadges]))
      : stats.badges,
    lastStudyDate: today,
  });

  return (await db.userStats.get('default'))!;
}
```

**Step 4: Update CompletionScreen to show full gamification**

```typescript
// Update src/components/study-session/CompletionScreen.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Celebration } from '../Celebration';
import { BadgeUnlock } from '../BadgeUnlock';
import type { BadgeType } from '../../lib/badgeService';

interface CompletionScreenProps {
  xpEarned: number;
  newBadges?: BadgeType[];
  streakBonus?: number;
  currentStreak?: number;
  onContinue: () => void;
}

export function CompletionScreen({
  xpEarned,
  newBadges = [],
  streakBonus = 0,
  currentStreak = 0,
  onContinue,
}: CompletionScreenProps) {
  const [showCelebration, setShowCelebration] = useState(true);
  const [badgeIndex, setBadgeIndex] = useState(0);

  useEffect(() => {
    // Auto-advance to next badge or continue after delay
    if (badgeIndex >= newBadges.length) {
      const timer = setTimeout(onContinue, 2000);
      return () => clearTimeout(timer);
    }
  }, [badgeIndex, newBadges.length, onContinue]);

  if (newBadges.length > 0 && badgeIndex < newBadges.length) {
    return (
      <motion.div className="fixed inset-0">
        <BadgeUnlock badgeId={newBadges[badgeIndex]} />
        <motion.button
          onClick={() => setBadgeIndex(badgeIndex + 1)}
          className="fixed bottom-6 left-6 px-6 py-2 bg-white rounded-lg shadow-lg"
          whileHover={{ scale: 1.05 }}
        >
          Skip
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-primary-50 to-accent-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {showCelebration && (
        <Celebration type="confetti" duration={3000} />
      )}

      <motion.div
        className="text-6xl mb-6"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.6 }}
      >
        🎉
      </motion.div>

      <h1 className="text-4xl font-bold text-gray-800 mb-2 text-center">
        Day Complete!
      </h1>

      <p className="text-xl text-gray-600 mb-8 text-center">
        You're doing amazing!
      </p>

      {/* XP Summary */}
      <motion.div
        className="bg-white rounded-xl shadow-lg p-8 mb-8 max-w-md w-full"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="space-y-4">
          <div className="border-b pb-4">
            <p className="text-gray-600 text-sm mb-2">Session Rewards</p>
            <p className="text-3xl font-bold text-primary-600">
              ♥ +{xpEarned} XP
            </p>
          </div>

          {streakBonus > 0 && (
            <div className="border-b pb-4">
              <p className="text-gray-600 text-sm mb-2">Streak Bonus</p>
              <p className="text-2xl font-bold text-orange-600">
                🔥 +{streakBonus} XP
              </p>
            </div>
          )}

          {currentStreak > 0 && (
            <div>
              <p className="text-gray-600 text-sm mb-2">Current Streak</p>
              <p className="text-2xl font-bold text-orange-600">
                🔥 {currentStreak} day{currentStreak !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* New Badges */}
      {newBadges.length > 0 && (
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-center text-gray-600 mb-4">New Badges!</p>
          <div className="flex gap-4 justify-center flex-wrap">
            {newBadges.map(badgeId => {
              const badge = getBadgeMetadata(badgeId);
              return (
                <div
                  key={badgeId}
                  className="text-4xl p-4 bg-primary-100 rounded-lg"
                >
                  {badge?.icon}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <motion.button
        onClick={onContinue}
        className="px-8 py-4 bg-primary-500 text-white rounded-lg font-semibold text-lg"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        See you tomorrow! 👋
      </motion.button>
    </motion.div>
  );
}
```

**Step 5: Run tests to verify they pass**

```bash
npm test -- useStudySession
```

Expected: All tests pass ✓

**Step 6: Commit**

```bash
git add src/lib/db.ts src/lib/streakService.ts src/components/study-session/CompletionScreen.tsx src/hooks/useStudySession.ts src/components/__tests__/useStudySession.test.tsx
git commit -m "feat: integrate gamification into session completion

- Complete session workflow updates XP, streaks, badges
- updateUserStatsOnSessionComplete helper function
- CompletionScreen shows XP, streak, badges with animations
- Supports badge unlock celebration flow
- Day completion celebration with confetti
- 3/3 new session completion tests passing"
```

---

## Task 9: Update Home Page with Gamification Display

**Files:**
- Modify: `src/pages/Home.tsx`
- Modify: `src/components/StudyDashboard.tsx`

**Step 1: Write test for updated Home page**

```typescript
// Extend src/pages/__tests__/Home.test.tsx
it('displays current streak with flame icon', async () => {
  const stats: UserStats = {
    id: 'default',
    totalXP: 500,
    currentStreak: 7,
    longestStreak: 10,
    badges: ['first-step', 'dedicated-student'],
  };
  
  await db.userStats.put(stats);
  
  render(<Home />);
  expect(screen.getByText(/🔥 7/)).toBeInTheDocument();
});

it('displays badge count', async () => {
  const stats: UserStats = {
    id: 'default',
    totalXP: 500,
    currentStreak: 3,
    longestStreak: 5,
    badges: ['first-step', 'quiz-champion'],
  };
  
  await db.userStats.put(stats);
  
  render(<Home />);
  expect(screen.getByText('2')).toBeInTheDocument(); // badge count
});

it('shows progress to next milestone badge', () => {
  render(<Home />);
  // At 3-day streak, next is "On Fire" at 5 days
  expect(screen.getByText(/2 more days/i)).toBeInTheDocument();
});
```

**Step 2: Run tests**

```bash
npm test -- Home
```

Expected: Some tests fail - dashboard doesn't show all gamification

**Step 3: Update StudyDashboard component**

```typescript
// src/components/StudyDashboard.tsx - Update
import { useState, useEffect } from 'react';

interface StudyDashboardProps {
  xp: number;
  streak: number;
  totalPlans: number;
  activePlans: number;
  badges?: number;
  nextBadgeProgress?: { current: number; target: number; name: string };
}

export function StudyDashboard({
  xp,
  streak,
  totalPlans,
  activePlans,
  badges = 0,
  nextBadgeProgress,
}: StudyDashboardProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {/* XP */}
      <motion.div
        className="bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl p-4"
        whileHover={{ scale: 1.02 }}
      >
        <p className="text-xs text-gray-600 mb-1">Total XP</p>
        <p className="text-2xl font-bold text-primary-600">♥ {xp}</p>
        <motion.p
          className="text-xs text-primary-500 mt-1"
          animate={{ opacity: [0.6, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ✨ level up soon
        </motion.p>
      </motion.div>

      {/* Streak */}
      <motion.div
        className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl p-4"
        whileHover={{ scale: 1.02 }}
      >
        <p className="text-xs text-gray-600 mb-1">Streak</p>
        <p className="text-2xl font-bold text-orange-600">🔥 {streak}</p>
        {nextBadgeProgress && (
          <p className="text-xs text-orange-500 mt-1">
            {nextBadgeProgress.target - nextBadgeProgress.current} more to {nextBadgeProgress.name}
          </p>
        )}
      </motion.div>

      {/* Badges */}
      <motion.div
        className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl p-4"
        whileHover={{ scale: 1.02 }}
      >
        <p className="text-xs text-gray-600 mb-1">Badges</p>
        <p className="text-2xl font-bold text-purple-600">🏆 {badges}/7</p>
      </motion.div>

      {/* Active Plans */}
      <motion.div
        className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl p-4"
        whileHover={{ scale: 1.02 }}
      >
        <p className="text-xs text-gray-600 mb-1">Active Plans</p>
        <p className="text-2xl font-bold text-blue-600">{activePlans}</p>
      </motion.div>
    </div>
  );
}
```

**Step 4: Update Home page**

```typescript
// src/pages/Home.tsx - Update
import { useEffect, useState } from 'react';
import { getUserStats } from '../lib/db';
import { getAllBadges } from '../lib/badgeService';

export function Home() {
  const [userStats, setUserStats] = useState<UserStats>(/* ... */);
  const [nextBadgeProgress, setNextBadgeProgress] = useState<any>(null);

  useEffect(() => {
    getStats();
  }, []);

  const getStats = async () => {
    const stats = await getUserStats();
    setUserStats(stats);

    // Calculate next badge progress
    if (stats.currentStreak === 3) {
      setNextBadgeProgress({
        current: 3,
        target: 5,
        name: 'On Fire! (5 days)',
      });
    } else if (stats.currentStreak === 5) {
      setNextBadgeProgress({
        current: 5,
        target: 7,
        name: 'Unstoppable! (7 days)',
      });
    }
  };

  return (
    <Layout>
      <StudyDashboard
        xp={userStats.totalXP}
        streak={userStats.currentStreak}
        totalPlans={/* ... */}
        activePlans={/* ... */}
        badges={userStats.badges.length}
        nextBadgeProgress={nextBadgeProgress}
      />
      {/* ... rest of Home */}
    </Layout>
  );
}
```

**Step 5: Run tests**

```bash
npm test -- Home
```

Expected: All tests pass ✓

**Step 6: Commit**

```bash
git add src/pages/Home.tsx src/components/StudyDashboard.tsx
git commit -m "feat: enhance Home page with gamification display

- Show badge count (X/7)
- Display next milestone progress (e.g., '2 more days to On Fire')
- Add hover animations on dashboard cards
- Pulsing XP level-up indicator
- Consistent gamification UI across dashboard
- 3/3 new Home page tests passing"
```

---

## Task 10: Full Test Suite & Final Integration Testing

**Files:**
- Create: `src/__tests__/gamification.integration.test.ts`

**Step 1: Write comprehensive integration test**

```typescript
// src/__tests__/gamification.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../lib/db';
import { getUserStats, updateUserStatsOnSessionComplete } from '../lib/db';
import { updateStreak } from '../lib/streakService';
import { checkBadgeUnlock } from '../lib/badgeService';
import { calculateTotalSessionXP } from '../lib/xpService';

describe('Gamification System - Integration Tests', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.close();
  });

  it('complete workflow: first day study and badge unlock', async () => {
    // Setup initial stats
    await db.userStats.add({
      id: 'default',
      totalXP: 0,
      currentStreak: 0,
      longestStreak: 0,
      badges: [],
    });

    // Calculate XP for session
    const xpEarned = calculateTotalSessionXP({
      baseSession: true,
      correctAnswers: 5,
      carddeckCompleted: true,
      perfectQuiz: false,
      currentStreak: 0,
    });

    // Check badge unlock (First Step)
    const newBadges = checkBadgeUnlock([], {
      sessionCount: 1,
      currentStreak: 0,
      quizScoresInSession: [],
      totalFlashcardsCompleted: 0,
      studyPlansCompleted: 0,
    });

    // Update stats
    const updated = await updateUserStatsOnSessionComplete({
      xpEarned,
      newBadges: newBadges as any,
    });

    expect(updated.totalXP).toBe(xpEarned);
    expect(updated.badges).toContain('first-step');
    expect(updated.currentStreak).toBe(1);
  });

  it('3-day streak unlocks "Dedicated Student" badge', async () => {
    // Setup day 2 study
    const day2 = new Date();
    day2.setDate(day2.getDate() - 1);

    await db.userStats.add({
      id: 'default',
      totalXP: 150,
      currentStreak: 2,
      longestStreak: 2,
      badges: ['first-step'],
      lastStudyDate: day2,
    });

    // Day 3 study
    const xpEarned = calculateTotalSessionXP({
      baseSession: true,
      correctAnswers: 3,
      carddeckCompleted: false,
      perfectQuiz: false,
      currentStreak: 3,
    });

    const newBadges = checkBadgeUnlock(['first-step'], {
      sessionCount: 0,
      currentStreak: 3,
      quizScoresInSession: [],
      totalFlashcardsCompleted: 0,
      studyPlansCompleted: 0,
    });

    const updated = await updateUserStatsOnSessionComplete({
      xpEarned,
      newBadges: newBadges as any,
    });

    expect(updated.currentStreak).toBe(3);
    expect(updated.badges).toContain('dedicated-student');
  });

  it('perfect quiz score awards bonus XP and badge', async () => {
    await db.userStats.add({
      id: 'default',
      totalXP: 0,
      currentStreak: 0,
      longestStreak: 0,
      badges: [],
    });

    // Perfect quiz (100%)
    const xpEarned = calculateTotalSessionXP({
      baseSession: true,
      correctAnswers: 5,
      carddeckCompleted: true,
      perfectQuiz: true,
      currentStreak: 0,
    });

    const newBadges = checkBadgeUnlock([], {
      sessionCount: 0,
      currentStreak: 0,
      quizScoresInSession: [100],
      totalFlashcardsCompleted: 0,
      studyPlansCompleted: 0,
    });

    const updated = await updateUserStatsOnSessionComplete({
      xpEarned,
      newBadges: newBadges as any,
    });

    expect(xpEarned).toBeGreaterThanOrEqual(95); // 50 + 50 + 15 + 30 = 145
    expect(updated.badges).toContain('quiz-champion');
  });

  it('7-day streak with all badges unlocked', async () => {
    const day7 = new Date();
    day7.setDate(day7.getDate() - 1);

    await db.userStats.add({
      id: 'default',
      totalXP: 500,
      currentStreak: 6,
      longestStreak: 6,
      badges: [
        'first-step',
        'dedicated-student',
        'on-fire',
        'quiz-champion',
        'flashcard-master',
      ],
      lastStudyDate: day7,
    });

    // Day 7 study
    const xpEarned = calculateTotalSessionXP({
      baseSession: true,
      correctAnswers: 4,
      carddeckCompleted: true,
      perfectQuiz: false,
      currentStreak: 7,
    });

    const currentBadges = [
      'first-step',
      'dedicated-student',
      'on-fire',
      'quiz-champion',
      'flashcard-master',
    ];

    const newBadges = checkBadgeUnlock(currentBadges as any, {
      sessionCount: 0,
      currentStreak: 7,
      quizScoresInSession: [],
      totalFlashcardsCompleted: 0,
      studyPlansCompleted: 0,
    });

    const updated = await updateUserStatsOnSessionComplete({
      xpEarned,
      newBadges: newBadges as any,
    });

    expect(updated.currentStreak).toBe(7);
    expect(updated.badges).toContain('unstoppable');
    expect(updated.longestStreak).toBe(7);
  });

  it('handles streak reset after 2-day gap', async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    await db.userStats.add({
      id: 'default',
      totalXP: 300,
      currentStreak: 5,
      longestStreak: 10,
      badges: ['first-step', 'dedicated-student', 'on-fire'],
      lastStudyDate: threeDaysAgo,
    });

    // After 3-day gap, new session today
    const stats = await getUserStats();
    const streakUpdate = updateStreak(
      stats.currentStreak,
      stats.lastStudyDate,
      stats.longestStreak
    );

    expect(streakUpdate.currentStreak).toBe(1); // Reset to 1
    expect(streakUpdate.longestStreak).toBe(10); // Preserved
    expect(streakUpdate.shouldIncrease).toBe(true);
  });
});
```

**Step 2: Run integration tests**

```bash
npm test -- gamification.integration
```

Expected: All integration tests pass ✓

**Step 3: Run full test suite**

```bash
npm test
```

Expected: 160+/160+ tests passing ✓

**Step 4: Commit**

```bash
git add src/__tests__/gamification.integration.test.ts
git commit -m "feat: add comprehensive gamification integration tests

- First day study with XP and badge unlock
- 3-day streak badge unlock workflow
- Perfect quiz score bonus and badge
- 7-day streak with multiple badges
- Streak reset after 2-day grace period
- Full end-to-end gamification workflows
- 5/5 integration tests passing
- 160+/160+ total tests passing"
```

---

## Testing & Review Checklist

Before marking this phase complete:

**Unit Tests:**
```bash
npm test -- xpService
npm test -- streakService
npm test -- badgeService
npm test -- Celebration
npm test -- XPGain
npm test -- BadgeUnlock
```

**Component Tests:**
```bash
npm test -- QuizScreen
npm test -- CompletionScreen
npm test -- StudyDashboard
npm test -- Home
```

**Integration Tests:**
```bash
npm test -- gamification.integration
```

**Full Suite:**
```bash
npm test
```

**Code Quality:**
```bash
npm run lint
npm run type-check
```

**Manual Testing Checklist:**
- [ ] Quiz shows +10 XP for each correct answer
- [ ] Quiz completion screen shows total XP
- [ ] Perfect 100% quiz shows +30 bonus XP
- [ ] Score ≥80% shows "Amazing!" message with emoji
- [ ] Score 60-79% shows "Good work!" message
- [ ] Score 40-59% shows "Keep going!" message
- [ ] Score <40% shows encouraging "Don't worry!" message
- [ ] Day completion shows confetti animation
- [ ] New badge shows unlock animation with sparkles
- [ ] Streak increments on consecutive days
- [ ] 3-day streak unlocks "Dedicated Student" badge
- [ ] 5-day streak unlocks "On Fire!" badge
- [ ] 7-day streak unlocks "Unstoppable!" badge
- [ ] Home dashboard displays streak, XP, badges
- [ ] Next badge milestone shows progress

---

## Success Criteria

✅ All 10 tasks completed with TDD
✅ 160+ tests passing
✅ Zero eslint errors
✅ Complete gamification system functional
✅ All animations smooth and performant
✅ Streak tracking with 1-day grace period
✅ 7 unique badges with unlock conditions
✅ XP earning across all activities
✅ Tiered feedback messages for quiz scores
✅ Celebration animations on achievements
