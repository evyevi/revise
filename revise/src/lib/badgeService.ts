export type BadgeType =
  | 'first-step'
  | 'dedicated-student'
  | 'on-fire'
  | 'unstoppable'
  | 'quiz-champion'
  | 'flashcard-master'
  | 'test-ready';

export interface Badge {
  id: BadgeType;
  name: string;
  description: string;
  icon: string;
  condition: string;
}

export interface BadgeUnlockContext {
  sessionCount: number;
  currentStreak: number;
  quizScoresInSession: number[];
  totalFlashcardsCompleted: number;
  studyPlansCompleted: number;
}

/**
 * Badge unlock thresholds used to determine when badges are awarded.
 * Centralizes all magic numbers for easier maintenance.
 */
const BADGE_THRESHOLDS = {
  'first-step': { sessionCount: 1 },
  'dedicated-student': { streak: 3 },
  'on-fire': { streak: 5 },
  'unstoppable': { streak: 7 },
  'quiz-champion': { perfectScore: 100 },
  'flashcard-master': { flashcards: 50 },
  'test-ready': { plansCompleted: 1 },
} as const;

const BADGE_DEFINITIONS: Badge[] = [
  {
    id: 'first-step',
    name: 'First Step',
    description: 'Complete your first study session',
    icon: '🎯',
    condition: 'Complete 1 study session',
  },
  {
    id: 'dedicated-student',
    name: 'Dedicated Student',
    description: 'Maintain a 3-day study streak',
    icon: '📚',
    condition: 'Study for 3 days in a row',
  },
  {
    id: 'on-fire',
    name: 'On Fire!',
    description: 'Maintain a 5-day study streak',
    icon: '🔥',
    condition: 'Study for 5 days in a row',
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable!',
    description: 'Maintain a 7-day study streak',
    icon: '⚡',
    condition: 'Study for 7 days in a row',
  },
  {
    id: 'quiz-champion',
    name: 'Quiz Champion',
    description: 'Score 100% on any quiz',
    icon: '🏆',
    condition: 'Get a perfect score',
  },
  {
    id: 'flashcard-master',
    name: 'Flashcard Master',
    description: 'Complete 50 flashcards',
    icon: '💪',
    condition: 'Complete 50 flashcards',
  },
  {
    id: 'test-ready',
    name: 'Test Ready!',
    description: 'Complete an entire study plan',
    icon: '✅',
    condition: 'Finish a complete study plan',
  },
];

/**
 * Returns all available badge definitions in the system.
 * 
 * @returns Array of all badge definitions with metadata (id, name, description, icon, condition)
 * 
 * @example
 * ```ts
 * const badges = getAllBadges();
 * console.log(badges.length); // 7
 * console.log(badges[0].name); // "First Step"
 * ```
 */
export function getAllBadges(): Badge[] {
  return BADGE_DEFINITIONS;
}

/**
 * Retrieves metadata for a specific badge by its ID.
 * 
 * @param badgeId - The unique identifier of the badge
 * @returns Badge metadata object if found, undefined otherwise
 * 
 * @example
 * ```ts
 * const badge = getBadgeMetadata('first-step');
 * if (badge) {
 *   console.log(badge.name); // "First Step"
 *   console.log(badge.icon); // "🎯"
 * }
 * ```
 */
export function getBadgeMetadata(badgeId: BadgeType): Badge | undefined {
  return BADGE_DEFINITIONS.find(badge => badge.id === badgeId);
}

/**
 * Validates and sanitizes a numeric value to ensure it's safe for badge unlock checks.
 * 
 * @param value - The numeric value to validate
 * @returns 0 if invalid (NaN, Infinity, negative), otherwise the original value
 */
function sanitizeNumericValue(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

/**
 * Checks user progress against badge unlock conditions and returns newly unlocked badges.
 * Includes comprehensive input validation and handles edge cases gracefully.
 * 
 * @param currentBadges - Array of badge IDs the user has already unlocked
 * @param context - Current user progress context with session count, streaks, scores, etc.
 * @returns Array containing all badges (existing + newly unlocked)
 * 
 * @remarks
 * - Invalid context values (NaN, Infinity, negatives) are treated as 0
 * - Quiz scores outside 0-100 range are filtered out
 * - Float quiz scores are rounded to handle precision issues (99.9999 → 100)
 * - Already unlocked badges are not re-added
 * 
 * @example
 * ```ts
 * const currentBadges = ['first-step'];
 * const context = {
 *   sessionCount: 5,
 *   currentStreak: 3,
 *   quizScoresInSession: [85, 100],
 *   totalFlashcardsCompleted: 25,
 *   studyPlansCompleted: 0,
 * };
 * 
 * const updatedBadges = checkBadgeUnlock(currentBadges, context);
 * // Returns: ['first-step', 'dedicated-student', 'quiz-champion']
 * ```
 */
export function checkBadgeUnlock(
  currentBadges: BadgeType[],
  context: BadgeUnlockContext
): BadgeType[] {
  // Validate and sanitize numeric context fields
  const sessionCount = sanitizeNumericValue(context.sessionCount);
  const currentStreak = sanitizeNumericValue(context.currentStreak);
  const totalFlashcardsCompleted = sanitizeNumericValue(context.totalFlashcardsCompleted);
  const studyPlansCompleted = sanitizeNumericValue(context.studyPlansCompleted);

  // Validate and sanitize quiz scores array
  const validQuizScores = (context.quizScoresInSession || [])
    .filter(score => Number.isFinite(score) && score >= 0 && score <= 100);

  // Check if any quiz score rounds to perfect score (handles float precision)
  const hasPerfectScore = validQuizScores.some(
    score => Math.round(score) === BADGE_THRESHOLDS['quiz-champion'].perfectScore
  );

  const newlyUnlockedBadges: BadgeType[] = [];

  // Check each badge's unlock condition
  const checkAndAdd = (badgeId: BadgeType, condition: boolean) => {
    if (condition && !currentBadges.includes(badgeId)) {
      newlyUnlockedBadges.push(badgeId);
    }
  };

  checkAndAdd('first-step', sessionCount >= BADGE_THRESHOLDS['first-step'].sessionCount);
  checkAndAdd('dedicated-student', currentStreak >= BADGE_THRESHOLDS['dedicated-student'].streak);
  checkAndAdd('on-fire', currentStreak >= BADGE_THRESHOLDS['on-fire'].streak);
  checkAndAdd('unstoppable', currentStreak >= BADGE_THRESHOLDS['unstoppable'].streak);
  checkAndAdd('quiz-champion', hasPerfectScore);
  checkAndAdd('flashcard-master', totalFlashcardsCompleted >= BADGE_THRESHOLDS['flashcard-master'].flashcards);
  checkAndAdd('test-ready', studyPlansCompleted >= BADGE_THRESHOLDS['test-ready'].plansCompleted);

  // Return all badges (current + newly unlocked)
  return [...currentBadges, ...newlyUnlockedBadges];
}
