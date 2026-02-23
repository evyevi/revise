import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { StudyDashboard } from '../components/StudyDashboard';
import { PlanCard } from '../components/PlanCard';
import { db, getUserStats } from '../lib/db';
import type { StudyPlan } from '../types';

export function Home() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [stats, setStats] = useState({
    xp: 0,
    streak: 0,
    totalPlans: 0,
    activePlans: 0,
  });
  const [dayProgress, setDayProgress] = useState<Map<string, number>>(new Map());
  const [todayCompleted, setTodayCompleted] = useState<Set<string>>(new Set());

  const loadData = async () => {
    // Load user stats
    const userStats = await getUserStats();
    setStats({
      xp: userStats.totalXP,
      streak: userStats.currentStreak,
      totalPlans: 0, // Will calculate from completed plans
      activePlans: 0,
    });

    // Load all study plans
    const allPlans = await db.studyPlans.toArray();
    setPlans(allPlans);

    // Calculate progress for each plan
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const progressMap = new Map<string, number>();
    const completedTodaySet = new Set<string>();

    for (const plan of allPlans) {
      const days = await db.studyDays.where('planId').equals(plan.id).toArray();
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
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

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
          <a
            href="/create-plan"
            className="inline-block bg-primary-500 text-white py-3 px-6 rounded-xl font-semibold active:scale-95 transition-transform"
          >
            + Create New Plan
          </a>
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

        <StudyDashboard {...stats} />

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
        <a
          href="/create-plan"
          className="block w-full bg-white border-2 border-dashed border-primary-300 text-primary-600 py-3 px-4 rounded-xl font-semibold text-center hover:bg-primary-50 transition-colors"
        >
          + Add New Plan
        </a>
      </div>
    </Layout>
  );
}
