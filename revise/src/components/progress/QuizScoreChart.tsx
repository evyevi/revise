import { motion } from 'framer-motion';
import type { QuizScoreEntry } from '../../lib/progressService';

interface QuizScoreChartProps {
  scores: QuizScoreEntry[];
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'from-green-400 to-green-500';
  if (score >= 70) return 'from-yellow-400 to-yellow-500';
  if (score >= 50) return 'from-orange-400 to-orange-500';
  return 'from-red-400 to-red-500';
}

export function QuizScoreChart({ scores }: QuizScoreChartProps) {
  if (scores.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 text-center text-gray-400">
        <div className="text-3xl mb-2">📝</div>
        <p>No quiz scores yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6">
      <div className="flex items-end justify-around h-40">
        {scores.map((entry, index) => (
          <div
            key={entry.date}
            className="flex-1 flex flex-col items-center justify-end h-full"
          >
            <span className="text-xs font-semibold text-gray-600 mb-1">
              {entry.score}%
            </span>
            <motion.div
              className={`w-8 rounded-t-md bg-gradient-to-t ${getScoreColor(entry.score)}`}
              initial={{ height: 0 }}
              animate={{ height: `${entry.score}%` }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            />
            <span className="text-xs text-gray-500 mt-1">
              {formatDateLabel(entry.date)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
