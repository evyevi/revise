import type { Quality } from '../lib/sm2Calculator';

export interface StudyPlan {
  id: string;
  subject: string;
  testDate: Date;
  createdDate: Date;
  totalDays: number;
  suggestedMinutesPerDay: number;
  topics: Topic[];
}

export interface Topic {
  id: string;
  name: string;
  importance: 'high' | 'medium' | 'low';
  keyPoints: string[];
}

export interface StudyDay {
  id: string;
  planId: string;
  dayNumber: number;
  date: Date;
  completed: boolean;
  newTopicIds: string[];
  reviewTopicIds: string[];
  flashcardIds: string[];
  quizIds: string[];
  estimatedMinutes: number;
}

export interface Flashcard {
  id: string;
  topicId: string;
  front: string;
  back: string;
  firstShownDate?: Date;
  reviewDates: Date[];
  masteryLevel: MasteryLevel;
  needsPractice?: boolean;
  // SM-2 spaced repetition fields
  easinessFactor?: number; // 1.3-2.5, default 2.5
  interval?: number; // days until next review
  repetitions?: number; // consecutive correct reviews
  nextReviewDate?: Date; // when card should be reviewed next
}

export interface QuizQuestion {
  id: string;
  topicId: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface ProgressLog {
  id: string;
  planId: string;
  dayId: string;
  completedAt: Date;
  xpEarned: number;
  quizScore: number;
  flashcardsReviewed: number;
}

export interface UserStats {
  id: string;
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate?: Date;
  badges: string[];
}

export interface UploadedFile {
  id: string;
  planId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  extractedText: string;
  fileBlob?: Blob;
}

export interface FlashcardResponse {
  flashcardId: string;
  correct: boolean;
  respondedAt: Date;
}

export interface QuizAttempt {
  questionId: string;
  selectedAnswer: number;
  correct: boolean;
  /** Duration in milliseconds */
  timeSpent?: number;
  /** SM-2 quality rating (correct → Good, incorrect → Again) */
  quality?: Quality;
}

/**
 * Mastery level scale (0-5):
 * 0 = new (never reviewed)
 * 1-2 = learning (needs practice)
 * 3-4 = familiar (mostly understood)
 * 5 = mastered (fluent)
 */
export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;
