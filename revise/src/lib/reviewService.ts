import { db } from './db';
import { calculateSM2, deriveClampedMasteryLevel, DEFAULT_EF } from './sm2Calculator';
import type { Quality } from './sm2Calculator';
import type { Flashcard } from '../types';

const MAX_REVIEW_DATES = 100;

/**
 * Record a flashcard review and update mastery level
 * 
 * Updates flashcard's masteryLevel, reviewDates, and firstShownDate.
 * Handles errors gracefully (logs but doesn't throw).
 * 
 * @param flashcardId - ID of the flashcard being reviewed
 * @param quality - SM-2 quality rating (0-3)
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
  } catch (error) {
    console.error('Failed to record flashcard review:', error);
    // Don't throw - graceful degradation
  }
}
