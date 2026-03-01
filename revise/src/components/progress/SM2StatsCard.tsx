import { motion } from 'framer-motion';
import type { SM2Statistics } from '../../lib/progressService';

interface SM2StatsCardProps {
  stats: SM2Statistics;
}

export function SM2StatsCard({ stats }: SM2StatsCardProps) {
  if (stats.totalCards === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 text-center text-gray-400">
        <div className="text-3xl mb-2">📊</div>
        <p>No flashcards yet</p>
      </div>
    );
  }

  const efDisplay = stats.averageEF > 0 ? stats.averageEF.toFixed(2) : 'N/A';

  return (
    <div className="bg-white rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">SM-2 Statistics</h3>
      
      <div className="space-y-4">
        {/* Card counts */}
        <div className="grid grid-cols-2 gap-3">
          <StatItem label="Total Cards" value={stats.totalCards} />
          <StatItem label="SM-2 Cards" value={stats.sm2Cards} color="text-primary-600" />
          {stats.legacyCards > 0 && (
            <StatItem label="Legacy Cards" value={stats.legacyCards} color="text-gray-500" />
          )}
        </div>

        {/* Average EF */}
        {stats.sm2Cards > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Easiness Factor</span>
              <span className="text-lg font-semibold text-gray-800">{efDisplay}</span>
            </div>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"
                initial={{ width: 0 }}
                animate={{ width: `${((stats.averageEF - 1.3) / (2.5 - 1.3)) * 100}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-gray-400">
              <span>1.3</span>
              <span>2.5</span>
            </div>
          </div>
        )}

        {/* Interval ranges */}
        {stats.sm2Cards > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Review Intervals</p>
            <div className="space-y-1">
              {Object.entries(stats.intervalRanges).map(([range, count]) => {
                if (count === 0 || range === 'Not scheduled') return null;
                const percentage = (count / stats.sm2Cards) * 100;
                return (
                  <IntervalBar
                    key={range}
                    label={range}
                    count={count}
                    percentage={percentage}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: number;
  color?: string;
}

function StatItem({ label, value, color = 'text-gray-800' }: StatItemProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

interface IntervalBarProps {
  label: string;
  count: number;
  percentage: number;
}

function IntervalBar({ label, count, percentage }: IntervalBarProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
        <motion.div
          className="h-full bg-primary-400 flex items-center justify-end pr-2"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-xs font-medium text-white">{count}</span>
        </motion.div>
      </div>
    </div>
  );
}
