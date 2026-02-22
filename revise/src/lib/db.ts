import Dexie, { Table } from 'dexie';
import {
  StudyPlan,
  StudyDay,
  Flashcard,
  QuizQuestion,
  ProgressLog,
  UserStats,
  UploadedFile,
} from '../types';

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
