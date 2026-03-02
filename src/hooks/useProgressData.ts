import { useState, useEffect, useCallback } from 'react';
import { db, getUserStats } from '../lib/db';
import {
  getStudyActivity,
  getPlanProgress,
  getTopicMasteryData,
  getRecentQuizScores,
  getSM2Statistics,
  type SM2Statistics,
} from '../lib/progressService';
import type { PlanProgressEntry } from '../components/progress/PlanProgressList';
import type {
  StudyActivityEntry,
  TopicMasteryEntry,
  QuizScoreEntry,
} from '../lib/progressService';
import type { UserStats } from '../types';

const RECENT_QUIZ_LIMIT = 10;

interface ProgressData {
  isLoading: boolean;
  error: string | null;
  stats: UserStats | null;
  planProgress: PlanProgressEntry[];
  studyActivity: Map<string, StudyActivityEntry>;
  topicMastery: TopicMasteryEntry[];
  quizScores: QuizScoreEntry[];
  totalSessions: number;
  sm2Stats: SM2Statistics;
}

const INITIAL_STATE: ProgressData = {
  isLoading: true,
  error: null,
  stats: null,
  planProgress: [],
  studyActivity: new Map(),
  topicMastery: [],
  quizScores: [],
  totalSessions: 0,
  sm2Stats: {
    totalCards: 0,
    sm2Cards: 0,
    legacyCards: 0,
    averageEF: 0,
    cardsDue: 0,
    intervalRanges: {
      '1-6 days': 0,
      '1-2 weeks': 0,
      '2-4 weeks': 0,
      '4+ weeks': 0,
      'Not scheduled': 0,
    },
    masteryDistribution: {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },
  },
};

export function useProgressData(): ProgressData {
  const [state, setState] = useState<ProgressData>(INITIAL_STATE);

  const loadData = useCallback(async () => {
    try {
      const [userStats, plans, allDays, allLogs, allFlashcards] = await Promise.all([
        getUserStats(),
        db.studyPlans.toArray(),
        db.studyDays.toArray(),
        db.progressLogs.toArray(),
        db.flashcards.toArray(),
      ]);

      // Group study days by planId
      const daysByPlan = new Map<string, typeof allDays>();
      for (const day of allDays) {
        const list = daysByPlan.get(day.planId);
        if (list) {
          list.push(day);
        } else {
          daysByPlan.set(day.planId, [day]);
        }
      }

      // Build plan progress entries
      const progress: PlanProgressEntry[] = plans.map((plan) => {
        const days = daysByPlan.get(plan.id) ?? [];
        const result = getPlanProgress(days);
        return {
          planId: plan.id,
          subject: plan.subject,
          completed: result.completed,
          total: result.total,
          percentage: result.percentage,
          testDate: plan.testDate,
        };
      });

      // Collect all topics across plans and compute mastery
      const allTopics = plans.flatMap((p) => p.topics);

      // Calculate SM-2 statistics
      const sm2Statistics = getSM2Statistics(allFlashcards);

      setState({
        isLoading: false,
        error: null,
        stats: userStats,
        totalSessions: allLogs.length,
        studyActivity: getStudyActivity(allLogs),
        quizScores: getRecentQuizScores(allLogs, RECENT_QUIZ_LIMIT),
        planProgress: progress,
        topicMastery: getTopicMasteryData(allTopics, allFlashcards),
        sm2Stats: sm2Statistics,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load progress data',
      }));
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return state;
}
