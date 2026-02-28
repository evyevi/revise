import { motion } from 'framer-motion';

interface ProgressOverviewProps {
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  badgeCount: number;
  totalBadges: number;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface StatCardProps {
  label: string;
  value: string | number;
  emoji: string;
  gradient: string;
}

function StatCard({ label, value, emoji, gradient }: StatCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={`rounded-xl bg-gradient-to-br ${gradient} p-4 text-center shadow-sm`}
    >
      <div className="text-2xl">{emoji}</div>
      <div className="mt-1 text-xl font-bold text-gray-900">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-gray-600">{label}</div>
    </motion.div>
  );
}

export function ProgressOverview({
  totalXP,
  currentStreak,
  longestStreak,
  totalSessions,
  badgeCount,
  totalBadges,
}: ProgressOverviewProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-3 gap-3"
    >
      <StatCard
        label="Total XP"
        value={totalXP}
        emoji="♥"
        gradient="from-pink-100 to-pink-50"
      />
      <StatCard
        label="Streak"
        value={currentStreak}
        emoji="🔥"
        gradient="from-orange-100 to-orange-50"
      />
      <StatCard
        label="Badges"
        value={`${badgeCount}/${totalBadges}`}
        emoji="🏆"
        gradient="from-purple-100 to-purple-50"
      />
      <StatCard
        label="Sessions"
        value={totalSessions}
        emoji="📖"
        gradient="from-blue-100 to-blue-50"
      />
      <StatCard
        label="Best Streak"
        value={longestStreak}
        emoji="⚡"
        gradient="from-green-100 to-green-50"
      />
    </motion.div>
  );
}
