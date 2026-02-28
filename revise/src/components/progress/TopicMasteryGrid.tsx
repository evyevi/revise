import { motion } from 'framer-motion';
import type { TopicMasteryEntry } from '../../lib/progressService';

interface TopicMasteryGridProps {
  topics: TopicMasteryEntry[];
}

const MASTERY_LABELS: Record<number, string> = {
  0: 'New',
  1: 'Learning',
  2: 'Learning',
  3: 'Familiar',
  4: 'Familiar',
  5: 'Mastered',
};

const MASTERY_COLORS: Record<number, string> = {
  0: 'bg-gray-100 text-gray-500',
  1: 'bg-red-100 text-red-600',
  2: 'bg-orange-100 text-orange-600',
  3: 'bg-yellow-100 text-yellow-600',
  4: 'bg-green-100 text-green-600',
  5: 'bg-primary-100 text-primary-600',
};

export function TopicMasteryGrid({ topics }: TopicMasteryGridProps) {
  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <span className="text-3xl mb-2">🧠</span>
        <p>No topics to show</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {topics.map((topic, index) => {
        const level = Math.round(Math.min(5, Math.max(0, topic.averageMastery)));
        const label = MASTERY_LABELS[level] ?? 'New';
        const colorClass = MASTERY_COLORS[level] ?? MASTERY_COLORS[0];
        const widthPercent = (topic.averageMastery / 5) * 100;

        return (
          <motion.div
            key={topic.topicId}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.05, duration: 0.25 }}
            className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
          >
            <p className="text-sm font-medium text-gray-800 truncate">{topic.topicName}</p>

            <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-primary-500 transition-all"
                style={{ width: `${widthPercent}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
              >
                {label}
              </span>
              <span className="text-xs text-gray-400">{topic.cardCount} cards</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
