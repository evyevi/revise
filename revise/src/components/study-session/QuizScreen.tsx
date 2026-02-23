import type { QuizQuestion } from '../../types';

interface QuizScreenProps {
  quizzes: QuizQuestion[];
  currentIndex: number;
  answers: Map<string, number>;
  onAnswer: (quizIndex: number, answerIndex: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function QuizScreen({
  quizzes,
  currentIndex,
  answers,
  onAnswer,
  onNext,
  onPrev,
}: QuizScreenProps) {
  if (quizzes.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 mb-4">No quizzes for today</p>
        <button
          onClick={onNext}
          className="bg-primary-500 text-white py-3 px-6 rounded-lg font-semibold"
        >
          Complete Session
        </button>
      </div>
    );
  }

  const quiz = quizzes[currentIndex];
  const selectedAnswer = answers.get(quiz.id);
  const isCorrect = selectedAnswer === quiz.correctAnswerIndex;

  return (
    <div className="p-6 pb-32">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Quiz</h1>
        <p className="text-gray-600 text-sm">
          {currentIndex + 1} of {quizzes.length}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1 mb-8 overflow-hidden">
        <div
          className="bg-blue-500 h-full transition-all"
          style={{
            width: `${((currentIndex + 1) / quizzes.length) * 100}%`,
          }}
        />
      </div>

      {/* Question */}
      <div className="mb-8">
        <p className="text-lg font-semibold text-gray-900 mb-6">
          {quiz.question}
        </p>

        {/* Options */}
        <div className="space-y-3">
          {quiz.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectAnswer = index === quiz.correctAnswerIndex;

            let buttonClass = 'bg-white border-2 border-gray-200';
            if (selectedAnswer !== undefined) {
              if (isCorrectAnswer) {
                buttonClass = 'bg-green-50 border-2 border-green-500';
              } else if (isSelected && !isCorrect) {
                buttonClass = 'bg-red-50 border-2 border-red-500';
              }
            } else if (isSelected) {
              buttonClass = 'bg-primary-50 border-2 border-primary-500';
            }

            return (
              <button
                key={index}
                onClick={() => onAnswer(currentIndex, index)}
                disabled={selectedAnswer !== undefined}
                className={`w-full p-4 rounded-xl text-left font-medium transition-all ${buttonClass} disabled:opacity-80`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center ${
                      isSelected
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <span className="text-xs text-white font-bold">
                        {index === quiz.correctAnswerIndex ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                  <span>{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {selectedAnswer !== undefined && (
          <div
            className={`mt-6 p-4 rounded-xl ${
              isCorrect
                ? 'bg-green-50 border-l-4 border-green-500'
                : 'bg-blue-50 border-l-4 border-blue-500'
            }`}
          >
            <p className="text-sm font-semibold text-gray-900 mb-2">
              {isCorrect ? '✓ Correct!' : '📚 Explanation'}
            </p>
            <p className="text-sm text-gray-700">{quiz.explanation}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      {selectedAnswer !== undefined && (
        <div className="flex gap-3 mt-8 fixed bottom-0 left-0 right-0 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-white via-white to-transparent">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold disabled:opacity-50 active:scale-95 transition-transform"
          >
            Back
          </button>
          <button
            onClick={onNext}
            className="flex-1 bg-primary-500 text-white py-3 rounded-lg font-semibold active:scale-95 transition-transform"
          >
            {currentIndex === quizzes.length - 1 ? 'See Results' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}
