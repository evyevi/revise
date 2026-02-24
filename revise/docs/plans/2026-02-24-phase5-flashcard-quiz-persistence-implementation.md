# Phase 5: Flashcard Mastery & Quiz Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build service layer for flashcard mastery tracking and quiz result persistence with clean separation of concerns.

**Architecture:** Three testable services (MasteryCalculator, ReviewService, QuizGrader) sit between UI components and IndexedDB, handling grading logic and persistence. UI hooks call services, services update DB asynchronously without blocking user interactions.

**Tech Stack:** TypeScript, Dexie.js (IndexedDB), Vitest, React Testing Library

---

## Phase 5 Task List

- Task 1: Add new types (FlashcardResponse, QuizAttempt, MasteryLevel)
- Task 2: Implement MasteryCalculator service
- Task 3: Implement ReviewService
- Task 4: Implement QuizGrader service
- Task 5: Update FlashcardDeck component with grading buttons
- Task 6: Update useStudySession hook with service integration
- Task 7: Enhance QuizScreen with score display
- Task 8: Integration testing and manual verification

---

## Task 1: Add New Types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add FlashcardResponse, QuizAttempt, and MasteryLevel types**

Add to `src/types/index.ts`:

```typescript
// Existing types above...

export interface FlashcardResponse {
  flashcardId: string;
  correct: boolean;
  responseTime: Date;
}

export interface QuizAttempt {
  questionId: string;
  selectedAnswer: number;
  correct: boolean;
  timeSpent?: number;
}

export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;
```

**Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add FlashcardResponse, QuizAttempt, and MasteryLevel types"
```

---

## Task 2: Implement MasteryCalculator Service

**Files:**
- Create: `src/lib/masteryCalculator.ts`
- Create: `src/lib/__tests__/masteryCalculator.test.ts`

**Step 1: Write MasteryCalculator tests**

Create `src/lib/__tests__/masteryCalculator.test.ts`:

```typescript
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
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- masteryCalculator`  
Expected: FAIL - "Cannot find module '../masteryCalculator'"

**Step 3: Implement MasteryCalculator**

Create `src/lib/masteryCalculator.ts`:

```typescript
import type { MasteryLevel } from '../types';

/**
 * Update flashcard mastery level based on user response
 * 
 * Simple +1/-1 algorithm for Phase 5.
 * Future: Replace with SM-2 or custom adaptive algorithm.
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

**Step 4: Run tests to verify they pass**

Run: `npm test -- masteryCalculator`  
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/masteryCalculator.ts src/lib/__tests__/masteryCalculator.test.ts
git commit -m "feat: add MasteryCalculator with simple +1/-1 algorithm"
```

---

## Task 3: Implement ReviewService

**Files:**
- Create: `src/lib/reviewService.ts`
- Create: `src/lib/__tests__/reviewService.test.ts`

**Step 1: Write ReviewService tests**

Create `src/lib/__tests__/reviewService.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recordFlashcardReview } from '../reviewService';
import { db } from '../db';
import type { Flashcard } from '../../types';

// Mock the db
vi.mock('../db', () => ({
  db: {
    flashcards: {
      get: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('recordFlashcardReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates mastery level on correct answer', async () => {
    const mockCard: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 2,
      reviewDates: [],
      firstShownDate: new Date('2026-02-01'),
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockResolvedValue(1);

    await recordFlashcardReview('card-1', true);

    expect(db.flashcards.update).toHaveBeenCalledWith(
      'card-1',
      expect.objectContaining({
        masteryLevel: 3,
      })
    );
  });

  it('updates mastery level on incorrect answer', async () => {
    const mockCard: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 3,
      reviewDates: [],
      firstShownDate: new Date('2026-02-01'),
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockResolvedValue(1);

    await recordFlashcardReview('card-1', false);

    expect(db.flashcards.update).toHaveBeenCalledWith(
      'card-1',
      expect.objectContaining({
        masteryLevel: 2,
      })
    );
  });

  it('appends review date to reviewDates array', async () => {
    const existingDate = new Date('2026-02-20');
    const mockCard: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 1,
      reviewDates: [existingDate],
      firstShownDate: new Date('2026-02-01'),
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockResolvedValue(1);

    await recordFlashcardReview('card-1', true);

    const updateCall = vi.mocked(db.flashcards.update).mock.calls[0];
    const updateData = updateCall[1] as Partial<Flashcard>;
    
    expect(updateData.reviewDates).toHaveLength(2);
    expect(updateData.reviewDates![0]).toEqual(existingDate);
    expect(updateData.reviewDates![1]).toBeInstanceOf(Date);
  });

  it('sets firstShownDate on first review', async () => {
    const mockCard: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 0,
      reviewDates: [],
      firstShownDate: undefined,
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockResolvedValue(1);

    await recordFlashcardReview('card-1', true);

    expect(db.flashcards.update).toHaveBeenCalledWith(
      'card-1',
      expect.objectContaining({
        firstShownDate: expect.any(Date),
      })
    );
  });

  it('handles missing flashcard gracefully', async () => {
    vi.mocked(db.flashcards.get).mockResolvedValue(undefined);

    // Should not throw
    await expect(recordFlashcardReview('missing-card', true)).resolves.toBeUndefined();
    
    expect(db.flashcards.update).not.toHaveBeenCalled();
  });

  it('handles database errors gracefully', async () => {
    const mockCard: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 2,
      reviewDates: [],
      firstShownDate: new Date('2026-02-01'),
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockRejectedValue(new Error('DB error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Should not throw
    await expect(recordFlashcardReview('card-1', true)).resolves.toBeUndefined();
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('trims reviewDates array if exceeds 100 entries', async () => {
    const manyDates = Array.from({ length: 105 }, (_, i) => 
      new Date(2026, 0, i + 1)
    );
    
    const mockCard: Flashcard = {
      id: 'card-1',
      topicId: 'topic-1',
      front: 'Question',
      back: 'Answer',
      masteryLevel: 4,
      reviewDates: manyDates,
      firstShownDate: new Date('2026-01-01'),
    };

    vi.mocked(db.flashcards.get).mockResolvedValue(mockCard);
    vi.mocked(db.flashcards.update).mockResolvedValue(1);

    await recordFlashcardReview('card-1', true);

    const updateCall = vi.mocked(db.flashcards.update).mock.calls[0];
    const updateData = updateCall[1] as Partial<Flashcard>;
    
    // Should keep last 100 + new one = 100 total (trim 6 oldest)
    expect(updateData.reviewDates).toHaveLength(100);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- reviewService`  
Expected: FAIL - "Cannot find module '../reviewService'"

**Step 3: Implement ReviewService**

Create `src/lib/reviewService.ts`:

```typescript
import { db } from './db';
import { updateMastery } from './masteryCalculator';
import type { Flashcard, MasteryLevel } from '../types';

const MAX_REVIEW_DATES = 100;

/**
 * Record a flashcard review and update mastery level
 * 
 * Updates flashcard's masteryLevel, reviewDates, and firstShownDate.
 * Handles errors gracefully (logs but doesn't throw).
 * 
 * @param flashcardId - ID of the flashcard being reviewed
 * @param correct - Whether user answered correctly
 */
export async function recordFlashcardReview(
  flashcardId: string,
  correct: boolean
): Promise<void> {
  try {
    const card = await db.flashcards.get(flashcardId);
    
    if (!card) {
      console.error(`Flashcard ${flashcardId} not found`);
      return;
    }

    const now = new Date();
    const newMasteryLevel = updateMastery(card.masteryLevel as MasteryLevel, correct);
    
    // Append new review date, trim if > 100
    const newReviewDates = [...card.reviewDates, now];
    if (newReviewDates.length > MAX_REVIEW_DATES) {
      newReviewDates.splice(0, newReviewDates.length - MAX_REVIEW_DATES);
    }

    const updates: Partial<Flashcard> = {
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

**Step 4: Run tests to verify they pass**

Run: `npm test -- reviewService`  
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/reviewService.ts src/lib/__tests__/reviewService.test.ts
git commit -m "feat: add ReviewService for flashcard mastery tracking"
```

---

## Task 4: Implement QuizGrader Service

**Files:**
- Create: `src/lib/quizGrader.ts`
- Create: `src/lib/__tests__/quizGrader.test.ts`

**Step 1: Write QuizGrader tests**

Create `src/lib/__tests__/quizGrader.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateQuizScore, saveQuizResults } from '../quizGrader';
import { db } from '../db';
import type { QuizAttempt } from '../../types';

vi.mock('../db', () => ({
  db: {
    progressLogs: {
      add: vi.fn(),
    },
  },
}));

describe('calculateQuizScore', () => {
  it('returns 100 for all correct answers', () => {
    const attempts: QuizAttempt[] = [
      { questionId: 'q1', selectedAnswer: 0, correct: true },
      { questionId: 'q2', selectedAnswer: 1, correct: true },
      { questionId: 'q3', selectedAnswer: 2, correct: true },
    ];

    expect(calculateQuizScore(attempts)).toBe(100);
  });

  it('returns 0 for all incorrect answers', () => {
    const attempts: QuizAttempt[] = [
      { questionId: 'q1', selectedAnswer: 0, correct: false },
      { questionId: 'q2', selectedAnswer: 1, correct: false },
      { questionId: 'q3', selectedAnswer: 2, correct: false },
    ];

    expect(calculateQuizScore(attempts)).toBe(0);
  });

  it('calculates mixed score correctly', () => {
    const attempts: QuizAttempt[] = [
      { questionId: 'q1', selectedAnswer: 0, correct: true },
      { questionId: 'q2', selectedAnswer: 1, correct: false },
      { questionId: 'q3', selectedAnswer: 2, correct: true },
      { questionId: 'q4', selectedAnswer: 0, correct: false },
    ];

    // 2/4 = 50%
    expect(calculateQuizScore(attempts)).toBe(50);
  });

  it('rounds score to nearest integer', () => {
    const attempts: QuizAttempt[] = [
      { questionId: 'q1', selectedAnswer: 0, correct: true },
      { questionId: 'q2', selectedAnswer: 1, correct: false },
      { questionId: 'q3', selectedAnswer: 2, correct: false },
    ];

    // 1/3 = 33.333... -> 33
    expect(calculateQuizScore(attempts)).toBe(33);
  });

  it('returns 0 for empty attempts', () => {
    expect(calculateQuizScore([])).toBe(0);
  });
});

describe('saveQuizResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves quiz results to database', async () => {
    const attempts: QuizAttempt[] = [
      { questionId: 'q1', selectedAnswer: 0, correct: true },
      { questionId: 'q2', selectedAnswer: 1, correct: true },
    ];

    vi.mocked(db.progressLogs.add).mockResolvedValue('log-1');

    const result = await saveQuizResults('plan-1', 'day-1', attempts, 10, 50);

    expect(db.progressLogs.add).toHaveBeenCalledWith({
      id: expect.any(String),
      planId: 'plan-1',
      dayId: 'day-1',
      completedAt: expect.any(Date),
      xpEarned: 50,
      quizScore: 100,
      flashcardsReviewed: 10,
    });

    expect(result).toMatchObject({
      planId: 'plan-1',
      dayId: 'day-1',
      quizScore: 100,
      flashcardsReviewed: 10,
      xpEarned: 50,
    });
  });

  it('handles database errors gracefully', async () => {
    const attempts: QuizAttempt[] = [
      { questionId: 'q1', selectedAnswer: 0, correct: true },
    ];

    vi.mocked(db.progressLogs.add).mockRejectedValue(new Error('DB error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      saveQuizResults('plan-1', 'day-1', attempts, 5, 20)
    ).rejects.toThrow('DB error');

    consoleSpy.mockRestore();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- quizGrader`  
Expected: FAIL - "Cannot find module '../quizGrader'"

**Step 3: Implement QuizGrader**

Create `src/lib/quizGrader.ts`:

```typescript
import { db } from './db';
import type { QuizAttempt, ProgressLog } from '../types';

/**
 * Calculate quiz score as percentage (0-100)
 * 
 * @param attempts - Array of quiz attempts with correct/incorrect flags
 * @returns Score as integer percentage (0-100)
 */
export function calculateQuizScore(attempts: QuizAttempt[]): number {
  if (attempts.length === 0) {
    return 0;
  }

  const correctCount = attempts.filter((a) => a.correct).length;
  const percentage = (correctCount / attempts.length) * 100;
  
  return Math.round(percentage);
}

/**
 * Save quiz results to progress logs
 * 
 * @param planId - Study plan ID
 * @param dayId - Study day ID
 * @param attempts - Quiz attempts from session
 * @param flashcardsReviewed - Number of flashcards reviewed in session
 * @param xpEarned - Total XP earned in session
 * @returns Created ProgressLog entry
 */
export async function saveQuizResults(
  planId: string,
  dayId: string,
  attempts: QuizAttempt[],
  flashcardsReviewed: number,
  xpEarned: number
): Promise<ProgressLog> {
  const quizScore = calculateQuizScore(attempts);
  
  const progressLog: ProgressLog = {
    id: crypto.randomUUID(),
    planId,
    dayId,
    completedAt: new Date(),
    xpEarned,
    quizScore,
    flashcardsReviewed,
  };

  try {
    await db.progressLogs.add(progressLog);
    return progressLog;
  } catch (error) {
    console.error('Failed to save quiz results:', error);
    throw error; // Throw here since this is critical for session completion
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- quizGrader`  
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/quizGrader.ts src/lib/__tests__/quizGrader.test.ts
git commit -m "feat: add QuizGrader for scoring and persistence"
```

---

## Task 5: Update FlashcardDeck Component

**Files:**
- Modify: `src/components/study-session/FlashcardDeck.tsx`

**Step 1: Add grading buttons and onCardGraded prop**

Update `src/components/study-session/FlashcardDeck.tsx`:

```typescript
import { useState } from 'react';
import type { Flashcard } from '../../types';

interface FlashcardDeckProps {
  cards: Flashcard[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onCardGraded?: (cardId: string, correct: boolean) => void;
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
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const card = cards[currentIndex];

  if (cards.length === 0 || !card) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 mb-4">No flashcards for today</p>
        <button
          onClick={onSkip}
          className="bg-primary-500 text-white py-3 px-6 rounded-lg font-semibold"
        >
          Skip to Quiz
        </button>
      </div>
    );
  }

  const handleGrade = (correct: boolean) => {
    setShowFeedback(correct ? 'correct' : 'incorrect');
    
    // Call grading callback
    if (onCardGraded) {
      onCardGraded(card.id, correct);
    }

    // Auto-advance after brief feedback
    setTimeout(() => {
      setShowFeedback(null);
      setIsFlipped(false);
      onNext();
    }, 300);
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
          {showFeedback && (
            <div className="absolute inset-0 bg-white bg-opacity-90 rounded-3xl flex items-center justify-center">
              <div className="text-6xl">
                {showFeedback === 'correct' ? '✓' : '✗'}
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
          {!showFeedback && (
            <div className="text-xs text-gray-500 mt-8">
              {isFlipped ? 'How did you do?' : 'Tap to flip'}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {!isFlipped && !showFeedback && (
        <div className="space-y-3">
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
              disabled={currentIndex === cards.length - 1}
              className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Grading buttons (only show when flipped) */}
      {isFlipped && !showFeedback && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <button
              onClick={() => handleGrade(false)}
              className="flex-1 bg-red-100 text-red-700 py-4 rounded-lg font-semibold active:scale-95 transition-transform border-2 border-red-300"
            >
              Need Review ✗
            </button>
            <button
              onClick={() => handleGrade(true)}
              className="flex-1 bg-green-100 text-green-700 py-4 rounded-lg font-semibold active:scale-95 transition-transform border-2 border-green-300"
            >
              Got it! ✓
            </button>
          </div>
        </div>
      )}

      {/* Skip button at bottom */}
      {currentIndex === cards.length - 1 && !showFeedback && (
        <button
          onClick={onSkip}
          className="mt-4 w-full bg-primary-500 text-white py-3 rounded-lg font-semibold"
        >
          Continue to Quiz →
        </button>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/study-session/FlashcardDeck.tsx
git commit -m "feat: add grading buttons to FlashcardDeck with feedback animation"
```

---

## Task 6: Update useStudySession Hook

**Files:**
- Modify: `src/hooks/useStudySession.ts`

**Step 1: Add service imports and gradeFlashcard handler**

Update `src/hooks/useStudySession.ts` to add:

```typescript
import { recordFlashcardReview } from '../lib/reviewService';
import { calculateQuizScore, saveQuizResults } from '../lib/quizGrader';
import type { QuizAttempt } from '../types';

// In the reducer state, add:
type SessionState = {
  // ... existing fields
  flashcardsReviewed: number;
  quizAttempts: QuizAttempt[];
};

// Update getInitialState to include:
function getInitialState(): SessionState {
  return {
    // ... existing fields
    flashcardsReviewed: 0,
    quizAttempts: [],
  };
}

// Add new action types:
type SessionAction =
  | // ... existing actions
  | { type: 'GRADE_FLASHCARD' }
  | { type: 'RECORD_QUIZ_ATTEMPT'; payload: QuizAttempt };

// In reducer, add cases:
case 'GRADE_FLASHCARD':
  return {
    ...state,
    flashcardsReviewed: state.flashcardsReviewed + 1,
  };

case 'RECORD_QUIZ_ATTEMPT':
  return {
    ...state,
    quizAttempts: [...state.quizAttempts, action.payload],
  };

// In the hook, add handlers:
const gradeFlashcard = useCallback(async (cardId: string, correct: boolean) => {
  await recordFlashcardReview(cardId, correct);
  dispatch({ type: 'GRADE_FLASHCARD' });
}, []);

const answerQuiz = useCallback((quizIndex: number, answerIndex: number) => {
  const quiz = state.quizzes[quizIndex];
  if (!quiz) return;

  const newAnswers = new Map(state.quizAnswers);
  newAnswers.set(quiz.id, answerIndex);

  // Record attempt
  const attempt: QuizAttempt = {
    questionId: quiz.id,
    selectedAnswer: answerIndex,
    correct: answerIndex === quiz.correctAnswerIndex,
  };

  dispatch({ type: 'ANSWER_QUIZ', payload: { quizIndex, answerIndex } });
  dispatch({ type: 'RECORD_QUIZ_ATTEMPT', payload: attempt });
}, [state.quizzes, state.quizAnswers]);

const completeSession = useCallback(async () => {
  if (!state.studyDay) return;

  try {
    // Calculate XP: (quiz score / 10) + (cards reviewed * 2)
    const quizScore = calculateQuizScore(state.quizAttempts);
    const xpEarned = Math.floor(quizScore / 10) + (state.flashcardsReviewed * 2);

    // Save quiz results
    await saveQuizResults(
      state.studyDay.planId,
      state.studyDay.id,
      state.quizAttempts,
      state.flashcardsReviewed,
      xpEarned
    );

    // Mark day as complete
    await db.studyDays.update(state.studyDay.id, {
      completed: true,
    });

    // Update user stats
    const stats = await db.userStats.get('default');
    if (stats) {
      await db.userStats.update('default', {
        totalXP: stats.totalXP + xpEarned,
        lastStudyDate: new Date(),
      });
    }

    dispatch({ type: 'COMPLETE_SESSION', payload: xpEarned });
  } catch (error) {
    console.error('Failed to complete session:', error);
    // Still show completion screen even if save failed
    dispatch({ type: 'COMPLETE_SESSION', payload: 0 });
  }
}, [state.studyDay, state.quizAttempts, state.flashcardsReviewed]);

// Return updated values:
return {
  ...state,
  gradeFlashcard,
  answerQuiz,
  completeSession,
  // ... other methods
};
```

**Step 2: Commit**

```bash
git add src/hooks/useStudySession.ts
git commit -m "feat: integrate ReviewService and QuizGrader in useStudySession"
```

---

## Task 7: Enhance QuizScreen Component

**Files:**
- Modify: `src/components/study-session/QuizScreen.tsx`

**Step 1: Add score display after quiz completion**

Update `src/components/study-session/QuizScreen.tsx`:

Add after the quiz options section (around line 120):

```typescript
// After all options, show explanation if answered
{selectedAnswer !== undefined && (
  <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
    <p className="text-sm font-semibold text-blue-900 mb-2">Explanation:</p>
    <p className="text-sm text-blue-800">{quiz.explanation}</p>
  </div>
)}

// Add score summary at bottom (only show on last quiz after answering)
{currentIndex === quizzes.length - 1 && selectedAnswer !== undefined && (
  <div className="mt-8 p-6 bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl">
    <h3 className="text-lg font-bold mb-2">Quiz Complete!</h3>
    <p className="text-gray-700">
      Score: {Math.round((Array.from(answers.values()).filter((ans, idx) => 
        ans === quizzes[idx]?.correctAnswerIndex
      ).length / quizzes.length) * 100)}%
    </p>
    <p className="text-sm text-gray-600 mt-1">
      {Array.from(answers.values()).filter((ans, idx) => 
        ans === quizzes[idx]?.correctAnswerIndex
      ).length} out of {quizzes.length} correct
    </p>
  </div>
)}
```

**Step 2: Commit**

```bash
git add src/components/study-session/QuizScreen.tsx
git commit -m "feat: add explanation display and score summary to QuizScreen"
```

---

## Task 8: Integration Testing and Verification

**Files:**
- Modify: `src/hooks/__tests__/useStudySession.test.ts`
- Manual testing checklist

**Step 1: Add integration tests for useStudySession**

Add to `src/hooks/__tests__/useStudySession.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStudySession } from '../useStudySession';
import * as reviewService from '../../lib/reviewService';
import * as quizGrader from '../../lib/quizGrader';

vi.mock('../../lib/reviewService');
vi.mock('../../lib/quizGrader');
vi.mock('../../lib/db');

describe('useStudySession - Phase 5 integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls recordFlashcardReview when grading a card', async () => {
    const recordSpy = vi.spyOn(reviewService, 'recordFlashcardReview')
      .mockResolvedValue();

    const { result } = renderHook(() => useStudySession('test-plan'));

    await act(async () => {
      await result.current.gradeFlashcard('card-1', true);
    });

    expect(recordSpy).toHaveBeenCalledWith('card-1', true);
    expect(result.current.flashcardsReviewed).toBe(1);
  });

  it('records quiz attempts when answering questions', async () => {
    // Mock quiz state
    const { result } = renderHook(() => useStudySession('test-plan'));

    // Simulate quiz answers
    act(() => {
      result.current.answerQuiz(0, 2);
    });

    expect(result.current.quizAttempts).toHaveLength(1);
    expect(result.current.quizAttempts[0]).toMatchObject({
      selectedAnswer: 2,
    });
  });

  it('calculates XP and saves results on session completion', async () => {
    const saveSpy = vi.spyOn(quizGrader, 'saveQuizResults')
      .mockResolvedValue({
        id: 'log-1',
        planId: 'plan-1',
        dayId: 'day-1',
        completedAt: new Date(),
        xpEarned: 30,
        quizScore: 80,
        flashcardsReviewed: 5,
      });

    const { result } = renderHook(() => useStudySession('test-plan'));

    // Simulate session activity
    await act(async () => {
      await result.current.gradeFlashcard('card-1', true);
      await result.current.gradeFlashcard('card-2', true);
      result.current.answerQuiz(0, 1); // correct
      result.current.answerQuiz(1, 0); // correct
      await result.current.completeSession();
    });

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
      expect(result.current.step).toBe('completion');
    });
  });
});
```

**Step 2: Run all tests**

Run: `npm test`  
Expected: All tests PASS (142+ tests)

**Step 3: Manual testing checklist**

Test the following in browser with DevTools → Application → IndexedDB open:

1. Start a study session
2. Review 5 flashcards, mix of "Got it" and "Need review"
3. Check IndexedDB → flashcards:
   - [ ] masteryLevel values updated (some increased, some decreased)
   - [ ] reviewDates arrays have new entries
   - [ ] firstShownDate set on first-time cards
4. Complete quiz with 3/5 correct answers
5. Check IndexedDB → progressLogs:
   - [ ] New entry with quizScore = 60
   - [ ] flashcardsReviewed = 5
   - [ ] xpEarned calculated correctly (60/10 + 5*2 = 16 XP)
6. Check IndexedDB → userStats:
   - [ ] totalXP increased by 16
   - [ ] lastStudyDate updated
7. Check IndexedDB → studyDays:
   - [ ] Today's day marked as completed = true

**Step 4: Check console for errors**

Open browser console, replay session:
- [ ] No unhandled promise rejections
- [ ] No "cannot read property" errors
- [ ] Failed writes logged to console (if any)

**Step 5: Final commit**

```bash
git add src/hooks/__tests__/useStudySession.test.ts
git commit -m "test: add integration tests for Phase 5 mastery tracking"
```

---

## Phase 5 Complete!

Acceptance criteria:
- ✅ Flashcard grading updates masteryLevel in DB
- ✅ Quiz scores persist to progressLogs
- ✅ XP calculation includes quiz performance + cards reviewed
- ✅ All unit tests pass (service layer)
- ✅ Integration tests pass (hook layer)
- ✅ Manual testing checklist completed
- ✅ No UI blocking on DB errors
- ✅ Graceful error handling with console logging

**Next steps:**
- Phase 6: Gamification System (badges, streak tracking, animations)
- Phase 7: Progress Dashboard & Analytics
- Phase 8: Advanced Spaced Repetition (SM-2 algorithm)
