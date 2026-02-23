import { db } from './db';
import type { StudyDay } from '../types';

export async function getTodayStudyDay(planId: string): Promise<StudyDay | undefined> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = await db.studyDays
    .where('planId')
    .equals(planId)
    .toArray();

  return days.find(
    (d) => d.date.toDateString() === today.toDateString()
  );
}

export async function getStudyDayById(dayId: string): Promise<StudyDay | undefined> {
  return db.studyDays.get(dayId);
}

export async function getPlanWithTopics(planId: string) {
  const plan = await db.studyPlans.get(planId);
  if (!plan) return null;

  const days = await db.studyDays.where('planId').equals(planId).toArray();
  
  return { plan, days };
}

export async function getCardsByTopicIds(topicIds: string[]) {
  const cards = await db.flashcards
    .where('topicId')
    .anyOf(topicIds)
    .toArray();
  
  return cards;
}

export async function getQuizzesByTopicIds(topicIds: string[]) {
  const quizzes = await db.quizQuestions
    .where('topicId')
    .anyOf(topicIds)
    .toArray();
  
  return quizzes;
}
