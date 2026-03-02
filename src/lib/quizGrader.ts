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
