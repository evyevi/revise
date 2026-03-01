import { db } from './db';

// Default values for SM-2 algorithm
const DEFAULT_EF = 2.5;
const DEFAULT_INTERVAL = 1;
const DEFAULT_REPETITIONS = 0;

/**
 * Migrates existing flashcards to include SM-2 spaced repetition fields.
 * 
 * For cards without SM-2 fields, initializes:
 * - easinessFactor: 2.5 (default)
 * - interval: 1 day
 * - repetitions: 0 (no successful reviews yet)
 * - nextReviewDate: last review date + 1 day (or current date + 1 day if no reviews)
 * 
 * @returns Number of flashcards migrated
 */
export async function migrateFlashcardsToSM2(): Promise<number> {
  let migratedCount = 0;

  // Get all flashcards
  const allCards = await db.flashcards.toArray();

  for (const card of allCards) {
    // Skip cards that already have SM-2 fields
    if (card.easinessFactor !== undefined) {
      continue;
    }

    // Calculate next review date
    const lastReviewDate = card.reviewDates.length > 0
      ? card.reviewDates[card.reviewDates.length - 1]
      : new Date();
    
    const nextReviewDate = new Date(lastReviewDate);
    nextReviewDate.setDate(nextReviewDate.getDate() + DEFAULT_INTERVAL);

    // Update card with SM-2 fields
    await db.flashcards.update(card.id, {
      easinessFactor: DEFAULT_EF,
      interval: DEFAULT_INTERVAL,
      repetitions: DEFAULT_REPETITIONS,
      nextReviewDate,
    });

    migratedCount++;
  }

  return migratedCount;
}
