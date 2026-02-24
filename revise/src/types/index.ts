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
  masteryLevel: number;
  needsPractice?: boolean;
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
  responseTime: Date;
}

export interface QuizAttempt {
  questionId: string;
  selectedAnswer: number;
  correct: boolean;
  timeSpent?: number;
}

export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;
