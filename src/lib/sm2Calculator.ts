import type { MasteryLevel } from '../types';

/**
 * Quality ratings for SM-2 spaced repetition algorithm.
 * 
 * These ratings represent how well the user recalled a flashcard during review.
 * Each rating has a different impact on the card's scheduling:
 * 
 * - **Again (0)**: Complete failure - forgot or answered incorrectly
 *   → Resets repetitions to 0, next review in 1 day, significantly lowers EF
 * 
 * - **Hard (1)**: Difficult recall - struggled significantly but eventually remembered
 *   → Resets repetitions to 0, next review in 1 day, slightly lowers EF
 * 
 * - **Good (2)**: Normal recall - remembered with some effort or hesitation
 *   → Increments repetitions, progresses interval (1d → 6d → exponential), minimal EF change
 * 
 * - **Easy (3)**: Perfect recall - instantly remembered without any hesitation
 *   → Increments repetitions, progresses interval faster, increases EF
 * 
 * @see calculateSM2 for how quality affects scheduling
 */
export enum Quality {
  Again = 0, // Complete blackout, wrong answer
  Hard = 1,  // Incorrect response, but correct one remembered
  Good = 2,  // Correct response with some effort
  Easy = 3,  // Perfect response, immediate recall
}

export interface SM2Input {
  quality: Quality;
  repetitions: number;
  easinessFactor: number;
  previousInterval: number;
}

export interface SM2Result {
  repetitions: number;
  easinessFactor: number;
  interval: number; // days
}

/**
 * Minimum easiness factor allowed by SM-2.
 * Cards with EF at this level are the most difficult and have the slowest interval growth.
 */
const MIN_EF = 1.3;

/**
 * Maximum easiness factor allowed by SM-2.
 * Cards with EF at this level are the easiest and have the fastest interval growth.
 */
const MAX_EF = 2.5;

/**
 * Default easiness factor for new cards.
 * SM-2 assumes average difficulty until user performance data is collected.
 */
const DEFAULT_EF = 2.5;

/**
 * Calculate next review parameters using the SuperMemo 2 (SM-2) algorithm.
 * 
 * SM-2 is a spaced repetition algorithm that optimizes review timing based on
 * user performance. It calculates three key values:
 * 
 * 1. **Easiness Factor (EF)**: Measure of card difficulty (1.3-2.5)
 *    - Updated using: EF' = EF + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02))
 *    - Higher quality ratings increase EF, lower ratings decrease it
 *    - Clamped to [1.3, 2.5] range
 * 
 * 2. **Repetitions**: Count of consecutive correct reviews
 *    - Resets to 0 when quality < 2 (Again or Hard)
 *    - Increments by 1 when quality >= 2 (Good or Easy)
 *    - Determines which interval formula to use
 * 
 * 3. **Interval**: Days until next review
 *    - If quality < 2: interval = 1 (review tomorrow)
 *    - If quality >= 2:
 *      - First correct review (rep 1): 1 day
 *      - Second correct review (rep 2): 6 days
 *      - Subsequent reviews (rep 3+): previousInterval × EF (exponential growth)
 * 
 * **Example Progression** (rating "Good" every time, EF stays ~2.5):
 * - Review 1: 1 day
 * - Review 2: 6 days
 * - Review 3: 15 days (6 × 2.5)
 * - Review 4: 37 days (15 × 2.5)
 * - Review 5: 92 days (37 × 2.5)
 * 
 * @param input - Current card state and user's quality rating
 * @param input.quality - Quality of recall (0=Again, 1=Hard, 2=Good, 3=Easy)
 * @param input.repetitions - Number of consecutive correct reviews
 * @param input.easinessFactor - Current easiness factor (1.3-2.5)
 * @param input.previousInterval - Days since last review
 * 
 * @returns Updated card parameters for next review
 * @returns result.repetitions - New repetition count
 * @returns result.easinessFactor - Updated EF (clamped to [1.3, 2.5])
 * @returns result.interval - Days until next review
 * 
 * @see Quality enum for rating definitions
 * @see https://www.supermemo.com/en/archives1990-2015/english/ol/sm2 - Original SM-2 algorithm
 */
export function calculateSM2(input: SM2Input): SM2Result {
  const { quality, repetitions, easinessFactor, previousInterval } = input;

  // Calculate new easiness factor
  let newEF = easinessFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
  newEF = Math.max(MIN_EF, Math.min(MAX_EF, newEF));

  // Reset for incorrect responses (quality < 2)
  if (quality < Quality.Good) {
    return {
      repetitions: 0,
      easinessFactor: newEF,
      interval: 1,
    };
  }

  // Correct response (quality >= 2)
  const newRepetitions = repetitions + 1;
  let interval: number;

  if (newRepetitions === 1) {
    interval = 1;
  } else if (newRepetitions === 2) {
    interval = 6;
  } else {
    interval = Math.round(previousInterval * newEF);
  }

  return {
    repetitions: newRepetitions,
    easinessFactor: newEF,
    interval,
  };
}

/**
 * Derive a 0-5 MasteryLevel from the SM-2 easiness factor.
 * 
 * This function converts the continuous EF value (1.3-2.5) into a discrete
 * mastery level (0-5) for use in the UI and progress analytics. The mastery
 * level provides a user-friendly representation of card difficulty/strength.
 * 
 * **Mastery Level Thresholds:**
 * - **0 (Not Started)**: EF < 1.3 (edge case - shouldn't occur in practice)
 * - **1 (Struggling)**: EF 1.3-1.5 - Very difficult cards, frequent reviews
 * - **2 (Learning)**: EF 1.6-1.8 - Difficult cards, still building memory
 * - **3 (Familiar)**: EF 1.9-2.1 - Moderate recall, stable progress
 * - **4 (Strong)**: EF 2.2-2.3 - Good recall, longer intervals
 * - **5 (Mastered)**: EF 2.4-2.5 - Excellent recall, maximum intervals
 * 
 * **UI Color Coding:**
 * - 0: Grey (not started)
 * - 1-2: Red/Orange (learning)
 * - 3: Yellow (familiar)
 * - 4-5: Green (mastered)
 * 
 * @param easinessFactor - SM-2 easiness factor (typically 1.3-2.5)
 * @returns Mastery level 0-5
 * 
 * @example
 * deriveClampedMasteryLevel(1.4) // Returns 1 (Struggling)
 * deriveClampedMasteryLevel(2.0) // Returns 3 (Familiar)
 * deriveClampedMasteryLevel(2.5) // Returns 5 (Mastered)
 */
export function deriveClampedMasteryLevel(easinessFactor: number): MasteryLevel {
  if (easinessFactor < 1.3) return 0;
  if (easinessFactor <= 1.5) return 1;
  if (easinessFactor <= 1.8) return 2;
  if (easinessFactor <= 2.1) return 3;
  if (easinessFactor <= 2.3) return 4;
  return 5;
}

export { DEFAULT_EF, MIN_EF, MAX_EF };
