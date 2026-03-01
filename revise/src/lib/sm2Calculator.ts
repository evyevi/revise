import type { MasteryLevel } from '../types';

/**
 * Quality ratings for SM-2 spaced repetition (0-3)
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

const MIN_EF = 1.3;
const MAX_EF = 2.5;
const DEFAULT_EF = 2.5;

/**
 * Calculate next review parameters using SuperMemo 2 algorithm
 * 
 * @param input - Current card state and quality rating
 * @returns Updated repetitions, easiness factor, and interval
 * 
 * Algorithm:
 * - EF' = EF + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02))
 * - EF is clamped to [1.3, 2.5]
 * - If q < 2: reset repetitions to 0, interval = 1
 * - If q >= 2:
 *   - rep 0 → 1: interval = 1
 *   - rep 1 → 2: interval = 6
 *   - rep 2+ → n: interval = previousInterval * EF
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
 * Derive a 0-5 MasteryLevel from easinessFactor for backward compatibility
 * with the progress dashboard and analytics.
 * 
 * Mapping:
 * - EF < 1.3: 0 (shouldn't happen, but handle edge case)
 * - EF 1.3-1.5: 1 (struggling)
 * - EF 1.6-1.8: 2 (learning)
 * - EF 1.9-2.1: 3 (familiar)
 * - EF 2.2-2.3: 4 (strong)
 * - EF 2.4-2.5: 5 (mastered)
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
