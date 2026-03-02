export interface StreakUpdate {
  currentStreak: number;
  longestStreak: number;
  shouldIncrease: boolean;
}

export const GRACE_PERIOD_DAYS = 1;
export const RESET_THRESHOLD_DAYS = 2;

/**
 * Normalize a date to midnight for consistent day comparisons
 * Returns undefined for Invalid Date objects or future dates
 */
function normalizeDate(date: Date | undefined): Date | undefined {
  if (!date) return undefined;
  
  // Check for Invalid Date
  if (isNaN(date.getTime())) return undefined;
  
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  
  // Reject future dates (logically invalid for streak tracking)
  if (normalized.getTime() > Date.now()) return undefined;
  
  return normalized;
}

/**
 * Calculate the number of days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((date2.getTime() - date1.getTime()) / msPerDay);
}

/**
 * Determines if a streak should be reset based on the last study date
 * Returns true if the gap since last study is > RESET_THRESHOLD_DAYS (i.e., 3+ days)
 * Note: RESET_THRESHOLD_DAYS=2 means the threshold is at the 3-day boundary
 * @param lastStudyDate - The date of the last study session
 * @returns true if streak should be reset, false otherwise
 */
export function shouldResetStreak(lastStudyDate: Date | undefined): boolean {
  if (!lastStudyDate) {
    return true;
  }

  const normalized = normalizeDate(lastStudyDate);
  if (!normalized) return true;

  const today = normalizeDate(new Date());
  if (!today) return true;
  const daysSinceLastStudy = daysBetween(normalized, today);

  return daysSinceLastStudy > RESET_THRESHOLD_DAYS;
}

/**
 * Checks if a streak is still active (within grace period)
 * Returns true if studied within GRACE_PERIOD_DAYS (today or yesterday)
 * @param lastStudyDate - The date of the last study session
 * @returns true if streak is active, false otherwise
 */
export function isStreakActive(lastStudyDate: Date | undefined): boolean {
  if (!lastStudyDate) {
    return false;
  }

  const normalized = normalizeDate(lastStudyDate);
  if (!normalized) return false;

  const today = normalizeDate(new Date());
  if (!today) return false;
  const daysSinceLastStudy = daysBetween(normalized, today);

  return daysSinceLastStudy <= GRACE_PERIOD_DAYS;
}

/**
 * Updates the streak based on study activity
 * Handles same-day repeated study, grace period, and streak resets
 * @param currentStreak - The current streak count (must be >= 0 and finite)
 * @param lastStudyDate - The date of the last study session
 * @param longestStreak - The longest streak achieved (optional, defaults to currentStreak, must be >= currentStreak if provided)
 * @returns StreakUpdate object with updated streak values and increase flag
 * @throws {Error} If currentStreak is negative or not finite
 * @throws {Error} If longestStreak is defined but less than currentStreak
 */
export function updateStreak(
  currentStreak: number,
  lastStudyDate: Date | undefined,
  longestStreak?: number
): StreakUpdate {
  // Validate currentStreak
  if (currentStreak < 0) {
    throw new Error('currentStreak cannot be negative');
  }
  if (!Number.isFinite(currentStreak)) {
    throw new Error('currentStreak must be a finite number');
  }
  
  // Validate longestStreak consistency
  if (longestStreak !== undefined && longestStreak < currentStreak) {
    throw new Error('longestStreak cannot be less than currentStreak');
  }
  
  const defaultLongestStreak = longestStreak ?? currentStreak;
  const today = normalizeDate(new Date());

  // Safety check: today should always normalize successfully
  if (!today) {
    return {
      currentStreak,
      longestStreak: defaultLongestStreak,
      shouldIncrease: false,
    };
  }

  // No previous study activity - start new streak
  if (!lastStudyDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, defaultLongestStreak),
      shouldIncrease: true,
    };
  }

  const normalized = normalizeDate(lastStudyDate);
  if (!normalized) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, defaultLongestStreak),
      shouldIncrease: true,
    };
  }

  const daysSinceLastStudy = daysBetween(normalized, today);

  // Same day - already studied today, don't increment
  if (daysSinceLastStudy === 0) {
    return {
      currentStreak: currentStreak,
      longestStreak: defaultLongestStreak,
      shouldIncrease: false,
    };
  }

  // Studied yesterday - increment streak
  if (daysSinceLastStudy === 1) {
    const newStreak = currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, defaultLongestStreak),
      shouldIncrease: true,
    };
  }

  // Within grace period (2 days ago) - maintain streak
  if (daysSinceLastStudy === 2) {
    return {
      currentStreak: currentStreak,
      longestStreak: defaultLongestStreak,
      shouldIncrease: false,
    };
  }

  // Gap too long - reset streak to 1
  return {
    currentStreak: 1,
    longestStreak: defaultLongestStreak,
    shouldIncrease: true,
  };
}
