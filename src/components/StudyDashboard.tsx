import { motion } from 'framer-motion';

interface StudyDashboardProps {
  xp: number;
  streak: number;
  activePlans: number;
  badges?: number;
  nextBadgeProgress?: { current: number; target: number; name: string };
}

export function StudyDashboard({
  xp,
  streak,
  activePlans,
  badges = 0,
  nextBadgeProgress,
}: StudyDashboardProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {/* XP */}
      <motion.div
        className="bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl p-4"
        whileHover={{ scale: 1.02 }}
      >
        <p className="text-xs text-gray-600 mb-1">Total XP</p>
        <p className="text-2xl font-bold text-primary-600">♥ {xp}</p>
        <motion.p
          className="text-xs text-primary-500 mt-1"
          animate={{ opacity: [0.6, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ✨ level up soon
        </motion.p>
      </motion.div>

      {/* Streak */}
      <motion.div
        className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl p-4"
        whileHover={{ scale: 1.02 }}
      >
        <p className="text-xs text-gray-600 mb-1">Streak</p>
        <p className="text-2xl font-bold text-orange-600">🔥 {streak}</p>
        {nextBadgeProgress && (
          <p className="text-xs text-orange-500 mt-1">
            {nextBadgeProgress.target - nextBadgeProgress.current} more to {nextBadgeProgress.name}
          </p>
        )}
      </motion.div>

      {/* Badges */}
      <motion.div
        className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl p-4"
        whileHover={{ scale: 1.02 }}
      >
        <p className="text-xs text-gray-600 mb-1">Badges</p>
        <p className="text-2xl font-bold text-purple-600">🏆 {badges}/7</p>
      </motion.div>

      {/* Active Plans */}
      <motion.div
        className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl p-4"
        whileHover={{ scale: 1.02 }}
      >
        <p className="text-xs text-gray-600 mb-1">Active Plans</p>
        <p className="text-2xl font-bold text-blue-600">{activePlans}</p>
      </motion.div>
    </div>
  );
}
