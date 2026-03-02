import { db } from './db';
import { calculateSM2, deriveClampedMasteryLevel, DEFAULT_EF } from './sm2Calculator';
import type { Quality } from './sm2Calculator';
import type { Flashcard } from '../types';

/**
 * Maximum number of review dates stored per flashcard.
 * Keeps review history manageable while retaining sufficient data for analytics.
 */
const MAX_REVIEW_DATES = 100;

/**
 * Record a flashcard review and update its SM-2 scheduling parameters.
 * 
 * This function is the central integration point between the SM-2 algorithm
 * and the database. When a user reviews a flashcard and rates it, this function:
 * 
 * 1. Retrieves the current card state from the database
 * 2. Calls calculateSM2() to compute new scheduling parameters
 * 3. Calculates the next review date based on the new interval
 * 4. Derives a mastery level from the new easiness factor
 * 5. Updates the card in the database with all new values
 * 6. Tracks the review timestamp in the card's history
 * 
 * **Updated Fields:**
 * - `masteryLevel`: Derived from easiness factor (0-5 scale)
 * - `easinessFactor`: Updated by SM-2 algorithm (1.3-2.5)
 * - `interval`: Days until next review
 * - `repetitions`: Consecutive correct reviews count
 * - `nextReviewDate`: Calculated as now + interval
 * - `reviewDates`: Appends current timestamp (max 100 entries)
 * - `firstShownDate`: Set on first review only
 * 
 * **Error Handling:**
 * Errors are logged but not thrown, allowing graceful degradation.
 * If the update fails, the user's study session continues without crashing.
 * 
 * @param flashcardId - Unique identifier of the flashcard being reviewed
 * @param quality - User's quality rating (0=Again, 1=Hard, 2=Good, 3=Easy)
 * 
 * @returns Promise resolving to `{ success: true }` on success, or
 *   `{ success: false, error: string }` on failure (never throws)
 * 
 * @example
 * // User rates a flashcard as "Good"
 * const result = await recordFlashcardReview('card-123', Quality.Good);
 * if (!result.success) console.warn(result.error);
 * 
 * @see calculateSM2 for algorithm details
 * @see Quality enum for rating definitions
 */
export async function recordFlashcardReview(
  flashcardId: string,
  quality: Quality
): Promise<{ success: boolean; error?: string }> {
  try {
    const card = await db.flashcards.get(flashcardId);
    
    if (!card) {
      console.error(`Flashcard ${flashcardId} not found`);
      return { success: false, error: `Flashcard ${flashcardId} not found` };
    }

    const now = new Date();

    const easinessFactor = card.easinessFactor ?? DEFAULT_EF;
    const interval = card.interval ?? 1;
    const repetitions = card.repetitions ?? 0;

    const sm2Result = calculateSM2({
      quality,
      repetitions,
      easinessFactor,
      previousInterval: interval,
    });

    const nextReviewDate = new Date(
      now.getTime() + sm2Result.interval * 24 * 60 * 60 * 1000
    );
    const masteryLevel = deriveClampedMasteryLevel(sm2Result.easinessFactor);

    const newReviewDates = [...(card.reviewDates ?? []), now];
    if (newReviewDates.length > MAX_REVIEW_DATES) {
      newReviewDates.splice(0, newReviewDates.length - MAX_REVIEW_DATES);
    }

    const updates: Partial<Flashcard> = {
      masteryLevel,
      reviewDates: newReviewDates,
      easinessFactor: sm2Result.easinessFactor,
      interval: sm2Result.interval,
      repetitions: sm2Result.repetitions,
      nextReviewDate,
    };

    // Set firstShownDate if this is first review
    if (!card.firstShownDate) {
      updates.firstShownDate = now;
    }

    await db.flashcards.update(flashcardId, updates);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to record flashcard review:', error);
    return { success: false, error: message };
  }
}
