interface StudyDashboardProps {
  xp: number;
  streak: number;
  totalPlans: number;
  activePlans: number;
}

export function StudyDashboard({
  xp,
  streak,
  totalPlans,
  activePlans,
}: StudyDashboardProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {/* XP */}
      <div className="bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl p-4">
        <p className="text-xs text-gray-600 mb-1">Total XP</p>
        <p className="text-2xl font-bold text-primary-600">♥ {xp}</p>
      </div>

      {/* Streak */}
      <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl p-4">
        <p className="text-xs text-gray-600 mb-1">Streak</p>
        <p className="text-2xl font-bold text-orange-600">🔥 {streak}</p>
      </div>

      {/* Active Plans */}
      <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl p-4">
        <p className="text-xs text-gray-600 mb-1">Active Plans</p>
        <p className="text-2xl font-bold text-blue-600">{activePlans}</p>
      </div>

      {/* Total Completed */}
      <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-xl p-4">
        <p className="text-xs text-gray-600 mb-1">Completed</p>
        <p className="text-2xl font-bold text-green-600">{totalPlans}</p>
      </div>
    </div>
  );
}
