interface CompletionScreenProps {
  xpEarned: number;
  quizScore: number;
  onHome: () => void;
}

export function CompletionScreen({
  xpEarned,
  quizScore,
}: CompletionScreenProps) {
  const scorePercentage = Math.round(quizScore);

  let message = '';
  let emoji = '';

  if (scorePercentage >= 80) {
    message = "Amazing! You're crushing it! 🎉";
    emoji = '🎉';
  } else if (scorePercentage >= 60) {
    message = 'Good work! You\'re learning and improving! 💪';
    emoji = '💪';
  } else if (scorePercentage >= 40) {
    message = 'Keep going! Every practice helps you learn! 🌟';
    emoji = '🌟';
  } else {
    message =
      "Don't worry! This content will come up again tomorrow. You've got this! 💖";
    emoji = '💖';
  }

  return (
    <div className="p-6 flex flex-col h-screen items-center justify-center text-center">
      <div className="text-6xl mb-4">{emoji}</div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Day Complete!</h1>

      <p className="text-gray-600 mb-8">{message}</p>

      {/* Score */}
      <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-8 mb-8 w-full">
        <p className="text-sm text-gray-600 mb-2">Quiz Score</p>
        <p className="text-4xl font-bold text-blue-600">
          {scorePercentage.toFixed(0)}%
        </p>
      </div>

      {/* XP */}
      <div className="bg-gradient-to-br from-primary-100 to-primary-50 rounded-2xl p-8 mb-8 w-full">
        <p className="text-sm text-gray-600 mb-2">XP Earned</p>
        <p className="text-4xl font-bold text-primary-600">
          ♥ +{xpEarned}
        </p>
      </div>

      {/* Confetti animation placeholder */}
      <div className="mb-8">
        <p className="text-sm text-gray-500">✨ Excellent work today! ✨</p>
      </div>

      {/* Home button */}
      <button
        onClick={() => window.location.href = '/'}
        className="w-full bg-primary-500 text-white py-4 px-6 rounded-xl font-bold text-lg active:scale-95 transition-transform mt-8"
      >
        Back to Home
      </button>

      <p className="text-sm text-gray-600 mt-4">See you tomorrow! 👋</p>
    </div>
  );
}
