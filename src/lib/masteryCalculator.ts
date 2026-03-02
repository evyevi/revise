import type { MasteryLevel } from '../types';

/**
 * Update flashcard mastery level based on user response
 *
 * Simple +1/-1 algorithm for Phase 5.
 * Future: Replace with SM-2 or custom adaptive algorithm.
 *
 * @deprecated Use sm2Calculator.ts and reviewService.ts for SM-2 reviews.
 *
 * @param currentLevel - Current mastery level (0-5)
 * @param correct - Whether user answered correctly
 * @returns New mastery level (0-5)
 */
export function updateMastery(
  currentLevel: MasteryLevel,
  correct: boolean
): MasteryLevel {
  const newLevel = correct ? currentLevel + 1 : currentLevel - 1;
  
  // Clamp to 0-5 range
  return Math.max(0, Math.min(5, newLevel)) as MasteryLevel;
}
