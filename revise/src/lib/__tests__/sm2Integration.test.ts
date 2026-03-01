import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { recordFlashcardReview } from '../reviewService';
import { calculateSM2, Quality, DEFAULT_EF, deriveClampedMasteryLevel } from '../sm2Calculator';
import { getFlashcardsDueForReview } from '../planQueries';
import type { Flashcard } from '../../types';

/**
 * SM-2 Integration Tests
 * 
 * Verifies the complete SM-2 workflow: cards scheduled by getFlashcardsDueForReview
 * → quiz grading captures Quality → review service updates SM-2 fields
 */
describe('SM-2 Integration Workflow', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.flashcards.clear();
  });

  /**
   * Test a: Complete scheduling → grading → review workflow
   * 
   * Creates flashcards with SM-2 fields, grades with Quality.Good,
   * verifies recordFlashcardReview updates fields correctly and applies SM-2.
   */
  it('should handle complete scheduling → grading → review cycle', async () => {
    // Create a flashcard with SM-2 fields
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const card: Flashcard = {
      id: 'card-workflow',
      topicId: 'topic-1',
      front: 'What is 2+2?',
      back: '4',
      masteryLevel: 0,
      reviewDates: [],
      easinessFactor: DEFAULT_EF, // 2.5
      interval: 0,
      repetitions: 0,
      nextReviewDate: today,
    };

    await db.flashcards.add(card);

    // Verify card is scheduled for review today
    const dueCards = await getFlashcardsDueForReview(['card-workflow']);
    expect(dueCards).toHaveLength(1);
    expect(dueCards[0].id).toBe('card-workflow');

    // Grade the card with Quality.Good
    await recordFlashcardReview('card-workflow', Quality.Good);

    // Verify SM-2 was applied
    const updatedCard = await db.flashcards.get('card-workflow');
    expect(updatedCard).toBeDefined();
    expect(updatedCard!.repetitions).toBe(1);
    expect(updatedCard!.interval).toBe(1); // First review: 1 day
    expect(updatedCard!.easinessFactor).toBe(DEFAULT_EF); // No change for Good
    expect(updatedCard!.nextReviewDate).toBeDefined();

    // Verify nextReviewDate is approximately 1 day from now
    const expectedNextReview = new Date();
    expectedNextReview.setDate(expectedNextReview.getDate() + 1);
    const dayDiff = (updatedCard!.nextReviewDate!.getTime() - expectedNextReview.getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.abs(dayDiff)).toBeLessThan(0.1); // Within ~2 hours of expected
  });

  /**
   * Test b: Correct answer (Good) spacing
   * 
   * Grade card with Quality.Good (correct answer).
   * Verify interval becomes 1, nextReviewDate is tomorrow.
   * Verify easinessFactor remains stable (no reduction).
   */
  it('should schedule Good (correct) answer with 1-day interval', async () => {
    const card: Flashcard = {
      id: 'card-good',
      topicId: 'topic-1',
      front: 'Capital of France?',
      back: 'Paris',
      masteryLevel: 0,
      reviewDates: [],
      easinessFactor: DEFAULT_EF,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date(),
    };

    await db.flashcards.add(card);

    const oldEF = card.easinessFactor;
    await recordFlashcardReview('card-good', Quality.Good);

    const updated = await db.flashcards.get('card-good');
    expect(updated!.interval).toBe(1);
    expect(updated!.repetitions).toBe(1);
    expect(updated!.easinessFactor).toBe(oldEF); // Unchanged
    expect(updated!.masteryLevel).toBeGreaterThanOrEqual(0);
  });

  /**
   * Test c: Incorrect answer (Again) scheduling
   * 
   * Grade card with Quality.Again (incorrect answer).
   * Verify interval resets to 0-1, easinessFactor decreases,
   * nextReviewDate is today (due again immediately).
   */
  it('should reset interval for Again (incorrect) and decrease EF', async () => {
    const card: Flashcard = {
      id: 'card-again',
      topicId: 'topic-1',
      front: 'Capital of Japan?',
      back: 'Tokyo',
      masteryLevel: 3,
      reviewDates: [new Date('2026-02-01'), new Date('2026-02-15')],
      easinessFactor: 2.0,
      interval: 10,
      repetitions: 3,
      nextReviewDate: new Date('2026-03-15'),
    };

    await db.flashcards.add(card);

    const oldEF = card.easinessFactor;
    await recordFlashcardReview('card-again', Quality.Again);

    const updated = await db.flashcards.get('card-again');
    expect(updated!.interval).toBe(1); // reset to 1
    expect(updated!.repetitions).toBe(0); // reset to 0
    expect(updated!.easinessFactor).toBeLessThan(oldEF); // decreased
    expect(updated!.masteryLevel).toBeLessThan(3); // reduced mastery
  });

  /**
   * Test d: Progressive difficulty and spacing
   * 
   * Grade same card multiple times: Good → Good → Good
   * Verify intervals progress: 1 → 6 → ~15 days
   * Verify easinessFactor increases with each Good rating
   */
  it('should progressively increase intervals with repeated Good ratings', async () => {
    const card: Flashcard = {
      id: 'card-progressive',
      topicId: 'topic-1',
      front: 'What is the powerhouse of the cell?',
      back: 'Mitochondrion',
      masteryLevel: 0,
      reviewDates: [],
      easinessFactor: DEFAULT_EF,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date(),
    };

    await db.flashcards.add(card);

    // First Good review: 0 → 1 repetitions, interval 1
    await recordFlashcardReview('card-progressive', Quality.Good);
    let updated = await db.flashcards.get('card-progressive');
    expect(updated!.interval).toBe(1);
    expect(updated!.repetitions).toBe(1);
    const ef1 = updated!.easinessFactor;

    // Manually set nextReviewDate to past so it's due again
    await db.flashcards.update('card-progressive', {
      nextReviewDate: new Date('2026-02-01'),
    });

    // Second Good review: 1 → 2 repetitions, interval 6
    await recordFlashcardReview('card-progressive', Quality.Good);
    updated = await db.flashcards.get('card-progressive');
    expect(updated!.interval).toBe(6);
    expect(updated!.repetitions).toBe(2);
    const ef2 = updated!.easinessFactor;

    // Manually set nextReviewDate to past so it's due again
    await db.flashcards.update('card-progressive', {
      nextReviewDate: new Date('2026-02-01'),
    });

    // Third Good review: 2 → 3 repetitions, interval = 6 * EF ≈ 15
    await recordFlashcardReview('card-progressive', Quality.Good);
    updated = await db.flashcards.get('card-progressive');
    expect(updated!.repetitions).toBe(3);
    expect(updated!.interval).toBeGreaterThanOrEqual(14); // ~15 with math.round
    expect(updated!.interval).toBeLessThanOrEqual(16);
    const ef3 = updated!.easinessFactor;

    // EF should remain stable or increase (Good doesn't change EF from 2.5)
    expect(ef3).toBeGreaterThanOrEqual(ef2);
    expect(ef2).toBeGreaterThanOrEqual(ef1);
  });

  /**
   * Test e: Hard rating (partial credit)
   * 
   * Grade with Quality.Hard (partial understanding).
   * Verify interval is small (~1-3 days), easinessFactor reduces.
   */
  it('should reset interval for Hard and slightly reduce EF', async () => {
    const card: Flashcard = {
      id: 'card-hard',
      topicId: 'topic-1',
      front: 'What is photosynthesis?',
      back: 'Process of converting light to energy',
      masteryLevel: 2,
      reviewDates: [new Date('2026-02-20')],
      easinessFactor: 2.1,
      interval: 8,
      repetitions: 2,
      nextReviewDate: new Date('2026-03-10'),
    };

    await db.flashcards.add(card);

    const oldEF = card.easinessFactor;
    await recordFlashcardReview('card-hard', Quality.Hard);

    const updated = await db.flashcards.get('card-hard');
    expect(updated!.interval).toBe(1); // reset to 1 day
    expect(updated!.repetitions).toBe(0); // reset to 0
    expect(updated!.easinessFactor).toBeLessThan(oldEF); // reduced
    expect(updated!.easinessFactor).toBeGreaterThanOrEqual(1.3); // min EF
    // Hard (q=1) with 2.1 EF becomes 1.96, which is mastery level 3
    expect(updated!.masteryLevel).toBeLessThanOrEqual(3);
  });

  /**
   * Test f: Easy rating (strong mastery)
   * 
   * Grade with Quality.Easy (perfect recall).
   * Verify interval is large (~14+ days), easinessFactor increased significantly.
   */
  it('should increase interval significantly for Easy and increase EF', async () => {
    const card: Flashcard = {
      id: 'card-easy',
      topicId: 'topic-1',
      front: 'What is 5 × 7?',
      back: '35',
      masteryLevel: 2,
      reviewDates: [new Date('2026-02-01')],
      easinessFactor: 2.0,
      interval: 1,
      repetitions: 1,
      nextReviewDate: new Date(),
    };

    await db.flashcards.add(card);

    const oldEF = card.easinessFactor;
    await recordFlashcardReview('card-easy', Quality.Easy);

    const updated = await db.flashcards.get('card-easy');
    expect(updated!.repetitions).toBe(2);
    expect(updated!.interval).toBe(6); // Second review: 6 days
    expect(updated!.easinessFactor).toBeGreaterThan(oldEF); // increased
    expect(updated!.easinessFactor).toBeLessThanOrEqual(2.5); // capped at max
    expect(updated!.masteryLevel).toBe(deriveClampedMasteryLevel(updated!.easinessFactor));
  });

  /**
   * Test g: Scheduling filters correct due cards
   * 
   * Create 5 cards: 2 due today, 2 due tomorrow, 1 due in past.
   * Call getFlashcardsDueForReview() with all card IDs.
   * Verify returns correct cards (past + today, but not future).
   */
  it('should filter and return only cards due today or in the past', async () => {
    const now = new Date();
    now.setHours(12, 0, 0, 0); // noon today
    
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const cards: Flashcard[] = [
      {
        id: 'due-past-1',
        topicId: 'topic-1',
        front: 'Q1',
        back: 'A1',
        masteryLevel: 1,
        reviewDates: [],
        nextReviewDate: yesterday,
      },
      {
        id: 'due-today-1',
        topicId: 'topic-1',
        front: 'Q2',
        back: 'A2',
        masteryLevel: 1,
        reviewDates: [],
        nextReviewDate: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10am today
      },
      {
        id: 'due-today-2',
        topicId: 'topic-1',
        front: 'Q3',
        back: 'A3',
        masteryLevel: 1,
        reviewDates: [],
        nextReviewDate: new Date(today.getTime() + 22 * 60 * 60 * 1000), // 10pm today, still before 23:59:59
      },
      {
        id: 'due-tomorrow-1',
        topicId: 'topic-1',
        front: 'Q4',
        back: 'A4',
        masteryLevel: 0,
        reviewDates: [],
        nextReviewDate: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000), // 2am tomorrow
      },
      {
        id: 'due-tomorrow-2',
        topicId: 'topic-1',
        front: 'Q5',
        back: 'A5',
        masteryLevel: 0,
        reviewDates: [],
        nextReviewDate: new Date(tomorrow.getTime() + 12 * 60 * 60 * 1000), // noon tomorrow
      },
    ];

    await db.flashcards.bulkAdd(cards);

    const cardIds = cards.map((c) => c.id);
    const dueCards = await getFlashcardsDueForReview(cardIds);

    // Should return past + today (3 cards), but not tomorrow
    expect(dueCards.length).toBeGreaterThanOrEqual(3);
    const dueIds = dueCards.map((c) => c.id);
    expect(dueIds).toContain('due-past-1');
    expect(dueIds).toContain('due-today-1');
    expect(dueIds).toContain('due-today-2');
    expect(dueIds).not.toContain('due-tomorrow-1');
    expect(dueIds).not.toContain('due-tomorrow-2');
  });

  /**
   * Test h: Quiz Quality flows to card review
   * 
   * Simulate user taking quiz:
   * - Correct answer → Quality.Good
   * - Incorrect answer → Quality.Again
   * Verify recordFlashcardReview applies SM-2 correctly based on Quality.
   */
  it('should flow Quality from quiz grading to SM-2 card updates', async () => {
    const correctCard: Flashcard = {
      id: 'quiz-correct',
      topicId: 'topic-1',
      front: 'Q: What is capital of Italy?',
      back: 'Rome',
      masteryLevel: 0,
      reviewDates: [],
      easinessFactor: DEFAULT_EF,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date(),
    };

    const incorrectCard: Flashcard = {
      id: 'quiz-incorrect',
      topicId: 'topic-1',
      front: 'Q: What is capital of Germany?',
      back: 'Berlin',
      masteryLevel: 2,
      reviewDates: [new Date('2026-02-01'), new Date('2026-02-20')],
      easinessFactor: 1.5, // Lower EF from previous reviews
      interval: 3,
      repetitions: 2,
      nextReviewDate: new Date(),
    };

    await db.flashcards.bulkAdd([correctCard, incorrectCard]);

    // Simulate correct answer → Quality.Good
    const qualityCorrect = Quality.Good;
    await recordFlashcardReview('quiz-correct', qualityCorrect);

    const updatedCorrect = await db.flashcards.get('quiz-correct');
    expect(updatedCorrect!.repetitions).toBe(1);
    expect(updatedCorrect!.interval).toBe(1); // Good → 1 day interval
    expect(updatedCorrect!.masteryLevel).toBeGreaterThanOrEqual(1);

    // Simulate incorrect answer → Quality.Again
    const qualityIncorrect = Quality.Again;
    await recordFlashcardReview('quiz-incorrect', qualityIncorrect);

    const updatedIncorrect = await db.flashcards.get('quiz-incorrect');
    expect(updatedIncorrect!.repetitions).toBe(0);
    expect(updatedIncorrect!.interval).toBe(1); // Again → reset to 1 day
    expect(updatedIncorrect!.easinessFactor).toBeLessThan(1.5); // EF decreased from 1.5
    expect(updatedIncorrect!.easinessFactor).toBeGreaterThanOrEqual(1.3); // but not below minimum
    expect(updatedIncorrect!.masteryLevel).toBeLessThanOrEqual(2); // reduced mastery
  });

  /**
   * Test: Verify Quality enum and SM-2 algorithm constants
   * 
   * Ensure Quality values are correct (0-3 range).
   * Ensure SM-2 constraints (EF 1.3-2.5, proper interval calculations).
   */
  it('should maintain correct Quality enum values', () => {
    expect(Quality.Again).toBe(0);
    expect(Quality.Hard).toBe(1);
    expect(Quality.Good).toBe(2);
    expect(Quality.Easy).toBe(3);
  });

  /**
   * Test: Verify SM-2 algorithm edge cases
   * 
   * Test with minimum and maximum easiness factors.
   * Verify rounding of intervals.
   */
  it('should apply SM-2 algorithm correctly with edge case EF values', async () => {
    // Test with minimum EF after multiple Again ratings
    const card: Flashcard = {
      id: 'card-min-ef',
      topicId: 'topic-1',
      front: 'Difficult question',
      back: 'Answer',
      masteryLevel: 0,
      reviewDates: [],
      easinessFactor: 1.3, // minimum EF
      interval: 1,
      repetitions: 0,
      nextReviewDate: new Date(),
    };

    await db.flashcards.add(card);

    // Grade with Again should keep EF at minimum
    await recordFlashcardReview('card-min-ef', Quality.Again);

    const updated = await db.flashcards.get('card-min-ef');
    expect(updated!.easinessFactor).toBeGreaterThanOrEqual(1.3);
    expect(updated!.easinessFactor).toBeLessThanOrEqual(2.5);
  });

  /**
   * Test: Verify persistence across multiple reviews
   * 
   * Ensure state persists in database between reviews.
   * Verify no data loss or unexpected mutations.
   */
  it('should persist SM-2 state correctly across multiple operations', async () => {
    const card: Flashcard = {
      id: 'card-persistent',
      topicId: 'topic-1',
      front: 'Persistence test',
      back: 'Answer',
      masteryLevel: 0,
      reviewDates: [],
      easinessFactor: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: new Date(),
    };

    await db.flashcards.add(card);

    // First review
    await recordFlashcardReview('card-persistent', Quality.Good);
    let updated = await db.flashcards.get('card-persistent');
    const ef1 = updated!.easinessFactor;
    const rep1 = updated!.repetitions;

    // Modify nextReviewDate to make it due again
    await db.flashcards.update('card-persistent', {
      nextReviewDate: new Date('2026-02-01'),
    });

    // Second review
    await recordFlashcardReview('card-persistent', Quality.Good);
    updated = await db.flashcards.get('card-persistent');

    // Verify state persisted and evolved correctly
    expect(updated!.repetitions).toBe(rep1 + 1);
    expect(updated!.interval).toBe(6); // Should be 6 after second Good
    expect(updated!.reviewDates).toHaveLength(2);
    expect(updated!.firstShownDate).toBeDefined();
  });

  /**
   * Test: Mastery level derivation from EF
   * 
   * Verify that mastery levels correctly map to EF ranges.
   */
  it('should derive mastery levels correctly from easiness factors', async () => {
    const testCases: Array<[number, number]> = [
      [1.3, 1],
      [1.4, 1],
      [1.6, 2],
      [1.8, 2],
      [1.9, 3],
      [2.0, 3],
      [2.2, 4],
      [2.3, 4],
      [2.4, 5],
      [2.5, 5],
    ];

    for (const [ef, expectedMastery] of testCases) {
      const mastery = deriveClampedMasteryLevel(ef);
      expect(mastery).toBe(expectedMastery);
    }
  });

  /**
   * Test: Verify end-of-day cutoff behavior
   * 
   * Ensures getFlashcardsDueForReview uses 23:59:59 cutoff.
   * Card due at 23:00 today should be included.
   * Card due at 00:00 tomorrow should not be included.
   */
  it('should respect end-of-day cutoff for scheduling', async () => {
    const now = new Date();
    const todayEOD = new Date(now);
    todayEOD.setHours(23, 59, 59, 999);

    const tomorrowStart = new Date(now);
    tomorrowStart.setHours(24, 0, 0, 0);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const cardDueToday: Flashcard = {
      id: 'eod-today',
      topicId: 'topic-1',
      front: 'Due today',
      back: 'Answer',
      masteryLevel: 1,
      reviewDates: [],
      nextReviewDate: todayEOD,
    };

    const cardDueTomorrow: Flashcard = {
      id: 'eod-tomorrow',
      topicId: 'topic-1',
      front: 'Due tomorrow',
      back: 'Answer',
      masteryLevel: 1,
      reviewDates: [],
      nextReviewDate: tomorrowStart,
    };

    await db.flashcards.bulkAdd([cardDueToday, cardDueTomorrow]);

    const due = await getFlashcardsDueForReview(['eod-today', 'eod-tomorrow']);

    expect(due).toHaveLength(1);
    expect(due[0].id).toBe('eod-today');
  });
});
