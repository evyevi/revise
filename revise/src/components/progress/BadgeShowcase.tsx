import { motion } from 'framer-motion';
import { getAllBadges } from '../../lib/badgeService';

interface BadgeShowcaseProps {
  earnedBadges: string[];
}

export function BadgeShowcase({ earnedBadges }: BadgeShowcaseProps) {
  const badges = getAllBadges();

  return (
    <div className="grid grid-cols-2 gap-3">
      {badges.map((badge, index) => {
        const isEarned = earnedBadges.includes(badge.id);

        return (
          <motion.div
            key={badge.id}
            data-testid={`badge-${badge.id}`}
            className={`rounded-xl p-3 text-center border ${
              isEarned
                ? 'border-primary-200 bg-white'
                : 'opacity-40 grayscale border-gray-200 bg-gray-50'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isEarned ? 1 : 0.4, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <div className="text-3xl mb-1">{badge.icon}</div>
            <div className="font-semibold text-sm">{badge.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {isEarned ? badge.description : badge.condition}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
