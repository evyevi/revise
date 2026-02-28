import type { ProgressLog, StudyDay, Topic, Flashcard } from '../types';

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
 * Topics with no matching flashcards get averageMastery 0.
 */
export function getTopicMasteryData(
  topics: Topic[],
  flashcards: Flashcard[],
): TopicMasteryEntry[] {
  // Build a lookup: topicId → list of mastery levels
  const masteryByTopic = new Map<string, number[]>();
  for (const fc of flashcards) {
    const list = masteryByTopic.get(fc.topicId);
    if (list) {
      list.push(fc.masteryLevel);
    } else {
      masteryByTopic.set(fc.topicId, [fc.masteryLevel]);
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
