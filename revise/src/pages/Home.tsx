import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StudyDashboard } from '../components/StudyDashboard';
import { PlanCard } from '../components/PlanCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { db, getUserStats } from '../lib/db';
import type { StudyPlan } from '../types';

export function Home() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [stats, setStats] = useState({
    xp: 0,
    streak: 0,
    badges: 0,
    activePlans: 0,
  });
  const [nextBadgeProgress, setNextBadgeProgress] = useState<
    { current: number; target: number; name: string } | undefined
  >(undefined);
  const [dayProgress, setDayProgress] = useState<Map<string, number>>(new Map());
  const [todayCompleted, setTodayCompleted] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getNextBadgeProgress = (currentStreak: number) => {
    if (currentStreak === 3) {
      return {
        current: 3,
        target: 5,
        name: 'On Fire! (5 days)',
      };
    }

    if (currentStreak === 5) {
      return {
        current: 5,
        target: 7,
        name: 'Unstoppable! (7 days)',
      };
    }

    return undefined;
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load user stats
      const userStats = await getUserStats();
      setStats({
        xp: userStats.totalXP,
        streak: userStats.currentStreak,
        badges: userStats.badges.length,
        activePlans: 0,
      });
      setNextBadgeProgress(getNextBadgeProgress(userStats.currentStreak));

      // Load all study plans
      const allPlans = await db.studyPlans.toArray();
      setPlans(allPlans);

      // Fix N+1 query: Fetch all study days once
      const allDays = await db.studyDays.toArray();
      const daysByPlan = new Map<string, typeof allDays>();
      allDays.forEach((day) => {
        let planDays = daysByPlan.get(day.planId);
        if (!planDays) {
          planDays = [];
          daysByPlan.set(day.planId, planDays);
        }
        planDays.push(day);
      });

      // Calculate progress for each plan
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const progressMap = new Map<string, number>();
      const completedTodaySet = new Set<string>();

      for (const plan of allPlans) {
        const days = daysByPlan.get(plan.id) || [];
        const completedCount = days.filter((d) => d.completed).length;
        progressMap.set(plan.id, completedCount);

        // Check if today's session is completed
        const todaySession = days.find(
          (d) => d.date.toDateString() === today.toDateString()
        );
        if (todaySession?.completed) {
          completedTodaySet.add(plan.id);
        }
      }

      setDayProgress(progressMap);
      setTodayCompleted(completedTodaySet);

      // Update active plans count
      setStats((prev) => ({
        ...prev,
        activePlans: allPlans.length,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => void loadData()}
            className="bg-primary-500 text-white py-2 px-4 rounded-lg"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  if (plans.length === 0) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <h1 className="text-3xl font-bold text-primary-500 mb-4">
            Study Planner ✨
          </h1>
          <p className="text-gray-600 mb-8">
            Create your first study plan to get started!
          </p>
          <Link
            to="/create-plan"
            className="inline-block bg-primary-500 text-white py-3 px-6 rounded-xl font-semibold active:scale-95 transition-transform"
          >
            + Create New Plan
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-lg mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-gray-600 text-sm">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <StudyDashboard
          xp={stats.xp}
          streak={stats.streak}
          badges={stats.badges}
          activePlans={stats.activePlans}
          nextBadgeProgress={nextBadgeProgress}
        />

        {/* Plans section */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Active Plans</h2>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              daysCompleted={dayProgress.get(plan.id) || 0}
              todayCompleted={todayCompleted.has(plan.id)}
            />
          ))}
        </div>

        {/* Create new plan button */}
        <Link
          to="/create-plan"
          className="block w-full bg-white border-2 border-dashed border-primary-300 text-primary-600 py-3 px-4 rounded-xl font-semibold text-center hover:bg-primary-50 transition-colors"
        >
          + Add New Plan
        </Link>
      </div>
    </Layout>
  );
}
