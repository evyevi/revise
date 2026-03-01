import type { ProgressLog, StudyDay, Topic, Flashcard } from '../types';
import { getMasteryFromCard, isCardDue, getIntervalRange } from './dashboardUtils';

// ── Exported interfaces ──────────────────────────────────────────────

export interface StudyActivityEntry {
  sessions: number;
  xpEarned: number;
}

export interface PlanProgressResult {
  completed: number;
  total: number;
  percentage: number;
}

export interface TopicMasteryEntry {
  topicId: string;
  topicName: string;
  averageMastery: number;
  cardCount: number;
}

export interface QuizScoreEntry {
  date: string;
  score: number;
}

export interface SM2Statistics {
  totalCards: number;
  sm2Cards: number;
  legacyCards: number;
  averageEF: number;
  cardsDue: number;
  intervalRanges: {
    '1-6 days': number;
    '1-2 weeks': number;
    '2-4 weeks': number;
    '4+ weeks': number;
    'Not scheduled': number;
  };
  masteryDistribution: {
    0: number; // New
    1: number; // Struggling
    2: number; // Learning
    3: number; // Familiar
    4: number; // Strong
    5: number; // Mastered
  };
}

// ── Helper: format Date to YYYY-MM-DD (UTC) ─────────────────────────

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ── Pure aggregation functions ───────────────────────────────────────

/**
 * Groups progress logs by date (YYYY-MM-DD), returning session count
 * and total XP earned per day.
 */
export function getStudyActivity(
  logs: ProgressLog[],
): Map<string, StudyActivityEntry> {
  const map = new Map<string, StudyActivityEntry>();

  for (const log of logs) {
    const key = toDateKey(log.completedAt);
    const existing = map.get(key);

    if (existing) {
      existing.sessions += 1;
      existing.xpEarned += log.xpEarned;
    } else {
      map.set(key, { sessions: 1, xpEarned: log.xpEarned });
    }
  }

  return map;
}

/**
 * Calculates completed / total / percentage from an array of study days.
 */
export function getPlanProgress(days: StudyDay[]): PlanProgressResult {
  const total = days.length;
  if (total === 0) return { completed: 0, total: 0, percentage: 0 };

  const completed = days.filter((d) => d.completed).length;
  const percentage = Math.round((completed / total) * 100);

  return { completed, total, percentage };
}

/**
 * Calculates average mastery per topic from the provided flashcards.
 * Uses SM-2 easinessFactor if available, otherwise falls back to masteryLevel.
 * Topics with no matching flashcards get averageMastery 0.
 */
export function getTopicMasteryData(
  topics: Topic[],
  flashcards: Flashcard[],
): TopicMasteryEntry[] {
  // Build a lookup: topicId → list of mastery levels
  const masteryByTopic = new Map<string, number[]>();
  for (const fc of flashcards) {
    const mastery = getMasteryFromCard(fc);
    const list = masteryByTopic.get(fc.topicId);
    if (list) {
      list.push(mastery);
    } else {
      masteryByTopic.set(fc.topicId, [mastery]);
    }
  }

  return topics.map((topic) => {
    const levels = masteryByTopic.get(topic.id) ?? [];
    const cardCount = levels.length;
    const averageMastery =
      cardCount > 0
        ? levels.reduce((sum, v) => sum + v, 0) / cardCount
        : 0;

    return {
      topicId: topic.id,
      topicName: topic.name,
      averageMastery,
      cardCount,
    };
  });
}

/**
 * Returns the most recent `limit` quiz scores, sorted oldest → newest.
 * If there are fewer logs than `limit`, all are returned.
 */
export function getRecentQuizScores(
  logs: ProgressLog[],
  limit: number,
): QuizScoreEntry[] {
  // Sort descending by completedAt to pick the most recent
  const sorted = [...logs].sort(
    (a, b) => b.completedAt.getTime() - a.completedAt.getTime(),
  );

  // Take the most recent `limit` entries, then reverse to oldest→newest
  return sorted
    .slice(0, limit)
    .reverse()
    .map((log) => ({
      date: toDateKey(log.completedAt),
      score: log.quizScore,
    }));
}

/**
 * Calculate SM-2 statistics for the progress dashboard
 */
export function getSM2Statistics(flashcards: Flashcard[]): SM2Statistics {
  const totalCards = flashcards.length;
  let sm2Cards = 0;
  let legacyCards = 0;
  let efSum = 0;
  let cardsDue = 0;

  const intervalRanges = {
    '1-6 days': 0,
    '1-2 weeks': 0,
    '2-4 weeks': 0,
    '4+ weeks': 0,
    'Not scheduled': 0,
  };

  const masteryDistribution = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  for (const card of flashcards) {
    // Count SM-2 vs legacy cards
    if (card.easinessFactor !== undefined) {
      sm2Cards++;
      efSum += card.easinessFactor;

      // Count due cards
      if (isCardDue(card.nextReviewDate)) {
        cardsDue++;
      }

      // Interval ranges
      const range = getIntervalRange(card.interval);
      intervalRanges[range as keyof typeof intervalRanges]++;
    } else {
      legacyCards++;
      intervalRanges['Not scheduled']++;
    }

    // Mastery distribution (using derived mastery from SM-2 if available)
    const mastery = getMasteryFromCard(card);
    masteryDistribution[mastery as keyof typeof masteryDistribution]++;
  }

  const averageEF = sm2Cards > 0 ? efSum / sm2Cards : 0;

  return {
    totalCards,
    sm2Cards,
    legacyCards,
    averageEF,
    cardsDue,
    intervalRanges,
    masteryDistribution,
  };
}
