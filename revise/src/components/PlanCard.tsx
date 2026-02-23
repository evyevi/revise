import { useNavigate } from 'react-router-dom';
import type { StudyPlan } from '../types';

interface PlanCardProps {
  plan: StudyPlan;
  todayCompleted: boolean;
  daysCompleted: number;
}

export function PlanCard({ plan, todayCompleted, daysCompleted }: PlanCardProps) {
  const navigate = useNavigate();
  
  const daysUntilTest = Math.ceil(
    (plan.testDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const progressPercent = (daysCompleted / plan.totalDays) * 100;

  const handleStart = () => {
    // Will navigate to today's study session
    navigate(`/study/${plan.id}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{plan.subject}</h3>
          <p className="text-sm text-gray-500">
            {daysUntilTest} days until test
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-500">
            {daysCompleted}/{plan.totalDays}
          </p>
          <p className="text-xs text-gray-500">days</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
        <div
          className="bg-gradient-to-r from-primary-400 to-primary-600 h-full transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Day info */}
      <p className="text-sm text-gray-600 mb-4">
        Day {daysCompleted + 1} of {plan.totalDays}
      </p>

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={todayCompleted}
        className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${
          todayCompleted
            ? 'bg-gray-100 text-gray-500 cursor-default'
            : 'bg-primary-500 text-white active:scale-95'
        }`}
      >
        {todayCompleted ? '✓ Completed Today' : "🎯 Start Today's Study"}
      </button>
    </div>
  );
}
