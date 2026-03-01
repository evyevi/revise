import { motion } from 'framer-motion';
import type { SM2Statistics } from '../../lib/progressService';

interface MasteryDistributionCardProps {
  distribution: SM2Statistics['masteryDistribution'];
  totalCards: number;
}

const MASTERY_LABELS = [
  { level: 0, label: 'New', color: 'bg-gray-400', emoji: '🆕' },
  { level: 1, label: 'Struggling', color: 'bg-red-400', emoji: '😓' },
  { level: 2, label: 'Learning', color: 'bg-orange-400', emoji: '📚' },
  { level: 3, label: 'Familiar', color: 'bg-yellow-400', emoji: '🙂' },
  { level: 4, label: 'Strong', color: 'bg-green-400', emoji: '💪' },
  { level: 5, label: 'Mastered', color: 'bg-primary-500', emoji: '⭐' },
];

export function MasteryDistributionCard({
  distribution,
  totalCards,
}: MasteryDistributionCardProps) {
  if (totalCards === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 text-center text-gray-400">
        <div className="text-3xl mb-2">📈</div>
        <p>No cards to analyze</p>
      </div>
    );
  }

  const maxCount = Math.max(...Object.values(distribution));

  return (
    <div className="bg-white rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Mastery Distribution</h3>
      
      <div className="space-y-3">
        {MASTERY_LABELS.map(({ level, label, color, emoji }) => {
          const count = distribution[level as keyof typeof distribution];
          const percentage = totalCards > 0 ? (count / totalCards) * 100 : 0;
          const barHeight = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div key={level} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-32 flex-shrink-0">
                <span className="text-lg" aria-hidden="true">{emoji}</span>
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </div>
              
              <div className="flex-1 relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                <motion.div
                  className={`absolute inset-0 ${color} flex items-center justify-end pr-3`}
                  initial={{ width: 0 }}
                  animate={{ width: `${barHeight}%` }}
                  transition={{ duration: 0.5, delay: level * 0.1 }}
                >
                  {count > 0 && (
                    <motion.span
                      className="text-sm font-semibold text-white"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: level * 0.1 + 0.3 }}
                    >
                      {count}
                    </motion.span>
                  )}
                </motion.div>
              </div>

              <span className="text-sm text-gray-500 w-12 text-right">
                {percentage.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-500">
          Total: {totalCards} card{totalCards !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
