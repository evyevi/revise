interface CompletionScreenProps {
  xpEarned: number;
  quizScore: number;
  onHome: () => void;
}

export function CompletionScreen({ xpEarned, quizScore, onHome }: CompletionScreenProps) {
  return (
    <div className="p-6 text-center">
      <div className="mb-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold mb-2">Great Job!</h2>
        <p className="text-gray-600">You've completed today's study session</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">XP Earned</p>
            <p className="text-3xl font-bold text-primary-600">+{xpEarned}</p>
          </div>
          
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-1">Quiz Score</p>
            <p className="text-3xl font-bold text-green-600">{Math.round(quizScore)}%</p>
          </div>
        </div>
      </div>

      <button
        onClick={onHome}
        className="w-full bg-primary-500 text-white py-3 px-4 rounded-xl font-semibold"
      >
        Back to Home
      </button>
    </div>
  );
}
