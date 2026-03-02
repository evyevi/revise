import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import {
  getTodayStudyDay,
  getStudyDayById,
  getPlanWithTopics,
  getCardsByTopicIds,
  getQuizzesByTopicIds,
  getFlashcardsDueForReview,
} from '../planQueries';
import type { StudyPlan, StudyDay, Flashcard, QuizQuestion, Topic } from '../../types';

describe('planQueries', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.studyPlans.clear();
    await db.studyDays.clear();
    await db.flashcards.clear();
    await db.quizQuestions.clear();
  });

  describe('getTodayStudyDay', () => {
    it('returns today\'s study day for a given plan', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const planId = 'plan-1';
      
      // Add study days
      const todayDay: StudyDay = {
        id: 'day-1',
        planId,
        dayNumber: 1,
        date: today,
        completed: false,
        newTopicIds: ['topic-1'],
        reviewTopicIds: [],
        estimatedMinutes: 30,
      };

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const yesterdayDay: StudyDay = {
        id: 'day-2',
        planId,
        dayNumber: 0,
        date: yesterday,
        completed: true,
        newTopicIds: [],
        reviewTopicIds: [],
        estimatedMinutes: 30,
      };

      await db.studyDays.bulkAdd([todayDay, yesterdayDay]);

      const result = await getTodayStudyDay(planId);

      expect(result).toBeDefined();
      expect(result?.id).toBe('day-1');
      expect(result?.date.toDateString()).toBe(today.toDateString());
    });

    it('returns undefined when no study day exists for today', async () => {
      const planId = 'plan-1';
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const yesterdayDay: StudyDay = {
        id: 'day-1',
        planId,
        dayNumber: 0,
        date: yesterday,
        completed: true,
        newTopicIds: [],
        reviewTopicIds: [],
        estimatedMinutes: 30,
      };

      await db.studyDays.add(yesterdayDay);

      const result = await getTodayStudyDay(planId);

      expect(result).toBeUndefined();
    });

    it('returns undefined for non-existent plan', async () => {
      const result = await getTodayStudyDay('non-existent-plan');
      expect(result).toBeUndefined();
    });
  });

  describe('getStudyDayById', () => {
    it('retrieves a study day by its ID', async () => {
      const day: StudyDay = {
        id: 'day-123',
        planId: 'plan-1',
        dayNumber: 5,
        date: new Date(),
        completed: false,
        newTopicIds: ['topic-1', 'topic-2'],
        reviewTopicIds: ['topic-3'],
        estimatedMinutes: 45,
      };

      await db.studyDays.add(day);

      const result = await getStudyDayById('day-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('day-123');
      expect(result?.dayNumber).toBe(5);
      expect(result?.newTopicIds).toEqual(['topic-1', 'topic-2']);
    });

    it('returns undefined for non-existent day ID', async () => {
      const result = await getStudyDayById('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getPlanWithTopics', () => {
    it('retrieves a plan with its study days', async () => {
      const topics: Topic[] = [
        {
          id: 'topic-1',
          name: 'Topic 1',
          importance: 'high',
          keyPoints: ['Point 1', 'Point 2'],
        },
        {
          id: 'topic-2',
          name: 'Topic 2',
          importance: 'medium',
          keyPoints: ['Point A'],
        },
      ];

      const plan: StudyPlan = {
        id: 'plan-1',
        subject: 'Mathematics',
        testDate: new Date('2026-03-15'),
        createdDate: new Date(),
        totalDays: 10,
        suggestedMinutesPerDay: 30,
        topics,
      };

      const day1: StudyDay = {
        id: 'day-1',
        planId: 'plan-1',
        dayNumber: 1,
        date: new Date(),
        completed: false,
        newTopicIds: ['topic-1'],
        reviewTopicIds: [],
        estimatedMinutes: 30,
      };

      const day2: StudyDay = {
        id: 'day-2',
        planId: 'plan-1',
        dayNumber: 2,
        date: new Date(),
        completed: false,
        newTopicIds: ['topic-2'],
        reviewTopicIds: [],
        estimatedMinutes: 30,
      };

      await db.studyPlans.add(plan);
      await db.studyDays.bulkAdd([day1, day2]);

      const result = await getPlanWithTopics('plan-1');

      expect(result).not.toBeNull();
      expect(result?.plan.id).toBe('plan-1');
      expect(result?.plan.subject).toBe('Mathematics');
      expect(result?.plan.topics).toHaveLength(2);
      expect(result?.days).toHaveLength(2);
      expect(result?.days[0].id).toBe('day-1');
      expect(result?.days[1].id).toBe('day-2');
    });

    it('returns null for non-existent plan', async () => {
      const result = await getPlanWithTopics('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getCardsByTopicIds', () => {
    it('retrieves flashcards for given topic IDs', async () => {
      const cards: Flashcard[] = [
        {
          id: 'card-1',
          topicId: 'topic-1',
          front: 'Question 1',
          back: 'Answer 1',
          reviewDates: [],
          masteryLevel: 0,
        },
        {
          id: 'card-2',
          topicId: 'topic-1',
          front: 'Question 2',
          back: 'Answer 2',
          reviewDates: [],
          masteryLevel: 1,
        },
        {
          id: 'card-3',
          topicId: 'topic-2',
          front: 'Question 3',
          back: 'Answer 3',
          reviewDates: [],
          masteryLevel: 0,
        },
        {
          id: 'card-4',
          topicId: 'topic-3',
          front: 'Question 4',
          back: 'Answer 4',
          reviewDates: [],
          masteryLevel: 0,
        },
      ];

      await db.flashcards.bulkAdd(cards);

      const result = await getCardsByTopicIds(['topic-1', 'topic-2']);

      expect(result).toHaveLength(3);
      expect(result.map((c) => c.id).sort()).toEqual(['card-1', 'card-2', 'card-3']);
    });

    it('returns empty array when no cards match topic IDs', async () => {
      const card: Flashcard = {
        id: 'card-1',
        topicId: 'topic-1',
        front: 'Question',
        back: 'Answer',
        reviewDates: [],
        masteryLevel: 0,
      };

      await db.flashcards.add(card);

      const result = await getCardsByTopicIds(['topic-2', 'topic-3']);

      expect(result).toHaveLength(0);
    });

    it('returns empty array for empty topic IDs', async () => {
      const result = await getCardsByTopicIds([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getFlashcardsDueForReview', () => {
    it('returns cards with nextReviewDate in the past', async () => {
      const baseDate = new Date();
      baseDate.setHours(12, 0, 0, 0);
      const yesterday = new Date(baseDate);
      yesterday.setDate(yesterday.getDate() - 1);

      const cards: Flashcard[] = [
        {
          id: 'card-1',
          topicId: 'topic-1',
          front: 'Past question',
          back: 'Past answer',
          reviewDates: [],
          masteryLevel: 0,
          nextReviewDate: yesterday,
        },
        {
          id: 'card-2',
          topicId: 'topic-1',
          front: 'Future question',
          back: 'Future answer',
          reviewDates: [],
          masteryLevel: 0,
          nextReviewDate: new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      ];

      await db.flashcards.bulkAdd(cards);

      const result = await getFlashcardsDueForReview(['card-1', 'card-2']);

      expect(result.map((card) => card.id)).toEqual(['card-1']);
    });

    it('returns cards with no nextReviewDate (legacy cards)', async () => {
      const card: Flashcard = {
        id: 'card-legacy',
        topicId: 'topic-1',
        front: 'Legacy question',
        back: 'Legacy answer',
        reviewDates: [],
        masteryLevel: 1,
      };

      await db.flashcards.add(card);

      const result = await getFlashcardsDueForReview(['card-legacy']);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('card-legacy');
    });

    it('returns cards with nextReviewDate today', async () => {
      const today = new Date();
      today.setHours(9, 0, 0, 0);

      const card: Flashcard = {
        id: 'card-today',
        topicId: 'topic-1',
        front: 'Today question',
        back: 'Today answer',
        reviewDates: [],
        masteryLevel: 2,
        nextReviewDate: today,
      };

      await db.flashcards.add(card);

      const result = await getFlashcardsDueForReview(['card-today']);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('card-today');
    });

    it('filters out cards with nextReviewDate in the future', async () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(10, 0, 0, 0);

      const card: Flashcard = {
        id: 'card-future',
        topicId: 'topic-1',
        front: 'Future question',
        back: 'Future answer',
        reviewDates: [],
        masteryLevel: 3,
        nextReviewDate: nextWeek,
      };

      await db.flashcards.add(card);

      const result = await getFlashcardsDueForReview(['card-future']);

      expect(result).toHaveLength(0);
    });

    it('returns empty array for empty input', async () => {
      const result = await getFlashcardsDueForReview([]);

      expect(result).toEqual([]);
    });
  });

  describe('getQuizzesByTopicIds', () => {
    it('retrieves quiz questions for given topic IDs', async () => {
      const quizzes: QuizQuestion[] = [
        {
          id: 'quiz-1',
          topicId: 'topic-1',
          question: 'Q1',
          options: ['A', 'B', 'C', 'D'],
          correctAnswerIndex: 0,
          explanation: 'Explanation 1',
        },
        {
          id: 'quiz-2',
          topicId: 'topic-1',
          question: 'Q2',
          options: ['A', 'B', 'C', 'D'],
          correctAnswerIndex: 1,
          explanation: 'Explanation 2',
        },
        {
          id: 'quiz-3',
          topicId: 'topic-2',
          question: 'Q3',
          options: ['A', 'B', 'C', 'D'],
          correctAnswerIndex: 2,
          explanation: 'Explanation 3',
        },
        {
          id: 'quiz-4',
          topicId: 'topic-3',
          question: 'Q4',
          options: ['A', 'B', 'C', 'D'],
          correctAnswerIndex: 3,
          explanation: 'Explanation 4',
        },
      ];

      await db.quizQuestions.bulkAdd(quizzes);

      const result = await getQuizzesByTopicIds(['topic-1', 'topic-2']);

      expect(result).toHaveLength(3);
      expect(result.map((q) => q.id).sort()).toEqual(['quiz-1', 'quiz-2', 'quiz-3']);
    });

    it('returns empty array when no quizzes match topic IDs', async () => {
      const quiz: QuizQuestion = {
        id: 'quiz-1',
        topicId: 'topic-1',
        question: 'Q1',
        options: ['A', 'B', 'C', 'D'],
        correctAnswerIndex: 0,
        explanation: 'Explanation',
      };

      await db.quizQuestions.add(quiz);

      const result = await getQuizzesByTopicIds(['topic-2', 'topic-3']);

      expect(result).toHaveLength(0);
    });

    it('returns empty array for empty topic IDs', async () => {
      const result = await getQuizzesByTopicIds([]);
      expect(result).toHaveLength(0);
    });
  });
});
