import { useState, useEffect, useCallback } from 'react';
import { db, getUserStats } from '../lib/db';
import {
  getStudyActivity,
  getPlanProgress,
  getTopicMasteryData,
  getRecentQuizScores,
} from '../lib/progressService';
import type { PlanProgressEntry } from '../components/progress/PlanProgressList';
import type {
  StudyActivityEntry,
  TopicMasteryEntry,
  QuizScoreEntry,
} from '../lib/progressService';
import type { UserStats } from '../types';

interface ProgressData {
  isLoading: boolean;
  error: string | null;
  stats: UserStats | null;
  planProgress: PlanProgressEntry[];
  studyActivity: Map<string, StudyActivityEntry>;
  topicMastery: TopicMasteryEntry[];
  quizScores: QuizScoreEntry[];
  totalSessions: number;
}

export function useProgressData(): ProgressData {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [planProgress, setPlanProgress] = useState<PlanProgressEntry[]>([]);
  const [studyActivity, setStudyActivity] = useState<Map<string, StudyActivityEntry>>(new Map());
  const [topicMastery, setTopicMastery] = useState<TopicMasteryEntry[]>([]);
  const [quizScores, setQuizScores] = useState<QuizScoreEntry[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [userStats, plans, allDays, allLogs, allFlashcards] = await Promise.all([
        getUserStats(),
        db.studyPlans.toArray(),
        db.studyDays.toArray(),
        db.progressLogs.toArray(),
        db.flashcards.toArray(),
      ]);

      setStats(userStats);
      setTotalSessions(allLogs.length);
      setStudyActivity(getStudyActivity(allLogs));
      setQuizScores(getRecentQuizScores(allLogs, 10));

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
      setPlanProgress(progress);

      // Collect all topics across plans and compute mastery
      const allTopics = plans.flatMap((p) => p.topics);
      setTopicMastery(getTopicMasteryData(allTopics, allFlashcards));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return {
    isLoading,
    error,
    stats,
    planProgress,
    studyActivity,
    topicMastery,
    quizScores,
    totalSessions,
  };
}
