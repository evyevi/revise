import type { QuizQuestion } from '../../types';

interface QuizScreenProps {
  quizzes: QuizQuestion[];
  currentIndex: number;
  answers: Map<string, number>;
  onAnswer: (quizIndex: number, answerIndex: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function QuizScreen({ quizzes, currentIndex, answers, onAnswer, onNext, onPrev }: QuizScreenProps) {
  const currentQuiz = quizzes[currentIndex];

  if (!currentQuiz) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 mb-4">No quiz questions available</p>
        <button
          onClick={onNext}
          className="bg-primary-500 text-white py-3 px-6 rounded-xl font-semibold"
        >
          Complete Session
        </button>
      </div>
    );
  }

  const selectedAnswer = answers.get(currentQuiz.id);
  const isLastQuestion = currentIndex === quizzes.length - 1;

  return (
    <div className="p-6">
      <div className="mb-4 text-center">
        <p className="text-sm text-gray-600">
          Question {currentIndex + 1} of {quizzes.length}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">{currentQuiz.question}</h3>
        
        <div className="space-y-3">
          {currentQuiz.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => onAnswer(currentIndex, idx)}
              className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                selectedAnswer === idx
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-semibold disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={selectedAnswer === undefined}
          className="flex-1 bg-primary-500 text-white py-3 px-4 rounded-xl font-semibold disabled:opacity-50"
        >
          {isLastQuestion ? 'Complete' : 'Next'}
        </button>
      </div>
    </div>
  );
}
