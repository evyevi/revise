import { motion } from 'framer-motion';

export interface PlanProgressEntry {
  planId: string;
  subject: string;
  completed: number;
  total: number;
  percentage: number;
  testDate: Date;
}

interface PlanProgressListProps {
  plans: PlanProgressEntry[];
}

function daysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function PlanProgressList({ plans }: PlanProgressListProps) {
  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <span className="text-4xl mb-2">📚</span>
        <p>No study plans yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {plans.map((plan, index) => (
        <motion.div
          key={plan.planId}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-xl shadow-sm p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800">{plan.subject}</span>
              {plan.percentage === 100 && <span>✅</span>}
            </div>
            <span className="text-sm font-medium text-gray-600">{plan.percentage}%</span>
          </div>

          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-600"
              initial={{ width: 0 }}
              animate={{ width: `${plan.percentage}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-500">
            <span>{plan.completed}/{plan.total} days</span>
            <span>{daysUntil(plan.testDate)} days until test</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
