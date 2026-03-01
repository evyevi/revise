import { motion } from 'framer-motion';

interface DueCardsCardProps {
  cardsDue: number;
  totalCards: number;
}

export function DueCardsCard({ cardsDue, totalCards }: DueCardsCardProps) {
  const percentage = totalCards > 0 ? Math.round((cardsDue / totalCards) * 100) : 0;
  
  const getStatusColor = () => {
    if (cardsDue === 0) return 'from-green-100 to-green-50';
    if (percentage < 20) return 'from-blue-100 to-blue-50';
    if (percentage < 50) return 'from-yellow-100 to-yellow-50';
    return 'from-red-100 to-red-50';
  };

  const getStatusEmoji = () => {
    if (cardsDue === 0) return '✅';
    if (percentage < 20) return '📝';
    if (percentage < 50) return '⚠️';
    return '🔥';
  };

  const getStatusMessage = () => {
    if (cardsDue === 0) return 'All caught up!';
    if (percentage < 20) return 'Just a few reviews';
    if (percentage < 50) return 'Time to study';
    return 'Many cards waiting';
  };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`bg-gradient-to-br ${getStatusColor()} rounded-2xl p-6 shadow-sm`}
      data-testid="due-cards-card"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">Cards Due for Review</h3>
        <span className="text-3xl" aria-hidden="true">{getStatusEmoji()}</span>
      </div>
      
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-4xl font-bold text-gray-900" data-testid="cards-due-count">{cardsDue}</span>
        <span className="text-lg text-gray-600">of {totalCards}</span>
      </div>

      <div className="mb-3">
        <div className="h-3 bg-white/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gray-800 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.6, delay: 0.2 }}
          />
        </div>
      </div>

      <p className="text-sm font-medium text-gray-700">{getStatusMessage()}</p>
    </motion.div>
  );
}
