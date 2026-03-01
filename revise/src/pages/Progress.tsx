import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ProgressOverview } from '../components/progress/ProgressOverview';
import { PlanProgressList } from '../components/progress/PlanProgressList';
import { TopicMasteryGrid } from '../components/progress/TopicMasteryGrid';
import { StudyCalendar } from '../components/progress/StudyCalendar';
import { QuizScoreChart } from '../components/progress/QuizScoreChart';
import { BadgeShowcase } from '../components/progress/BadgeShowcase';
import { DueCardsCard } from '../components/progress/DueCardsCard';
import { SM2StatsCard } from '../components/progress/SM2StatsCard';
import { MasteryDistributionCard } from '../components/progress/MasteryDistributionCard';
import { useProgressData } from '../hooks/useProgressData';
import { getAllBadges } from '../lib/badgeService';

export function Progress() {
  const {
    isLoading,
    error,
    stats,
    planProgress,
    studyActivity,
    topicMastery,
    quizScores,
    totalSessions,
    sm2Stats,
  } = useProgressData();

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
        <div className="p-6 text-center text-red-600">
          <p>Failed to load progress: {error}</p>
        </div>
      </Layout>
    );
  }

  const allBadges = getAllBadges();
  const totalBadges = allBadges.length;

  return (
    <Layout>
      <div className="p-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Progress</h1>

        <section className="mb-6">
          <ProgressOverview
            totalXP={stats?.totalXP ?? 0}
            currentStreak={stats?.currentStreak ?? 0}
            longestStreak={stats?.longestStreak ?? 0}
            totalSessions={totalSessions}
            badgeCount={stats?.badges.length ?? 0}
            totalBadges={totalBadges}
          />
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Study Activity</h2>
          <StudyCalendar activityDates={studyActivity} />
        </section>

        {sm2Stats.totalCards > 0 && (
          <section className="mb-6">
            <DueCardsCard
              cardsDue={sm2Stats.cardsDue}
              totalCards={sm2Stats.totalCards}
            />
          </section>
        )}

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Plan Progress</h2>
          <PlanProgressList plans={planProgress} />
        </section>

        {topicMastery.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Topic Mastery</h2>
            <TopicMasteryGrid topics={topicMastery} />
          </section>
        )}

        {sm2Stats.totalCards > 0 && (
          <>
            <section className="mb-6">
              <SM2StatsCard stats={sm2Stats} />
            </section>

            <section className="mb-6">
              <MasteryDistributionCard
                distribution={sm2Stats.masteryDistribution}
                totalCards={sm2Stats.totalCards}
              />
            </section>
          </>
        )}

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Recent Quiz Scores</h2>
          <QuizScoreChart scores={quizScores} />
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Badges</h2>
          <BadgeShowcase earnedBadges={stats?.badges ?? []} badges={allBadges} />
        </section>
      </div>
    </Layout>
  );
}
