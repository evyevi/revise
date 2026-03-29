import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StudyPlan } from '../types';

interface PlanCardProps {
  plan: StudyPlan;
  todayCompleted: boolean;
  daysCompleted: number;
  onDelete: (planId: string) => Promise<void>;
}

export function PlanCard({ plan, todayCompleted, daysCompleted, onDelete }: PlanCardProps) {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  
  const daysUntilTest = Math.ceil(
    (plan.testDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const progressPercent = Math.min((daysCompleted / plan.totalDays) * 100, 100);

  const handleStart = () => {
    // Will navigate to today's study session
    navigate(`/study/${plan.id}`);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `This will permanently delete "${plan.subject}" and all related study data. This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await onDelete(plan.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{plan.subject}</h3>
          <p className="text-sm text-gray-500">
            {daysUntilTest >= 0
              ? `${daysUntilTest} days until test`
              : `Test was ${Math.abs(daysUntilTest)} days ago`}
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

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={isDeleting}
          aria-label="Delete study plan"
          className="h-12 w-12 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-60"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={todayCompleted || isDeleting}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
            todayCompleted
              ? 'bg-gray-100 text-gray-500 cursor-default'
              : 'bg-primary-500 text-white active:scale-95'
          }`}
        >
          {todayCompleted ? '✓ Completed Today' : "🎯 Start Today's Study"}
        </button>
      </div>
    </div>
  );
}
