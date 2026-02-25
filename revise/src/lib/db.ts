import Dexie, { type Table } from 'dexie';
import type {
  StudyPlan,
  StudyDay,
  Flashcard,
  QuizQuestion,
  ProgressLog,
  UserStats,
  UploadedFile,
} from '../types';
import { updateStreak } from './streakService';

export class StudyPlannerDB extends Dexie {
  studyPlans!: Table<StudyPlan, string>;
  studyDays!: Table<StudyDay, string>;
  flashcards!: Table<Flashcard, string>;
  quizQuestions!: Table<QuizQuestion, string>;
  progressLogs!: Table<ProgressLog, string>;
  userStats!: Table<UserStats, string>;
  uploadedFiles!: Table<UploadedFile, string>;

  constructor() {
    super('StudyPlannerDB');
    
    this.version(1).stores({
      studyPlans: 'id, testDate, createdDate',
      studyDays: 'id, planId, date, dayNumber, completed',
      flashcards: 'id, topicId, firstShownDate',
      quizQuestions: 'id, topicId',
      progressLogs: 'id, planId, dayId, completedAt',
      userStats: 'id',
      uploadedFiles: 'id, planId, uploadedAt',
    });
  }
}

export const db = new StudyPlannerDB();

// Initialize user stats if not exists
export async function initUserStats(): Promise<UserStats> {
  const existing = await db.userStats.get('default');
  if (existing) return existing;
  
  const newStats: UserStats = {
    id: 'default',
    totalXP: 0,
    currentStreak: 0,
    longestStreak: 0,
    badges: [],
  };
  
  await db.userStats.add(newStats);
  return newStats;
}

// Get or create user stats
export async function getUserStats(): Promise<UserStats> {
  const stats = await db.userStats.get('default');
  return stats || initUserStats();
}

export interface SessionCompletionContext {
  xpEarned: number;
  newBadges?: string[];
  quizScoresInSession?: number[];
  flashcardsCompleted?: number;
}

export async function updateUserStatsOnSessionComplete(
  context: SessionCompletionContext
): Promise<UserStats> {
  const stats = await getUserStats();
  const today = new Date();

  // Calculate streak update
  const streakUpdate = updateStreak(
    stats.currentStreak,
    stats.lastStudyDate,
    stats.longestStreak
  );

  // Update stats
  await db.userStats.update('default', {
    totalXP: stats.totalXP + context.xpEarned,
    currentStreak: streakUpdate.currentStreak,
    longestStreak: streakUpdate.longestStreak,
    badges: context.newBadges 
      ? Array.from(new Set([...stats.badges, ...context.newBadges]))
      : stats.badges,
    lastStudyDate: today,
  });

  return (await db.userStats.get('default'))!;
}
