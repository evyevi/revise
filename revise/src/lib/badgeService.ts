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

export function getAllBadges(): Badge[] {
  return BADGE_DEFINITIONS;
}

export function getBadgeMetadata(badgeId: BadgeType): Badge | undefined {
  return BADGE_DEFINITIONS.find(badge => badge.id === badgeId);
}

export function checkBadgeUnlock(
  currentBadges: BadgeType[],
  context: BadgeUnlockContext
): BadgeType[] {
  const newlyUnlockedBadges: BadgeType[] = [];

  // Check each badge's unlock condition
  const checkAndAdd = (badgeId: BadgeType, condition: boolean) => {
    if (condition && !currentBadges.includes(badgeId)) {
      newlyUnlockedBadges.push(badgeId);
    }
  };

  checkAndAdd('first-step', context.sessionCount >= 1);
  checkAndAdd('dedicated-student', context.currentStreak >= 3);
  checkAndAdd('on-fire', context.currentStreak >= 5);
  checkAndAdd('unstoppable', context.currentStreak >= 7);
  checkAndAdd('quiz-champion', context.quizScoresInSession.includes(100));
  checkAndAdd('flashcard-master', context.totalFlashcardsCompleted >= 50);
  checkAndAdd('test-ready', context.studyPlansCompleted >= 1);

  // Return all badges (current + newly unlocked)
  return [...currentBadges, ...newlyUnlockedBadges];
}
