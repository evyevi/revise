export interface SessionXPContext {
  baseSession: boolean;
  correctAnswers: number;
  carddeckCompleted: boolean;
  perfectQuiz: boolean;
  currentStreak: number;
}

/**
 * Calculate XP for completing a study session
 * @returns 50 XP
 */
export function calculateSessionXP(): number {
  return 50;
}

/**
 * Calculate XP based on correct quiz answers
 * @param correctCount - Number of correct answers
 * @returns 10 XP per correct answer
 */
export function calculateQuizAnswerXP(correctCount: number): number {
  return correctCount * 10;
}

/**
 * Calculate XP for completing a flashcard deck
 * @returns 15 XP
 */
export function calculateFlashcardXP(): number {
  return 15;
}

/**
 * Calculate bonus XP for perfect quiz score
 * @param isPerfect - Whether the quiz was completed with 100% score
 * @returns 30 XP if perfect, 0 otherwise
 */
export function calculatePerfectQuizBonus(isPerfect: boolean): number {
  return isPerfect ? 30 : 0;
}

/**
 * Calculate streak bonus XP based on consecutive study days
 * Rewards 20 XP per 3-day milestone (3, 6, 9, etc.)
 * @param streak - Current study streak in days
 * @returns XP based on completed milestones
 */
export function calculateStreakBonus(streak: number): number {
  return Math.floor(streak / 3) * 20;
}

/**
 * Calculate total XP for a study session based on context
 * Sums all XP components: base session, quiz answers, flashcard, perfect bonus, and streak bonus
 * @param context - SessionXPContext with activity details
 * @returns Total XP earned
 */
export function calculateTotalSessionXP(context: SessionXPContext): number {
  let totalXP = 0;

  if (context.baseSession) {
    totalXP += calculateSessionXP();
  }

  totalXP += calculateQuizAnswerXP(context.correctAnswers);

  if (context.carddeckCompleted) {
    totalXP += calculateFlashcardXP();
  }

  if (context.perfectQuiz) {
    totalXP += calculatePerfectQuizBonus(true);
  }

  totalXP += calculateStreakBonus(context.currentStreak);

  return totalXP;
}
