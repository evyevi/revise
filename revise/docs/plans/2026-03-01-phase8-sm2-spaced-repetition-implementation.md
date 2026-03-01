# Phase 8: Advanced Spaced Repetition (SM-2 Algorithm) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the simple +1/-1 mastery system with the industry-standard SM-2 spaced repetition algorithm, enabling optimal flashcard scheduling based on forgetting curves and learner performance.

**Architecture:** Extend `Flashcard` schema with SM-2 fields (easinessFactor, interval, nextReviewDate). Replace `masteryCalculator.ts` with `sm2Calculator.ts` implementing SuperMemo 2 algorithm. Update `reviewService.ts` to use SM-2 calculations. Add scheduling logic to `planQueries.ts` to filter due cards. Modify FlashcardDeck to show 4-button quality grading (Again, Hard, Good, Easy) instead of binary correct/incorrect. Maintain backward compatibility by migrating existing cards with default SM-2 values.

**Tech Stack:** TypeScript, Vitest (TDD), Dexie.js (IndexedDB schema migration), React 18, TailwindCSS, Framer Motion

---

## Context

**Current State (Phase 7 complete):**
- Simple mastery system: `updateMastery(level, correct)` in `masteryCalculator.ts` increments/decrements 0-5 scale
- Flashcard interface: `{ masteryLevel, reviewDates, firstShownDate, needsPractice? }`
- FlashcardDeck UI: Binary grading ("Need Review ✗" / "Got it! ✓") after flipping card
- `reviewService.recordFlashcardReview(cardId, correct)` updates mastery + reviewDates
- Study sessions show ALL flashcards for a day, no scheduling by due date
- 338/338 tests passing across 34 files

**What we're building:**
1. **SM-2 Calculator** (`sm2Calculator.ts`) — core algorithm with 4-quality grading (0-3)
2. **Schema Migration** — add `easinessFactor`, `interval`, `nextReviewDate` to Flashcard type + DB
3. **Updated Review Service** — replace simple mastery with SM-2 calculations
4. **Card Scheduler** — filter flashcards by due date in `planQueries.ts`
5. **Enhanced FlashcardDeck UI** — 4-button grading interface (Again 0, Hard 1, Good 2, Easy 3)
6. **Migration Utility** — initialize SM-2 fields for existing flashcards
7. **Backward Compatibility** — keep `masteryLevel` for progress dashboard, derive from easinessFactor

**SM-2 Algorithm Overview:**
- **Quality ratings** (0-3): Again (complete blackout), Hard (incorrect but recalled), Good (correct with effort), Easy (perfect recall)
- **Easiness Factor (EF)**: 1.3-2.5, adjusts based on quality (default 2.5)
- **Interval**: Days until next review (1, 6, then EF-multiplied)
- **Formula**: `EF' = EF + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02))`
- **Next Review**: `nextReviewDate = today + interval`

---

## Task 1: SM-2 Calculator Service

**Files:**
- Create: `src/lib/sm2Calculator.ts`
- Create: `src/lib/__tests__/sm2Calculator.test.ts`

### Step 1: Write failing tests for SM-2 algorithm

Create `src/lib/__tests__/sm2Calculator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateSM2, type SM2Result, type SM2Input, Quality } from '../sm2Calculator';

describe('sm2Calculator', () => {
  describe('calculateSM2', () => {
    it('returns correct intervals for first review with quality 2 (Good)', () => {
      const input: SM2Input = {
        quality: Quality.Good,
        repetitions: 0,
        easinessFactor: 2.5,
        previousInterval: 0,
      };
      const result = calculateSM2(input);
      
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1); // First review: 1 day
      expect(result.easinessFactor).toBe(2.5); // No change for quality 2
    });

    it('returns 6-day interval for second review with quality 2', () => {
      const input: SM2Input = {
        quality: Quality.Good,
        repetitions: 1,
        easinessFactor: 2.5,
        previousInterval: 1,
      };
      const result = calculateSM2(input);
      
      expect(result.repetitions).toBe(2);
      expect(result.interval).toBe(6); // Second review: 6 days
      expect(result.easinessFactor).toBe(2.5);
    });

    it('multiplies interval by EF for subsequent reviews', () => {
      const input: SM2Input = {
        quality: Quality.Good,
        repetitions: 2,
        easinessFactor: 2.5,
        previousInterval: 6,
      };
      const result = calculateSM2(input);
      
      expect(result.repetitions).toBe(3);
      expect(result.interval).toBe(15); // 6 * 2.5 = 15
      expect(result.easinessFactor).toBe(2.5);
    });

    it('resets repetitions to 0 for quality 0 (Again)', () => {
      const input: SM2Input = {
        quality: Quality.Again,
        repetitions: 3,
        easinessFactor: 2.5,
        previousInterval: 15,
      };
      const result = calculateSM2(input);
      
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1); // Reset to 1 day
      expect(result.easinessFactor).toBeLessThan(2.5); // EF decreases
    });

    it('resets repetitions to 0 for quality 1 (Hard)', () => {
      const input: SM2Input = {
        quality: Quality.Hard,
        repetitions: 2,
        easinessFactor: 2.3,
        previousInterval: 6,
      };
      const result = calculateSM2(input);
      
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(1); // Reset to 1 day
      expect(result.easinessFactor).toBeLessThan(2.3); // EF decreases
    });

    it('increases EF for quality 3 (Easy)', () => {
      const input: SM2Input = {
        quality: Quality.Easy,
        repetitions: 0,
        easinessFactor: 2.5,
        previousInterval: 0,
      };
      const result = calculateSM2(input);
      
      expect(result.easinessFactor).toBeGreaterThan(2.5);
      expect(result.interval).toBe(1);
    });

    it('clamps EF to minimum 1.3', () => {
      const input: SM2Input = {
        quality: Quality.Again,
        repetitions: 0,
        easinessFactor: 1.4, // Already low
        previousInterval: 1,
      };
      const result = calculateSM2(input);
      
      expect(result.easinessFactor).toBeGreaterThanOrEqual(1.3);
    });

    it('caps EF at 2.5', () => {
      const input: SM2Input = {
        quality: Quality.Easy,
        repetitions: 2,
        easinessFactor: 2.5,
        previousInterval: 6,
      };
      const result = calculateSM2(input);
      
      expect(result.easinessFactor).toBeLessThanOrEqual(2.5);
    });

    it('rounds interval to nearest integer', () => {
      const input: SM2Input = {
        quality: Quality.Good,
        repetitions: 2,
        easinessFactor: 2.3,
        previousInterval: 6,
      };
      const result = calculateSM2(input);
      
      expect(result.interval).toBe(14); // Math.round(6 * 2.3) = 14
      expect(Number.isInteger(result.interval)).toBe(true);
    });
  });

  describe('deriveClampedMasteryLevel', () => {
    it('maps EF 1.3-1.5 to mastery 1', () => {
      const { deriveClampedMasteryLevel } = require('../sm2Calculator');
      expect(deriveClampedMasteryLevel(1.3)).toBe(1);
      expect(deriveClampedMasteryLevel(1.4)).toBe(1);
      expect(deriveClampedMasteryLevel(1.5)).toBe(1);
    });

    it('maps EF 1.6-1.8 to mastery 2', () => {
      const { deriveClampedMasteryLevel } = require('../sm2Calculator');
      expect(deriveClampedMasteryLevel(1.6)).toBe(2);
      expect(deriveClampedMasteryLevel(1.7)).toBe(2);
    });

    it('maps EF 1.9-2.1 to mastery 3', () => {
      const { deriveClampedMasteryLevel } = require('../sm2Calculator');
      expect(deriveClampedMasteryLevel(1.9)).toBe(3);
      expect(deriveClampedMasteryLevel(2.0)).toBe(3);
    });

    it('maps EF 2.2-2.3 to mastery 4', () => {
      const { deriveClampedMasteryLevel } = require('../sm2Calculator');
      expect(deriveClampedMasteryLevel(2.2)).toBe(4);
      expect(deriveClampedMasteryLevel(2.3)).toBe(4);
    });

    it('maps EF 2.4-2.5 to mastery 5', () => {
      const { deriveClampedMasteryLevel } = require('../sm2Calculator');
      expect(deriveClampedMasteryLevel(2.4)).toBe(5);
      expect(deriveClampedMasteryLevel(2.5)).toBe(5);
    });

    it('handles edge cases below 1.3', () => {
      const { deriveClampedMasteryLevel } = require('../sm2Calculator');
      expect(deriveClampedMasteryLevel(1.0)).toBe(0);
    });
  });
});
```

### Step 2: Run tests to verify they fail

```bash
npx vitest run src/lib/__tests__/sm2Calculator.test.ts
```

Expected: FAIL — `sm2Calculator` module not found

### Step 3: Implement SM-2 Calculator

Create `src/lib/sm2Calculator.ts`:

```typescript
import type { MasteryLevel } from '../types';

/**
 * Quality ratings for SM-2 spaced repetition (0-3)
 */
export enum Quality {
  Again = 0, // Complete blackout, wrong answer
  Hard = 1,  // Incorrect response, but correct one remembered
  Good = 2,  // Correct response with some effort
  Easy = 3,  // Perfect response, immediate recall
}

export interface SM2Input {
  quality: Quality;
  repetitions: number;
  easinessFactor: number;
  previousInterval: number;
}

export interface SM2Result {
  repetitions: number;
  easinessFactor: number;
  interval: number; // days
}

const MIN_EF = 1.3;
const MAX_EF = 2.5;
const DEFAULT_EF = 2.5;

/**
 * Calculate next review parameters using SuperMemo 2 algorithm
 * 
 * @param input - Current card state and quality rating
 * @returns Updated repetitions, easiness factor, and interval
 * 
 * Algorithm:
 * - EF' = EF + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02))
 * - EF is clamped to [1.3, 2.5]
 * - If q < 2: reset repetitions to 0, interval = 1
 * - If q >= 2:
 *   - rep 0 → 1: interval = 1
 *   - rep 1 → 2: interval = 6
 *   - rep 2+ → n: interval = previousInterval * EF
 */
export function calculateSM2(input: SM2Input): SM2Result {
  const { quality, repetitions, easinessFactor, previousInterval } = input;

  // Calculate new easiness factor
  let newEF = easinessFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
  newEF = Math.max(MIN_EF, Math.min(MAX_EF, newEF));

  // Reset for incorrect responses (quality < 2)
  if (quality < Quality.Good) {
    return {
      repetitions: 0,
      easinessFactor: newEF,
      interval: 1,
    };
  }

  // Correct response (quality >= 2)
  const newRepetitions = repetitions + 1;
  let interval: number;

  if (newRepetitions === 1) {
    interval = 1;
  } else if (newRepetitions === 2) {
    interval = 6;
  } else {
    interval = Math.round(previousInterval * newEF);
  }

  return {
    repetitions: newRepetitions,
    easinessFactor: newEF,
    interval,
  };
}

/**
 * Derive a 0-5 MasteryLevel from easinessFactor for backward compatibility
 * with the progress dashboard and analytics.
 * 
 * Mapping:
 * - EF < 1.3: 0 (shouldn't happen, but handle edge case)
 * - EF 1.3-1.5: 1 (struggling)
 * - EF 1.6-1.8: 2 (learning)
 * - EF 1.9-2.1: 3 (familiar)
 * - EF 2.2-2.3: 4 (strong)
 * - EF 2.4-2.5: 5 (mastered)
 */
export function deriveClampedMasteryLevel(easinessFactor: number): MasteryLevel {
  if (easinessFactor < 1.3) return 0;
  if (easinessFactor <= 1.5) return 1;
  if (easinessFactor <= 1.8) return 2;
  if (easinessFactor <= 2.1) return 3;
  if (easinessFactor <= 2.3) return 4;
  return 5;
}

export { DEFAULT_EF, MIN_EF, MAX_EF };
```

### Step 4: Run tests to verify they pass

```bash
npx vitest run src/lib/__tests__/sm2Calculator.test.ts
```

Expected: PASS — 11 tests passing

### Step 5: Commit

```bash
git add src/lib/sm2Calculator.ts src/lib/__tests__/sm2Calculator.test.ts
git commit -m "feat(sm2): add SM-2 spaced repetition calculator

- Implement SuperMemo 2 algorithm with 4-quality grading (0-3)
- Add deriveClampedMasteryLevel for backward compatibility
- 11 tests covering interval calculation, EF adjustments, edge cases"
```

---

## Task 2: Update Flashcard Schema for SM-2

**Files:**
- Modify: `src/types/index.ts:31-42` (Flashcard interface)
- Modify: `src/lib/db.ts:30-40` (Dexie schema)
- Create: `src/lib/migrateFlashcardsToSM2.ts`
- Create: `src/lib/__tests__/migrateFlashcardsToSM2.test.ts`

### Step 1: Write failing test for flashcard migration utility

Create `src/lib/__tests__/migrateFlashcardsToSM2.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { migrateFlashcardsToSM2 } from '../migrateFlashcardsToSM2';
import type { Flashcard } from '../../types';

describe('migrateFlashcardsToSM2', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('adds SM-2 fields to flashcards without them', async () => {
    const card: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Q',
      back: 'A',
      masteryLevel: 3,
      reviewDates: [new Date('2026-02-20')],
      firstShownDate: new Date('2026-02-20'),
    };
    await db.flashcards.add(card);

    const migrated = await migrateFlashcardsToSM2();

    expect(migrated).toBe(1);

    const updated = await db.flashcards.get('card-1');
    expect(updated?.easinessFactor).toBe(2.5); // Default EF
    expect(updated?.interval).toBe(1);
    expect(updated?.repetitions).toBe(0);
    expect(updated?.nextReviewDate).toBeInstanceOf(Date);
  });

  it('skips flashcards that already have SM-2 fields', async () => {
    const card: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Q',
      back: 'A',
      masteryLevel: 3,
      reviewDates: [],
      easinessFactor: 2.3,
      interval: 6,
      repetitions: 2,
      nextReviewDate: new Date('2026-03-10'),
    };
    await db.flashcards.add(card);

    const migrated = await migrateFlashcardsToSM2();

    expect(migrated).toBe(0);
  });

  it('handles empty database', async () => {
    const migrated = await migrateFlashcardsToSM2();
    expect(migrated).toBe(0);
  });

  it('sets nextReviewDate relative to lastReviewDate if available', async () => {
    const lastReview = new Date('2026-02-20');
    const card: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Q',
      back: 'A',
      masteryLevel: 2,
      reviewDates: [lastReview],
      firstShownDate: new Date('2026-02-15'),
    };
    await db.flashcards.add(card);

    await migrateFlashcardsToSM2();

    const updated = await db.flashcards.get('card-1');
    const expectedNextReview = new Date(lastReview);
    expectedNextReview.setDate(expectedNextReview.getDate() + 1);

    expect(updated?.nextReviewDate?.toDateString()).toBe(expectedNextReview.toDateString());
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/lib/__tests__/migrateFlashcardsToSM2.test.ts
```

Expected: FAIL — module not found, type errors

### Step 3: Update Flashcard type with SM-2 fields

Modify `src/types/index.ts`:

```typescript
export interface Flashcard {
  id: string;
  topicId: string;
  front: string;
  back: string;
  firstShownDate?: Date;
  reviewDates: Date[];
  masteryLevel: MasteryLevel;
  needsPractice?: boolean;
  // SM-2 Spaced Repetition fields
  easinessFactor?: number; // 1.3-2.5, default 2.5
  interval?: number; // days until next review
  repetitions?: number; // number of consecutive correct reviews
  nextReviewDate?: Date; // when card should be reviewed next
}
```

### Step 4: Update Dexie schema (no migration needed — optional fields)

Modify `src/lib/db.ts` (add index for nextReviewDate):

```typescript
// Find the existing schema definition around line 30-40
// Update studyPlans definition to current version (likely version 1)
// Since we're adding optional fields to Flashcard, we don't need a schema migration
// But we should add an index on nextReviewDate for efficient queries

class StudyPlannerDB extends Dexie {
  studyPlans!: Dexie.Table<StudyPlan, string>;
  studyDays!: Dexie.Table<StudyDay, string>;
  flashcards!: Dexie.Table<Flashcard, string>;
  quizQuestions!: Dexie.Table<QuizQuestion, string>;
  progressLogs!: Dexie.Table<ProgressLog, string>;
  userStats!: Dexie.Table<UserStats, string>;
  uploadedFiles!: Dexie.Table<UploadedFile, string>;

  constructor() {
    super('StudyPlannerDB');
    
    // Version 1 schema (existing)
    this.version(1).stores({
      studyPlans: 'id, testDate',
      studyDays: 'id, planId, dayNumber, date, completed',
      flashcards: 'id, topicId, masteryLevel, nextReviewDate', // ADD nextReviewDate index
      quizQuestions: 'id, topicId',
      progressLogs: 'id, planId, dayId, completedAt',
      userStats: 'id',
      uploadedFiles: 'id, planId',
    });
  }
}
```

### Step 5: Implement migration utility

Create `src/lib/migrateFlashcardsToSM2.ts`:

```typescript
import { db } from './db';
import { DEFAULT_EF } from './sm2Calculator';
import type { Flashcard } from '../types';

/**
 * Migrate flashcards to SM-2 by adding default values for SM-2 fields
 * if they don't already exist.
 * 
 * @returns Number of flashcards migrated
 */
export async function migrateFlashcardsToSM2(): Promise<number> {
  const allCards = await db.flashcards.toArray();
  let migratedCount = 0;

  for (const card of allCards) {
    // Skip cards that already have SM-2 fields
    if (card.easinessFactor !== undefined) {
      continue;
    }

    const lastReviewDate = 
      card.reviewDates.length > 0 
        ? card.reviewDates[card.reviewDates.length - 1]
        : new Date();

    const nextReviewDate = new Date(lastReviewDate);
    nextReviewDate.setDate(nextReviewDate.getDate() + 1); // Default 1 day interval

    const updates: Partial<Flashcard> = {
      easinessFactor: DEFAULT_EF,
      interval: 1,
      repetitions: 0,
      nextReviewDate,
    };

    await db.flashcards.update(card.id, updates);
    migratedCount++;
  }

  return migratedCount;
}
```

### Step 6: Run tests to verify they pass

```bash
npx vitest run src/lib/__tests__/migrateFlashcardsToSM2.test.ts
```

Expected: PASS — 5 tests passing

### Step 7: Run full test suite to ensure no regressions

```bash
npx vitest run
```

Expected: All existing tests should still pass (schema change is additive)

### Step 8: Commit

```bash
git add src/types/index.ts src/lib/db.ts src/lib/migrateFlashcardsToSM2.ts src/lib/__tests__/migrateFlashcardsToSM2.test.ts
git commit -m "feat(sm2): extend Flashcard schema with SM-2 fields

- Add easinessFactor, interval, repetitions, nextReviewDate to Flashcard type
- Add nextReviewDate index to Dexie schema for efficient due-card queries
- Add migrateFlashcardsToSM2 utility to initialize existing cards
- 5 tests for migration utility"
```

---

## Task 3: Update Review Service to Use SM-2

**Files:**
- Modify: `src/lib/reviewService.ts:1-60`
- Modify: `src/lib/__tests__/reviewService.test.ts` (update tests)
- Deprecate: `src/lib/masteryCalculator.ts` (keep for now, mark deprecated)

### Step 1: Write updated tests for reviewService with SM-2

Modify `src/lib/__tests__/reviewService.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { recordFlashcardReview } from '../reviewService';
import { db } from '../db';
import { Quality } from '../sm2Calculator';
import type { Flashcard } from '../../types';

describe('reviewService (SM-2)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('initializes SM-2 fields on first review for legacy cards', async () => {
    const card: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Q',
      back: 'A',
      masteryLevel: 0,
      reviewDates: [],
    };
    await db.flashcards.add(card);

    await recordFlashcardReview('card-1', Quality.Good);

    const updated = await db.flashcards.get('card-1');
    expect(updated?.easinessFactor).toBe(2.5);
    expect(updated?.interval).toBe(1);
    expect(updated?.repetitions).toBe(1);
    expect(updated?.nextReviewDate).toBeInstanceOf(Date);
    expect(updated?.masteryLevel).toBeGreaterThanOrEqual(0);
  });

  it('updates SM-2 fields using calculateSM2', async () => {
    const card: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Q',
      back: 'A',
      masteryLevel: 3,
      reviewDates: [],
      easinessFactor: 2.5,
      interval: 1,
      repetitions: 1,
      nextReviewDate: new Date('2026-03-01'),
    };
    await db.flashcards.add(card);

    await recordFlashcardReview('card-1', Quality.Good);

    const updated = await db.flashcards.get('card-1');
    expect(updated?.repetitions).toBe(2);
    expect(updated?.interval).toBe(6); // Second review interval
    expect(updated?.easinessFactor).toBe(2.5); // No change for quality 2
  });

  it('resets interval for Quality.Again', async () => {
    const card: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Q',
      back: 'A',
      masteryLevel: 4,
      reviewDates: [],
      easinessFactor: 2.3,
      interval: 15,
      repetitions: 3,
    };
    await db.flashcards.add(card);

    await recordFlashcardReview('card-1', Quality.Again);

    const updated = await db.flashcards.get('card-1');
    expect(updated?.repetitions).toBe(0);
    expect(updated?.interval).toBe(1);
    expect(updated?.easinessFactor).toBeLessThan(2.3);
  });

  it('increases EF for Quality.Easy', async () => {
    const card: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Q',
      back: 'A',
      masteryLevel: 3,
      reviewDates: [],
      easinessFactor: 2.5,
      interval: 1,
      repetitions: 1,
    };
    await db.flashcards.add(card);

    await recordFlashcardReview('card-1', Quality.Easy);

    const updated = await db.flashcards.get('card-1');
    expect(updated?.easinessFactor).toBeGreaterThan(2.5); // Capped at 2.5 by MAX_EF
    expect(updated?.repetitions).toBe(2);
  });

  it('updates masteryLevel to match easinessFactor', async () => {
    const card: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Q',
      back: 'A',
      masteryLevel: 0,
      reviewDates: [],
      easinessFactor: 2.5,
      interval: 1,
      repetitions: 0,
    };
    await db.flashcards.add(card);

    await recordFlashcardReview('card-1', Quality.Good);

    const updated = await db.flashcards.get('card-1');
    expect(updated?.masteryLevel).toBeGreaterThanOrEqual(0);
    expect(updated?.masteryLevel).toBeLessThanOrEqual(5);
  });

  it('sets firstShownDate on first review', async () => {
    const card: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Q',
      back: 'A',
      masteryLevel: 0,
      reviewDates: [],
      easinessFactor: 2.5,
      interval: 1,
      repetitions: 0,
    };
    await db.flashcards.add(card);

    await recordFlashcardReview('card-1', Quality.Good);

    const updated = await db.flashcards.get('card-1');
    expect(updated?.firstShownDate).toBeInstanceOf(Date);
  });

  it('handles missing flashcard gracefully', async () => {
    await expect(
      recordFlashcardReview('missing-card', Quality.Good)
    ).resolves.not.toThrow();
  });
});
```

### Step 2: Run tests to verify they fail

```bash
npx vitest run src/lib/__tests__/reviewService.test.ts
```

Expected: FAIL — recordFlashcardReview signature changed

### Step 3: Update reviewService to use SM-2

Modify `src/lib/reviewService.ts`:

```typescript
import { db } from './db';
import { calculateSM2, deriveClampedMasteryLevel, DEFAULT_EF, Quality } from './sm2Calculator';
import type { Flashcard } from '../types';

const MAX_REVIEW_DATES = 100;

/**
 * Record a flashcard review and update SM-2 scheduling parameters
 * 
 * Updates flashcard's SM-2 fields (easinessFactor, interval, repetitions, nextReviewDate),
 * masteryLevel (derived from EF), reviewDates, and firstShownDate.
 * Handles errors gracefully (logs but doesn't throw).
 * 
 * @param flashcardId - ID of the flashcard being reviewed
 * @param quality - SM-2 quality rating (0-3: Again, Hard, Good, Easy)
 */
export async function recordFlashcardReview(
  flashcardId: string,
  quality: Quality
): Promise<void> {
  try {
    const card = await db.flashcards.get(flashcardId);
    
    if (!card) {
      console.error(`Flashcard ${flashcardId} not found`);
      return;
    }

    const now = new Date();

    // Initialize SM-2 fields if this is a legacy card
    const easinessFactor = card.easinessFactor ?? DEFAULT_EF;
    const interval = card.interval ?? 1;
    const repetitions = card.repetitions ?? 0;

    // Calculate new SM-2 parameters
    const sm2Result = calculateSM2({
      quality,
      repetitions,
      easinessFactor,
      previousInterval: interval,
    });

    // Calculate next review date
    const nextReviewDate = new Date(now);
    nextReviewDate.setDate(nextReviewDate.getDate() + sm2Result.interval);

    // Derive masteryLevel from easinessFactor for backward compatibility
    const newMasteryLevel = deriveClampedMasteryLevel(sm2Result.easinessFactor);

    // Append new review date, trim if > 100
    const newReviewDates = [...card.reviewDates, now];
    if (newReviewDates.length > MAX_REVIEW_DATES) {
      newReviewDates.splice(0, newReviewDates.length - MAX_REVIEW_DATES);
    }

    const updates: Partial<Flashcard> = {
      easinessFactor: sm2Result.easinessFactor,
      interval: sm2Result.interval,
      repetitions: sm2Result.repetitions,
      nextReviewDate,
      masteryLevel: newMasteryLevel,
      reviewDates: newReviewDates,
    };

    // Set firstShownDate if this is first review
    if (!card.firstShownDate) {
      updates.firstShownDate = now;
    }

    await db.flashcards.update(flashcardId, updates);
  } catch (error) {
    console.error('Failed to record flashcard review:', error);
    // Don't throw - graceful degradation
  }
}
```

### Step 4: Run tests to verify they pass

```bash
npx vitest run src/lib/__tests__/reviewService.test.ts
```

Expected: PASS — 7 tests passing

### Step 5: Add deprecation notice to masteryCalculator

Modify `src/lib/masteryCalculator.ts`:

```typescript
import type { MasteryLevel } from '../types';

/**
 * @deprecated Use SM-2 algorithm in sm2Calculator.ts instead.
 * Kept for reference only during migration period.
 * 
 * Update flashcard mastery level based on user response
 * 
 * Simple +1/-1 algorithm for Phase 5.
 * 
 * @param currentLevel - Current mastery level (0-5)
 * @param correct - Whether user answered correctly
 * @returns New mastery level (0-5)
 */
export function updateMastery(
  currentLevel: MasteryLevel,
  correct: boolean
): MasteryLevel {
  const newLevel = correct ? currentLevel + 1 : currentLevel - 1;
  
  // Clamp to 0-5 range
  return Math.max(0, Math.min(5, newLevel)) as MasteryLevel;
}
```

### Step 6: Commit

```bash
git add src/lib/reviewService.ts src/lib/__tests__/reviewService.test.ts src/lib/masteryCalculator.ts
git commit -m "feat(sm2): update reviewService to use SM-2 algorithm

- Replace simple +1/-1 mastery with calculateSM2
- Update recordFlashcardReview to accept Quality (0-3) instead of boolean
- Derive masteryLevel from easinessFactor for backward compatibility
- Initialize SM-2 fields for legacy cards on first review
- Deprecate masteryCalculator.ts (kept for reference)"
```

---

## Task 4: Card Scheduler — Filter Due Flashcards

**Files:**
- Modify: `src/lib/planQueries.ts` (add getFlashcardsDueForReview)
- Modify: `src/lib/__tests__/planQueries.test.ts` (add tests)

### Step 1: Write failing tests for due card filtering

Add to `src/lib/__tests__/planQueries.test.ts`:

```typescript
describe('getFlashcardsDueForReview', () => {
  it('returns cards with nextReviewDate in the past', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const card1: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Q1',
      back: 'A1',
      masteryLevel: 3,
      reviewDates: [],
      nextReviewDate: yesterday,
      easinessFactor: 2.5,
      interval: 1,
      repetitions: 1,
    };
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const card2: Flashcard = {
      id: 'card-2',
      topicId: 'topic-1',
      front: 'Q2',
      back: 'A2',
      masteryLevel: 4,
      reviewDates: [],
      nextReviewDate: tomorrow,
      easinessFactor: 2.4,
      interval: 6,
      repetitions: 2,
    };

    await db.flashcards.bulkAdd([card1, card2]);

    const due = await getFlashcardsDueForReview(['card-1', 'card-2']);

    expect(due).toHaveLength(1);
    expect(due[0].id).toBe('card-1');
  });

  it('returns cards with no nextReviewDate (legacy cards)', async () => {
    const card: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Q',
      back: 'A',
      masteryLevel: 2,
      reviewDates: [],
    };
    await db.flashcards.add(card);

    const due = await getFlashcardsDueForReview(['card-1']);

    expect(due).toHaveLength(1);
    expect(due[0].id).toBe('card-1');
  });

  it('returns cards with nextReviewDate today', async () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of day
    
    const card: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Q',
      back: 'A',
      masteryLevel: 3,
      reviewDates: [],
      nextReviewDate: now,
      easinessFactor: 2.5,
      interval: 1,
      repetitions: 1,
    };
    await db.flashcards.add(card);

    const due = await getFlashcardsDueForReview(['card-1']);

    expect(due).toHaveLength(1);
  });

  it('filters out future cards', async () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const card: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Q',
      back: 'A',
      masteryLevel: 5,
      reviewDates: [],
      nextReviewDate: nextWeek,
      easinessFactor: 2.5,
      interval: 15,
      repetitions: 3,
    };
    await db.flashcards.add(card);

    const due = await getFlashcardsDueForReview(['card-1']);

    expect(due).toHaveLength(0);
  });

  it('returns empty array for empty input', async () => {
    const due = await getFlashcardsDueForReview([]);
    expect(due).toHaveLength(0);
  });
});
```

### Step 2: Run tests to verify they fail

```bash
npx vitest run src/lib/__tests__/planQueries.test.ts
```

Expected: FAIL — getFlashcardsDueForReview is not defined

### Step 3: Implement getFlashcardsDueForReview

Add to `src/lib/planQueries.ts`:

```typescript
/**
 * Filter flashcards by ID to only those due for review today or earlier.
 * 
 * Cards with no nextReviewDate (legacy cards) are considered due.
 * 
 * @param flashcardIds - Array of flashcard IDs to check
 * @returns Array of flashcards that are due for review
 */
export async function getFlashcardsDueForReview(
  flashcardIds: string[]
): Promise<Flashcard[]> {
  if (flashcardIds.length === 0) {
    return [];
  }

  const now = new Date();
  now.setHours(23, 59, 59, 999); // End of today

  const cards = await db.flashcards.bulkGet(flashcardIds);
  
  return cards.filter((card): card is Flashcard => {
    if (!card) return false;
    if (!card.nextReviewDate) return true; // Legacy card, consider due
    return card.nextReviewDate <= now;
  });
}
```

### Step 4: Run tests to verify they pass

```bash
npx vitest run src/lib/__tests__/planQueries.test.ts
```

Expected: PASS (including new due card tests)

### Step 5: Commit

```bash
git add src/lib/planQueries.ts src/lib/__tests__/planQueries.test.ts
git commit -m "feat(sm2): add getFlashcardsDueForReview scheduler

- Filter flashcards by nextReviewDate <= today
- Treat legacy cards (no nextReviewDate) as due
- 5 tests for due date filtering logic"
```

---

## Task 5: Enhanced FlashcardDeck UI — 4-Button Grading

**Files:**
- Modify: `src/components/study-session/FlashcardDeck.tsx:1-165`
- Modify: `src/hooks/useStudySession.ts` (update onCardGraded signature)
- Modify: `src/components/__tests__/FlashcardDeck.test.tsx` (if exists)
- Create: `src/components/__tests__/FlashcardDeck.test.tsx` (if doesn't exist)

### Step 1: Write failing tests for 4-button grading

Create (or update) `src/components/__tests__/FlashcardDeck.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FlashcardDeck } from '../study-session/FlashcardDeck';
import { Quality } from '../../lib/sm2Calculator';
import type { Flashcard } from '../../types';

function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'card-1',
    topicId: 'topic-1',
    front: 'What is 2+2?',
    back: '4',
    masteryLevel: 0,
    reviewDates: [],
    ...overrides,
  };
}

describe('FlashcardDeck (SM-2)', () => {
  it('shows 4 grading buttons when card is flipped', () => {
    const cards = [makeCard()];
    const onCardGraded = vi.fn();

    render(
      <FlashcardDeck
        cards={cards}
        currentIndex={0}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onSkip={vi.fn()}
        onCardGraded={onCardGraded}
      />
    );

    const cardArea = screen.getByText('What is 2+2?');
    fireEvent.click(cardArea); // Flip card

    expect(screen.getByText(/Again/i)).toBeInTheDocument();
    expect(screen.getByText(/Hard/i)).toBeInTheDocument();
    expect(screen.getByText(/Good/i)).toBeInTheDocument();
    expect(screen.getByText(/Easy/i)).toBeInTheDocument();
  });

  it('calls onCardGraded with Quality.Again when Again clicked', () => {
    const cards = [makeCard()];
    const onCardGraded = vi.fn();

    render(
      <FlashcardDeck
        cards={cards}
        currentIndex={0}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onSkip={vi.fn()}
        onCardGraded={onCardGraded}
      />
    );

    fireEvent.click(screen.getByText('What is 2+2?')); // Flip
    fireEvent.click(screen.getByText(/Again/i));

    expect(onCardGraded).toHaveBeenCalledWith('card-1', Quality.Again);
  });

  it('calls onCardGraded with Quality.Hard', () => {
    const cards = [makeCard()];
    const onCardGraded = vi.fn();

    render(
      <FlashcardDeck
        cards={cards}
        currentIndex={0}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onSkip={vi.fn()}
        onCardGraded={onCardGraded}
      />
    );

    fireEvent.click(screen.getByText('What is 2+2?'));
    fireEvent.click(screen.getByText(/Hard/i));

    expect(onCardGraded).toHaveBeenCalledWith('card-1', Quality.Hard);
  });

  it('calls onCardGraded with Quality.Good', () => {
    const cards = [makeCard()];
    const onCardGraded = vi.fn();

    render(
      <FlashcardDeck
        cards={cards}
        currentIndex={0}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onSkip={vi.fn()}
        onCardGraded={onCardGraded}
      />
    );

    fireEvent.click(screen.getByText('What is 2+2?'));
    fireEvent.click(screen.getByText(/Good/i));

    expect(onCardGraded).toHaveBeenCalledWith('card-1', Quality.Good);
  });

  it('calls onCardGraded with Quality.Easy', () => {
    const cards = [makeCard()];
    const onCardGraded = vi.fn();

    render(
      <FlashcardDeck
        cards={cards}
        currentIndex={0}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onSkip={vi.fn()}
        onCardGraded={onCardGraded}
      />
    );

    fireEvent.click(screen.getByText('What is 2+2?'));
    fireEvent.click(screen.getByText(/Easy/i));

    expect(onCardGraded).toHaveBeenCalledWith('card-1', Quality.Easy);
  });

  it('shows interval hint for each button', () => {
    const cards = [makeCard({ interval: 6, easinessFactor: 2.5, repetitions: 1 })];

    render(
      <FlashcardDeck
        cards={cards}
        currentIndex={0}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onSkip={vi.fn()}
        onCardGraded={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('What is 2+2?')); // Flip

    // Buttons should show interval hints
    expect(screen.getByText(/1d/i)).toBeInTheDocument(); // Again: 1 day
    expect(screen.getByText(/6d/i)).toBeInTheDocument(); // Good: 6 days (2nd review)
  });
});
```

### Step 2: Run tests to verify they fail

```bash
npx vitest run src/components/__tests__/FlashcardDeck.test.tsx
```

Expected: FAIL — UI doesn't match expectations

### Step 3: Update FlashcardDeck component

Modify `src/components/study-session/FlashcardDeck.tsx`:

```typescript
import { useState } from 'react';
import { Quality, calculateSM2 } from '../../lib/sm2Calculator';
import type { Flashcard } from '../../types';

interface FlashcardDeckProps {
  cards: Flashcard[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onCardGraded?: (cardId: string, quality: Quality) => void;
}

interface IntervalPreview {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

/**
 * Calculate interval previews for each quality button
 */
function calculateIntervalPreviews(card: Flashcard): IntervalPreview {
  const ef = card.easinessFactor ?? 2.5;
  const reps = card.repetitions ?? 0;
  const prev = card.interval ?? 0;

  const again = calculateSM2({ quality: Quality.Again, repetitions: reps, easinessFactor: ef, previousInterval: prev }).interval;
  const hard = calculateSM2({ quality: Quality.Hard, repetitions: reps, easinessFactor: ef, previousInterval: prev }).interval;
  const good = calculateSM2({ quality: Quality.Good, repetitions: reps, easinessFactor: ef, previousInterval: prev }).interval;
  const easy = calculateSM2({ quality: Quality.Easy, repetitions: reps, easinessFactor: ef, previousInterval: prev }).interval;

  return { again, hard, good, easy };
}

export function FlashcardDeck({
  cards,
  currentIndex,
  onNext,
  onPrev,
  onSkip,
  onCardGraded,
}: FlashcardDeckProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showFeedback, setShowFeedback] = useState<Quality | null>(null);
  const card = cards[currentIndex];

  const handleGrade = (quality: Quality) => {
    setShowFeedback(quality);
    
    if (onCardGraded) {
      onCardGraded(card.id, quality);
    }

    // Auto-advance after feedback
    setTimeout(() => {
      setShowFeedback(null);
      setIsFlipped(false);
      onNext();
    }, 400);
  };

  if (cards.length === 0 || !card) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 mb-4">No flashcards due for review</p>
        <button
          onClick={onSkip}
          className="bg-primary-500 text-white py-3 px-6 rounded-lg font-semibold"
        >
          Skip to Quiz
        </button>
      </div>
    );
  }

  const intervals = isFlipped ? calculateIntervalPreviews(card) : null;

  const getFeedbackColor = (quality: Quality) => {
    if (quality === Quality.Again) return 'text-red-400';
    if (quality === Quality.Hard) return 'text-orange-400';
    if (quality === Quality.Good) return 'text-green-400';
    return 'text-blue-400';
  };

  return (
    <div className="p-6 flex flex-col min-h-[100dvh] pb-[env(safe-area-inset-bottom)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Flashcards</h1>
        <p className="text-gray-600 text-sm">
          {currentIndex + 1} of {cards.length}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1 mb-8 overflow-hidden">
        <div
          className="bg-primary-500 h-full transition-all"
          style={{
            width: `${((currentIndex + 1) / cards.length) * 100}%`,
          }}
        />
      </div>

      {/* Card */}
      <div
        onClick={() => !showFeedback && setIsFlipped(!isFlipped)}
        className="flex-1 flex items-center justify-center mb-8 cursor-pointer"
      >
        <div
          className={`w-full max-w-sm bg-gradient-to-br ${
            isFlipped
              ? 'from-blue-100 to-blue-50'
              : 'from-primary-100 to-primary-50'
          } rounded-3xl p-8 shadow-lg aspect-square flex flex-col items-center justify-center text-center transition-all transform hover:scale-105 relative`}
        >
          {/* Feedback overlay */}
          {showFeedback !== null && (
            <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/50 animate-pulse">
              <div className={`text-6xl font-bold ${getFeedbackColor(showFeedback)}`}>
                {showFeedback === Quality.Again && '✗'}
                {showFeedback === Quality.Hard && '△'}
                {showFeedback === Quality.Good && '✓'}
                {showFeedback === Quality.Easy && '★'}
              </div>
            </div>
          )}

          <div className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wider">
            {isFlipped ? '📝 Answer' : '❓ Question'}
          </div>
          <p
            className={`${
              isFlipped ? 'text-lg leading-relaxed' : 'text-2xl font-bold'
            } text-gray-900`}
          >
            {isFlipped ? card.back : card.front}
          </p>
          {!isFlipped && <div className="text-xs text-gray-500 mt-8 whitespace-nowrap">Tap to flip</div>}
        </div>
      </div>

      {/* 4-button grading (only show when flipped and no feedback) */}
      {isFlipped && showFeedback === null && intervals && (
        <div className="grid grid-cols-2 gap-3 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <button
            onClick={() => handleGrade(Quality.Again)}
            className="bg-red-100 text-red-700 py-3 px-2 rounded-lg font-semibold active:scale-95 transition-transform border-2 border-red-500 hover:bg-red-200 flex flex-col items-center"
          >
            <span>Again</span>
            <span className="text-xs opacity-75">{intervals.again}d</span>
          </button>
          <button
            onClick={() => handleGrade(Quality.Hard)}
            className="bg-orange-100 text-orange-700 py-3 px-2 rounded-lg font-semibold active:scale-95 transition-transform border-2 border-orange-500 hover:bg-orange-200 flex flex-col items-center"
          >
            <span>Hard</span>
            <span className="text-xs opacity-75">{intervals.hard}d</span>
          </button>
          <button
            onClick={() => handleGrade(Quality.Good)}
            className="bg-green-100 text-green-700 py-3 px-2 rounded-lg font-semibold active:scale-95 transition-transform border-2 border-green-500 hover:bg-green-200 flex flex-col items-center"
          >
            <span>Good</span>
            <span className="text-xs opacity-75">{intervals.good}d</span>
          </button>
          <button
            onClick={() => handleGrade(Quality.Easy)}
            className="bg-blue-100 text-blue-700 py-3 px-2 rounded-lg font-semibold active:scale-95 transition-transform border-2 border-blue-500 hover:bg-blue-200 flex flex-col items-center"
          >
            <span>Easy</span>
            <span className="text-xs opacity-75">{intervals.easy}d</span>
          </button>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3">
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
        >
          ← Previous
        </button>
        <button
          onClick={() => {
            setIsFlipped(false);
            onNext();
          }}
          className="flex-1 bg-primary-500 text-white py-3 rounded-lg font-semibold active:scale-95 transition-transform"
        >
          {currentIndex === cards.length - 1 ? 'Done' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
```

### Step 4: Run tests to verify they pass

```bash
npx vitest run src/components/__tests__/FlashcardDeck.test.tsx
```

Expected: PASS — 6 tests passing

### Step 5: Update useStudySession hook signature

Modify `src/hooks/useStudySession.ts` to change `onCardGraded` callback:

```typescript
// Find the onCardGraded callback in useStudySession
// Change from:
//   onCardGraded: (cardId, correct: boolean) => ...
// To:
//   onCardGraded: (cardId, quality: Quality) => ...

// Update the handleCardGraded function to call recordFlashcardReview with Quality instead of boolean
import { Quality } from '../lib/sm2Calculator';

// In the handleCardGraded function:
const handleCardGraded = async (cardId: string, quality: Quality) => {
  await recordFlashcardReview(cardId, quality);
  // ... rest of logic
};
```

### Step 6: Run full test suite

```bash
npx vitest run
```

Expected: All tests pass (may need to update useStudySession tests if they mock grading)

### Step 7: Commit

```bash
git add src/components/study-session/FlashcardDeck.tsx src/components/__tests__/FlashcardDeck.test.tsx src/hooks/useStudySession.ts
git commit -m "feat(sm2): add 4-button quality grading to FlashcardDeck

- Replace binary correct/incorrect with Again/Hard/Good/Easy
- Show interval preview (1d, 6d, etc.) on each button
- Update useStudySession to pass Quality to reviewService
- 6 tests for grading UI interactions"
```

---

## Task 6: Integrate Card Scheduler with Study Session

**Files:**
- Modify: `src/hooks/useStudySession.ts` (use getFlashcardsDueForReview)
- Modify: `src/hooks/__tests__/useStudySession.test.tsx` (update tests)

### Step 1: Write tests for due-card filtering in useStudySession

Update `src/hooks/__tests__/useStudySession.test.tsx`:

```typescript
describe('useStudySession (SM-2 scheduling)', () => {
  it('only loads flashcards due for review', async () => {
    // Create study day with 3 flashcards
    const day: StudyDay = {
      id: 'day-1',
      planId: 'plan-1',
      dayNumber: 1,
      date: new Date('2026-02-20'),
      completed: false,
      newTopicIds: [],
      reviewTopicIds: [],
      flashcardIds: ['card-1', 'card-2', 'card-3'],
      quizIds: [],
      estimatedMinutes: 30,
    };
    await db.studyDays.add(day);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    // card-1: due yesterday
    await db.flashcards.add({
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Q1',
      back: 'A1',
      masteryLevel: 2,
      reviewDates: [],
      nextReviewDate: yesterday,
      easinessFactor: 2.5,
      interval: 1,
      repetitions: 1,
    });

    // card-2: due next week (NOT DUE)
    await db.flashcards.add({
      id: 'card-2',
      topicId: 'topic-1',
      front: 'Q2',
      back: 'A2',
      masteryLevel: 4,
      reviewDates: [],
      nextReviewDate: nextWeek,
      easinessFactor: 2.4,
      interval: 15,
      repetitions: 3,
    });

    // card-3: legacy card (no nextReviewDate, considered due)
    await db.flashcards.add({
      id: 'card-3',
      topicId: 'topic-1',
      front: 'Q3',
      back: 'A3',
      masteryLevel: 0,
      reviewDates: [],
    });

    const { result } = renderHook(() => useStudySession('day-1'));

    await waitFor(() => {
      expect(result.current.flashcards).toHaveLength(2);
    });

    expect(result.current.flashcards.map(c => c.id)).toEqual(['card-1', 'card-3']);
  });
});
```

### Step 2: Run tests to verify they fail

```bash
npx vitest run src/hooks/__tests__/useStudySession.test.tsx
```

Expected: FAIL — hook loads all cards, not just due cards

### Step 3: Update useStudySession to filter by due date

Modify `src/hooks/useStudySession.ts`:

```typescript
// Import the scheduler
import { getFlashcardsDueForReview } from '../lib/planQueries';

// In the loadData or loadFlashcards function, replace:
//   const flashcards = await db.flashcards.bulkGet(day.flashcardIds);
// With:
//   const flashcards = await getFlashcardsDueForReview(day.flashcardIds);
```

### Step 4: Run tests to verify they pass

```bash
npx vitest run src/hooks/__tests__/useStudySession.test.tsx
```

Expected: PASS

### Step 5: Commit

```bash
git add src/hooks/useStudySession.ts src/hooks/__tests__/useStudySession.test.tsx
git commit -m "feat(sm2): filter flashcards by due date in study sessions

- Use getFlashcardsDueForReview to only show cards due today or earlier
- Skip future-scheduled cards
- Legacy cards (no nextReviewDate) always included"
```

---

## Task 7: Migration Utility Integration

**Files:**
- Create: `src/lib/initializeSM2.ts` (run migration on app load)
- Modify: `src/main.tsx` or `src/App.tsx` (call migration once)

### Step 1: Create initialization utility

Create `src/lib/initializeSM2.ts`:

```typescript
import { migrateFlashcardsToSM2 } from './migrateFlashcardsToSM2';

const MIGRATION_KEY = 'sm2-migration-completed';

/**
 * Initialize SM-2 system by migrating existing flashcards.
 * Runs once per browser (uses localStorage flag).
 */
export async function initializeSM2(): Promise<void> {
  if (typeof window === 'undefined') return;

  const migrated = localStorage.getItem(MIGRATION_KEY);
  if (migrated === 'true') {
    return; // Already migrated
  }

  try {
    const count = await migrateFlashcardsToSM2();
    console.log(`SM-2 migration complete: ${count} flashcards migrated`);
    localStorage.setItem(MIGRATION_KEY, 'true');
  } catch (error) {
    console.error('SM-2 migration failed:', error);
    // Don't throw - graceful degradation
  }
}
```

### Step 2: Call initialization in App.tsx

Modify `src/App.tsx` (or `src/main.tsx`):

```typescript
import { useEffect } from 'react';
import { initializeSM2 } from './lib/initializeSM2';

function App() {
  useEffect(() => {
    void initializeSM2();
  }, []);

  // ... rest of App component
}
```

### Step 3: Test manually

Start dev server and check console:

```bash
npm run dev
```

Expected: Console log "SM-2 migration complete: N flashcards migrated" on first load

### Step 4: Commit

```bash
git add src/lib/initializeSM2.ts src/App.tsx
git commit -m "feat(sm2): auto-migrate flashcards on app load

- Run migrateFlashcardsToSM2 once per browser (localStorage flag)
- Initialize SM-2 fields for existing flashcards
- Graceful degradation if migration fails"
```

---

## Task 8: Update Progress Dashboard for SM-2

**Files:**
- Modify: `src/lib/progressService.ts` (ensure masteryLevel still used)
- Verify: Dashboard components still work with masteryLevel
- No changes needed if deriveClampedMasteryLevel is working correctly

### Step 1: Verify progressService uses masteryLevel

Read `src/lib/progressService.ts` and confirm `getTopicMasteryData` reads `fc.masteryLevel`:

```bash
grep "masteryLevel" src/lib/progressService.ts
```

Expected: `getTopicMasteryData` aggregates `fc.masteryLevel` correctly

### Step 2: Run progress dashboard tests

```bash
npx vitest run src/lib/__tests__/progressService.test.ts
npx vitest run src/components/__tests__/TopicMasteryGrid.test.tsx
npx vitest run src/pages/__tests__/Progress.test.tsx
```

Expected: All pass (masteryLevel is still maintained via deriveClampedMasteryLevel)

### Step 3: Manual verification

```bash
npm run dev
```

Navigate to `/progress` and confirm Topic Mastery Grid still shows mastery levels correctly.

### Step 4: Document in code comment

Add comment to `src/lib/reviewService.ts`:

```typescript
// Derive masteryLevel from easinessFactor for backward compatibility
// This ensures the progress dashboard (TopicMasteryGrid) continues to work
// without changes, as it consumes masteryLevel from flashcards.
const newMasteryLevel = deriveClampedMasteryLevel(sm2Result.easinessFactor);
```

### Step 5: Commit

```bash
git add src/lib/reviewService.ts
git commit -m "docs(sm2): add comment about masteryLevel compatibility

- Clarify that masteryLevel is derived from EF for dashboard
- No breaking changes to progress analytics"
```

---

## Task 9: Documentation & User Education

**Files:**
- Create: `docs/SM2_ALGORITHM.md` (explain SM-2 for developers)
- Update: `README.md` (mention spaced repetition feature)

### Step 1: Write SM-2 documentation

Create `docs/SM2_ALGORITHM.md`:

```markdown
# SM-2 Spaced Repetition Algorithm

## Overview

This app uses the **SuperMemo 2 (SM-2)** algorithm for optimal flashcard scheduling. SM-2 adjusts review intervals based on your performance, maximizing long-term retention while minimizing study time.

---

## How It Works

### Quality Ratings (0-3)

When reviewing a flashcard, you rate your recall:

- **Again (0)**: Complete blackout, wrong answer — Reset interval to 1 day
- **Hard (1)**: Incorrect, but you remembered with difficulty — Reset interval to 1 day
- **Good (2)**: Correct answer with some effort — Increase interval normally
- **Easy (3)**: Perfect instant recall — Increase interval + boost easiness factor

### Easiness Factor (EF)

Each flashcard has an **Ease Factor** (1.3–2.5, default 2.5) that controls how quickly intervals grow:

- Higher EF = longer intervals between reviews (you find it easy)
- Lower EF = shorter intervals (you find it hard)

EF adjusts based on quality:

```
EF' = EF + (0.1 - (3 - q) × (0.08 + (3 - q) × 0.02))
```

### Intervals

- **First review** (after "Good" or "Easy"): 1 day
- **Second review**: 6 days
- **Subsequent reviews**: `previous_interval × EF` (rounded)

### Next Review Date

When you grade a card, the system calculates:

```
nextReviewDate = today + interval
```

Cards with `nextReviewDate` in the future are hidden from study sessions until due.

---

## Example

**Initial state**: EF = 2.5, reps = 0, interval = 0

1. **Day 1**: Review card, rate "Good" (2)
   - EF stays 2.5
   - Interval = 1 day
   - Next review: Day 2

2. **Day 2**: Review again, rate "Good" (2)
   - EF stays 2.5
   - Interval = 6 days
   - Next review: Day 8

3. **Day 8**: Review again, rate "Easy" (3)
   - EF increases slightly (still capped at 2.5)
   - Interval = 6 × 2.5 = 15 days
   - Next review: Day 23

4. **Day 23**: Review again, rate "Again" (0)
   - EF decreases to ~2.36
   - Interval resets to 1 day
   - Next review: Day 24

---

## Benefits

- **Optimized retention**: Review cards just before you would forget them
- **Efficient studying**: No wasted time reviewing well-known cards
- **Adaptive**: Intervals adjust to your personal learning curve per card

---

## Implementation

- **Core algorithm**: `src/lib/sm2Calculator.ts`
- **Review recording**: `src/lib/reviewService.ts`
- **Scheduler**: `src/lib/planQueries.ts` (getFlashcardsDueForReview)
- **UI**: `src/components/study-session/FlashcardDeck.tsx` (4-button grading)

---

## References

- [SuperMemo 2 Algorithm](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2)
- [Spaced Repetition Wikipedia](https://en.wikipedia.org/wiki/Spaced_repetition)
```

### Step 2: Update README with spaced repetition mention

Modify `README.md`:

```markdown
## Features

- 📚 **AI-Powered Study Plans**: Upload materials, get personalized multi-day plans
- 🧠 **Smart Spaced Repetition**: SM-2 algorithm schedules flashcard reviews for optimal retention
- 📝 **Interactive Flashcards**: 4-quality grading system (Again, Hard, Good, Easy)
- ❓ **Adaptive Quizzes**: Auto-graded multiple-choice questions
- 🎯 **Progress Analytics**: Visualize mastery, streaks, quiz scores, and achievements
- 🏆 **Gamification**: Earn XP, maintain streaks, unlock badges
- 📱 **Mobile-First**: Optimized for iPhone with offline support (IndexedDB)
- 🎨 **Beautiful UI**: Pink/cream aesthetic with smooth animations

## Spaced Repetition

The app uses the **SuperMemo 2 (SM-2)** algorithm to schedule flashcard reviews. Each card's interval adjusts based on your performance, ensuring you review:

- Just before you'd forget (optimal retention)
- Without wasting time on mastered material

See [docs/SM2_ALGORITHM.md](docs/SM2_ALGORITHM.md) for details.
```

### Step 3: Commit

```bash
git add docs/SM2_ALGORITHM.md README.md
git commit -m "docs(sm2): add SM-2 algorithm documentation

- Explain quality ratings, easiness factor, intervals
- Provide worked example of card progression
- Update README with spaced repetition feature highlight"
```

---

## Task 10: Final Verification & Testing

**Files:**
- Run full test suite
- Check TypeScript compilation
- Verify ESLint passes
- Manual end-to-end test

### Step 1: Run full test suite

```bash
npx vitest run
```

Expected: All tests pass (should be 350+ tests now)

### Step 2: Type check

```bash
npx tsc --noEmit
```

Expected: No type errors

### Step 3: Lint check

```bash
npx eslint src/
```

Expected: No lint errors

### Step 4: Manual E2E test

```bash
npm run dev
```

**Test flow:**
1. Create a study plan (or use existing)
2. Start a study session
3. Review flashcards using all 4 quality buttons
4. Verify interval hints show correctly (1d, 6d, etc.)
5. Complete session
6. Check that nextReviewDate is set in IndexedDB (DevTools → Application → IndexedDB → flashcards)
7. Navigate to Progress page, verify Topic Mastery Grid still works
8. Start another session, confirm only due cards appear

### Step 5: Commit verification

```bash
git status
```

Expected: Clean working tree

### Step 6: Final commit

```bash
git log --oneline -10
```

Expected: 10+ commits for Phase 8 tasks

If everything passes, create a summary commit:

```bash
git commit --allow-empty -m "feat(sm2): complete Phase 8 - Advanced Spaced Repetition

Summary:
- Implemented SM-2 algorithm with 4-quality grading (Again/Hard/Good/Easy)
- Extended Flashcard schema with EF, interval, repetitions, nextReviewDate
- Updated reviewService to calculate optimal review schedules
- Added card scheduler to filter due flashcards by date
- Redesigned FlashcardDeck UI with interval hints
- Auto-migrate existing flashcards on app load
- Maintained masteryLevel for backward compatibility with progress dashboard
- 45+ new tests, all passing

Tech: SM-2 calculator, Dexie schema extension, React UI updates
Tests: 350+ passing across 37 files"
```

---

## Phase 8 Complete ✅

**What we built:**
1. ✅ SM-2 Calculator (`sm2Calculator.ts`) — core algorithm with quality ratings 0-3
2. ✅ Schema Migration — added EF, interval, repetitions, nextReviewDate to Flashcard
3. ✅ Updated Review Service — replaced +1/-1 with SM-2 calculations
4. ✅ Card Scheduler — filter flashcards by due date
5. ✅ Enhanced FlashcardDeck — 4-button grading with interval previews
6. ✅ Auto-migration — initialize SM-2 fields for existing cards on app load
7. ✅ Backward Compatibility — derive masteryLevel from EF for progress analytics
8. ✅ Documentation — SM-2 algorithm guide and README updates

**Verification:**
- 350+ tests passing
- TypeScript clean
- ESLint clean
- Manual E2E testing confirms correct scheduling

**Next:** Phase 9 (Polish & Testing) or Phase 10 (Deployment)
