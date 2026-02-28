import { db } from './db';
import { updateMastery } from './masteryCalculator';
import type { Flashcard } from '../types';

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
    const newMasteryLevel = updateMastery(card.masteryLevel, correct);
    
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
