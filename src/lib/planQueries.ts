import { db } from './db';
import type { Flashcard, StudyDay } from '../types';

export async function getTodayStudyDay(planId: string): Promise<StudyDay | undefined> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toDateString();

  const days = await db.studyDays
    .where('planId')
    .equals(planId)
    .toArray();

  return days.find((d) => {
    const date = d.date instanceof Date ? d.date : new Date(d.date);
    return date.toDateString() === todayStr;
  });
}

export async function getStudyDayById(dayId: string): Promise<StudyDay | undefined> {
  return db.studyDays.get(dayId);
}

export async function getPlanWithTopics(planId: string) {
  const plan = await db.studyPlans.get(planId);
  if (!plan) return null;

  const days = await db.studyDays.where('planId').equals(planId).toArray();
  
  return { plan, days };
}

export async function getCardsByTopicIds(topicIds: string[]) {
  const cards = await db.flashcards
    .where('topicId')
    .anyOf(topicIds)
    .toArray();
  
  return cards;
}

export async function getQuizzesByTopicIds(topicIds: string[]) {
  const quizzes = await db.quizQuestions
    .where('topicId')
    .anyOf(topicIds)
    .toArray();
  
  return quizzes;
}

/**
 * Get flashcards that are due for review according to SM-2 scheduling.
 * 
 * This function filters a list of flashcard IDs to return only cards that
 * are ready for review based on their `nextReviewDate`. Cards are considered
 * "due" if:
 * - They have never been reviewed (nextReviewDate is null/undefined)
 * - Their nextReviewDate is today or earlier
 * 
 * The function uses end-of-day (23:59:59) for comparison, meaning any card
 * scheduled for "today" will be included regardless of the current time.
 * 
 * **Use Cases:**
 * - Study Session: Show only cards ready for review
 * - Progress Dashboard: Display count of due cards per plan/topic
 * - Notification System: Alert users when cards need review
 * 
 * **Performance:**
 * - Uses `bulkGet()` for efficient batch retrieval
 * - Filters in-memory rather than complex DB queries
 * - Returns immediately if input is empty
 * 
 * @param flashcardIds - Array of flashcard IDs to check (typically from a study day)
 * 
 * @returns Promise resolving to array of due flashcards (or empty array if none due)
 * 
 * @example
 * const todayCards = ['card-1', 'card-2', 'card-3'];
 * const dueCards = await getFlashcardsDueForReview(todayCards);
 * console.log(`${dueCards.length} cards due for review`);
 * 
 * @see recordFlashcardReview for updating nextReviewDate after review
 */
export async function getFlashcardsDueForReview(
  flashcardIds: string[]
): Promise<Flashcard[]> {
  if (flashcardIds.length === 0) return [];

  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const cards = await db.flashcards.bulkGet(flashcardIds);

  return cards.filter((card): card is Flashcard => {
    if (!card) return false;
    if (!card.nextReviewDate) return true;
    return card.nextReviewDate <= now;
  });
}
