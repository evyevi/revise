# Phase 5: Flashcard Mastery & Quiz Persistence - Design

**Date:** February 24, 2026  
**Status:** Approved  
**Goal:** Add flashcard mastery tracking and quiz result persistence with a scalable service layer.

---

## Overview

Phase 5 enhances the study session experience by:
- Tracking flashcard mastery levels (0-5 scale) based on user responses
- Persisting quiz scores to IndexedDB for progress tracking
- Building a service layer that can evolve into advanced spaced repetition algorithms

**Key principle:** Design for future scalability while keeping Phase 5 implementation minimal.

---

## Architecture

```
UI Components (FlashcardDeck, QuizScreen)
    ↓
useStudySession hook (orchestrates session flow)
    ↓
Service Layer:
  - ReviewService (grades flashcard responses, updates mastery)
  - QuizGrader (scores quiz answers, creates ProgressLogs)
  - MasteryCalculator (computes masteryLevel 0-5)
    ↓
IndexedDB (via Dexie)
  - flashcards table (masteryLevel, reviewDates)
  - progressLogs table (quiz scores, completion data)
```

**Design principles:**
- **Single Responsibility**: Each service has one clear job
- **Testability**: Services are pure functions or simple async wrappers
- **Extensibility**: Easy to swap MasteryCalculator algorithm later (SM-2, Leitner, etc.)
- **Performance**: Async writes don't block UI; failures logged but don't crash session
- **Modularity**: Service layer independent of UI components

---

## Data Model

### New Types

```typescript
// Flashcard response (user's answer to a card)
export interface FlashcardResponse {
  flashcardId: string;
  correct: boolean;
  responseTime: Date;
}

// Quiz attempt (complete quiz session)
export interface QuizAttempt {
  questionId: string;
  selectedAnswer: number;
  correct: boolean;
  timeSpent?: number; // optional for Phase 5
}

// Mastery levels (0-5 scale)
export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;
// 0 = new, 1-2 = learning, 3-4 = familiar, 5 = mastered
```

### Updates to Existing Types

```typescript
// Flashcard - fields already exist, just need to populate them
interface Flashcard {
  masteryLevel: number;      // ✓ exists, starts at 0
  reviewDates: Date[];       // ✓ exists, append on each review
  firstShownDate?: Date;     // ✓ exists, set on first view
}

// ProgressLog - already exists, will use for quiz scores
interface ProgressLog {
  quizScore: number;              // ✓ exists (0-100 percentage)
  flashcardsReviewed: number;     // ✓ exists (count)
}
```

**No schema migration needed** - all fields already exist in current schema.

### Validation Rules

- `masteryLevel`: Integer 0-5 (clamped)
- `quizScore`: Percentage 0-100
- `reviewDates`: Chronological array, max 100 entries (trim oldest if exceeded)

---

## Service Layer

### 1. ReviewService (`src/lib/reviewService.ts`)

Handles flashcard response grading and persistence.

**Core function:**
```typescript
async function recordFlashcardReview(
  flashcardId: string,
  correct: boolean
): Promise<void>
```

**Implementation steps:**
1. Fetch current flashcard from DB
2. Call `MasteryCalculator.updateMastery(currentLevel, correct)`
3. Append `new Date()` to `reviewDates` array
4. Set `firstShownDate` if undefined
5. Update flashcard in DB with new mastery and dates
6. Log errors to console but don't throw (non-blocking for UX)

**Error handling:** Try-catch wrapper, graceful degradation if DB write fails.

---

### 2. QuizGrader (`src/lib/quizGrader.ts`)

Calculates quiz scores and creates progress log entries.

**Core functions:**
```typescript
function calculateQuizScore(attempts: QuizAttempt[]): number

async function saveQuizResults(
  planId: string,
  dayId: string,
  attempts: QuizAttempt[]
): Promise<ProgressLog>
```

**Implementation steps:**
1. Calculate score: `(correctCount / totalCount) * 100`
2. Create `ProgressLog` entry with:
   - `planId`, `dayId`
   - `quizScore` (0-100)
   - `flashcardsReviewed` (count from session)
   - `completedAt` (current timestamp)
   - `xpEarned` (calculated by caller)
3. Insert into `progressLogs` table
4. Return the created log

**XP Calculation:** Handled by caller (useStudySession hook):
- Formula: `(quizScore / 10) + (flashcardsReviewed * 2)`
- Example: 80% quiz + 10 cards = 8 + 20 = 28 XP

---

### 3. MasteryCalculator (`src/lib/masteryCalculator.ts`)

Pure function for mastery level computation. No database access.

**Core function:**
```typescript
function updateMastery(
  currentLevel: MasteryLevel,
  correct: boolean
): MasteryLevel
```

**Phase 5 Algorithm (Simple):**
- Correct answer: `currentLevel + 1` (max 5)
- Incorrect answer: `currentLevel - 1` (min 0)

**Future Evolution:**
- Phase 6+: Replace with SM-2 spaced repetition algorithm
- Or implement Leitner system with review intervals
- Or use adaptive learning curves based on user performance

**Why separate this?** Makes it trivial to A/B test different algorithms or swap implementations without touching UI or persistence code.

---

## UI Integration

### FlashcardDeck Component Updates

**New visual elements:**
- Add "Got it! ✓" and "Need review ✗" buttons below card
- Brief feedback animation on button press (300ms checkmark/X)
- Auto-advance to next card after grading

**New props:**
```typescript
interface FlashcardDeckProps {
  onCardGraded?: (cardId: string, correct: boolean) => void;
  // ... existing props
}
```

**Behavior:**
1. User taps "Got it!" or "Need review"
2. Show feedback icon (✓ or ✗)
3. Call `onCardGraded(card.id, true/false)`
4. Auto-advance to next card after 300ms
5. If last card, advance to quiz step

**No complex gestures yet** - simple tap/click for Phase 5.

---

### QuizScreen Component Updates

**Already implemented:**
- Answer selection with Map storage
- Immediate feedback (green/red borders)
- Correct answer highlighting

**Additions:**
- Display explanation text below each question after answering
- Show final score at bottom after all answered
- "Continue" button triggers session completion

**No changes to core quiz logic** - just enhance feedback display.

---

### useStudySession Hook Updates

Add two new handler functions:

```typescript
const gradeFlashcard = async (cardId: string, correct: boolean) => {
  await recordFlashcardReview(cardId, correct);
  // Non-blocking - UI continues even if write fails
};

const completeSession = async () => {
  // 1. Collect quiz attempts from state
  // 2. Calculate score via QuizGrader.calculateQuizScore()
  // 3. Save results via QuizGrader.saveQuizResults()
  // 4. Calculate total XP
  // 5. Mark studyDay as complete in DB
  // 6. Update userStats (totalXP, streak)
  // 7. Transition to completion screen with XP display
};
```

**State additions:**
- Track `flashcardsReviewed` count
- Store quiz attempts as `QuizAttempt[]` for grading

---

## Testing Strategy

### Unit Tests

**MasteryCalculator tests** (`src/lib/__tests__/masteryCalculator.test.ts`):
- ✓ Correct answer increases level by 1
- ✓ Incorrect answer decreases level by 1
- ✓ Level clamped to 0-5 bounds
- ✓ Edge cases (0→correct, 5→incorrect)

**QuizGrader tests** (`src/lib/__tests__/quizGrader.test.ts`):
- ✓ All correct = 100 score
- ✓ All incorrect = 0 score
- ✓ Mixed answers calculated correctly
- ✓ saveQuizResults creates ProgressLog with all fields

**ReviewService tests** (`src/lib/__tests__/reviewService.test.ts`):
- ✓ Updates masteryLevel correctly
- ✓ Appends to reviewDates array
- ✓ Sets firstShownDate on first review
- ✓ Handles DB errors gracefully (no throw)
- ✓ Trims reviewDates if > 100 entries

### Integration Tests

**useStudySession hook tests** (`src/hooks/__tests__/useStudySession.test.ts`):
- ✓ gradeFlashcard calls ReviewService
- ✓ completeSession saves quiz results
- ✓ completeSession updates XP in userStats
- ✓ completeSession marks day as complete

### Manual Testing Checklist

- [ ] Complete session with 5 flashcards (mix correct/incorrect)
- [ ] Verify masteryLevel updated in DevTools → IndexedDB → flashcards
- [ ] Check reviewDates array has new entries
- [ ] Complete quiz with 80% score
- [ ] Verify progressLogs entry created with correct score
- [ ] Check userStats.totalXP increased correctly
- [ ] Confirm session still works if DB write fails (check console logs)

---

## Implementation Notes

### Performance Considerations

- All DB writes are async and non-blocking
- UI updates immediately, persistence happens in background
- Failed writes logged but don't crash session
- ReviewDates array trimmed to 100 max to prevent unbounded growth

### Error Handling

- Services use try-catch with console.error logging
- UI remains functional even if persistence fails
- User never sees "Save failed" errors (graceful degradation)

### Future Enhancements (Post-Phase 5)

1. **Advanced Spaced Repetition**
   - Replace MasteryCalculator with SM-2 algorithm
   - Add `nextReviewDate` field to Flashcard
   - Schedule reviews based on mastery level

2. **Analytics Dashboard**
   - Visualize mastery progress over time
   - Show quiz score trends
   - Identify struggling topics

3. **Adaptive Learning**
   - Adjust review frequency based on performance
   - Present harder cards more frequently
   - Skip mastered cards (level 5) unless scheduled

4. **Offline Support**
   - Queue failed writes for retry
   - Sync state when connection restored

---

## Acceptance Criteria

Phase 5 is complete when:

1. ✅ Flashcard grading buttons work and update masteryLevel
2. ✅ Quiz scores persist to progressLogs table
3. ✅ XP calculation includes quiz + flashcard performance
4. ✅ All unit tests pass (coverage ≥90% for service layer)
5. ✅ Manual testing checklist completed
6. ✅ No UI blocking or crashes on DB errors
7. ✅ Documentation updated (README, inline comments)

---

## Files to Create/Modify

**New files:**
- `src/lib/reviewService.ts`
- `src/lib/quizGrader.ts`
- `src/lib/masteryCalculator.ts`
- `src/lib/__tests__/reviewService.test.ts`
- `src/lib/__tests__/quizGrader.test.ts`
- `src/lib/__tests__/masteryCalculator.test.ts`

**Modified files:**
- `src/types/index.ts` (add FlashcardResponse, QuizAttempt types)
- `src/hooks/useStudySession.ts` (add gradeFlashcard, update completeSession)
- `src/components/study-session/FlashcardDeck.tsx` (add grading buttons)
- `src/components/study-session/QuizScreen.tsx` (enhance feedback)
- `src/hooks/__tests__/useStudySession.test.ts` (add integration tests)

**Estimated effort:** 4-6 hours (including tests)

---

## Summary

Phase 5 builds a clean, testable service layer for flashcard mastery and quiz persistence. The simple +1/-1 mastery algorithm meets immediate needs while the modular design allows easy evolution to advanced spaced repetition systems in future phases.

Key wins:
- No data loss (persistence on every interaction)
- Testable business logic separate from UI
- Future-proof architecture for SM-2 or custom algorithms
- Graceful degradation on errors (UX-first)
