import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { migrateFlashcardsToSM2 } from '../migrateFlashcardsToSM2';
import type { Flashcard } from '../../types';

describe('migrateFlashcardsToSM2', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('should add SM-2 fields to legacy cards without them', async () => {
    // Arrange: Create flashcards without SM-2 fields
    const legacyCard1: Flashcard = {
      id: 'fc1',
      topicId: 't1',
      front: 'Question 1',
      back: 'Answer 1',
      reviewDates: [new Date('2026-02-20')],
      masteryLevel: 2,
    };

    const legacyCard2: Flashcard = {
      id: 'fc2',
      topicId: 't1',
      front: 'Question 2',
      back: 'Answer 2',
      reviewDates: [],
      masteryLevel: 0,
    };

    await db.flashcards.bulkAdd([legacyCard1, legacyCard2]);

    // Act
    const migratedCount = await migrateFlashcardsToSM2();

    // Assert
    expect(migratedCount).toBe(2);

    const card1 = await db.flashcards.get('fc1');
    expect(card1).toBeDefined();
    expect(card1?.easinessFactor).toBe(2.5);
    expect(card1?.interval).toBe(1);
    expect(card1?.repetitions).toBe(0);
    expect(card1?.nextReviewDate).toBeInstanceOf(Date);

    const card2 = await db.flashcards.get('fc2');
    expect(card2).toBeDefined();
    expect(card2?.easinessFactor).toBe(2.5);
    expect(card2?.interval).toBe(1);
    expect(card2?.repetitions).toBe(0);
    expect(card2?.nextReviewDate).toBeInstanceOf(Date);
  });

  it('should skip cards that already have SM-2 fields', async () => {
    // Arrange: Create cards with SM-2 fields
    const modernCard: Flashcard = {
      id: 'fc1',
      topicId: 't1',
      front: 'Question 1',
      back: 'Answer 1',
      reviewDates: [new Date('2026-02-20')],
      masteryLevel: 3,
      easinessFactor: 2.3,
      interval: 3,
      repetitions: 2,
      nextReviewDate: new Date('2026-02-23'),
    };

    await db.flashcards.add(modernCard);

    // Act
    const migratedCount = await migrateFlashcardsToSM2();

    // Assert
    expect(migratedCount).toBe(0);

    const card = await db.flashcards.get('fc1');
    expect(card?.easinessFactor).toBe(2.3); // Unchanged
    expect(card?.interval).toBe(3); // Unchanged
    expect(card?.repetitions).toBe(2); // Unchanged
    expect(card?.nextReviewDate).toEqual(new Date('2026-02-23')); // Unchanged
  });

  it('should handle empty database', async () => {
    // Act
    const migratedCount = await migrateFlashcardsToSM2();

    // Assert
    expect(migratedCount).toBe(0);
  });

  it('should set nextReviewDate relative to last review date', async () => {
    // Arrange: Card with review history
    const lastReviewDate = new Date('2026-02-25T10:00:00Z');
    const card: Flashcard = {
      id: 'fc1',
      topicId: 't1',
      front: 'Question',
      back: 'Answer',
      reviewDates: [new Date('2026-02-20'), lastReviewDate],
      masteryLevel: 2,
    };

    await db.flashcards.add(card);

    // Act
    await migrateFlashcardsToSM2();

    // Assert
    const updated = await db.flashcards.get('fc1');
    expect(updated?.nextReviewDate).toBeInstanceOf(Date);
    
    // Should be lastReviewDate + interval (1 day)
    const expectedDate = new Date(lastReviewDate);
    expectedDate.setDate(expectedDate.getDate() + 1);
    expect(updated?.nextReviewDate?.getTime()).toBe(expectedDate.getTime());
  });

  it('should set nextReviewDate to tomorrow if no review history', async () => {
    // Arrange: Card with no reviews
    const card: Flashcard = {
      id: 'fc1',
      topicId: 't1',
      front: 'Question',
      back: 'Answer',
      reviewDates: [],
      masteryLevel: 0,
    };

    await db.flashcards.add(card);

    // Act
    const now = Date.now();
    await migrateFlashcardsToSM2();

    // Assert
    const updated = await db.flashcards.get('fc1');
    expect(updated?.nextReviewDate).toBeInstanceOf(Date);
    
    // Should be current date + 1 day (roughly)
    const nextReviewTime = updated?.nextReviewDate?.getTime() ?? 0;
    const oneDayInMs = 24 * 60 * 60 * 1000;
    expect(nextReviewTime).toBeGreaterThan(now);
    expect(nextReviewTime).toBeLessThan(now + oneDayInMs + 5000); // 5 second tolerance
  });

  it('should initialize all fields with correct default values', async () => {
    // Arrange
    const card: Flashcard = {
      id: 'fc1',
      topicId: 't1',
      front: 'Question',
      back: 'Answer',
      reviewDates: [new Date('2026-02-20')],
      masteryLevel: 1,
    };

    await db.flashcards.add(card);

    // Act
    await migrateFlashcardsToSM2();

    // Assert
    const updated = await db.flashcards.get('fc1');
    expect(updated?.easinessFactor).toBe(2.5); // DEFAULT_EF
    expect(updated?.interval).toBe(1); // 1 day
    expect(updated?.repetitions).toBe(0); // No successful repetitions yet
    expect(updated?.nextReviewDate).toBeInstanceOf(Date);
  });
});
