import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { QuizQuestion } from '../../types';
import { calculateQuizAnswerXP, calculatePerfectQuizBonus } from '../../lib/xpService';
import { XPGain } from '../XPGain';

interface QuizScreenProps {
  quizzes: QuizQuestion[];
  currentIndex: number;
  answers: Map<string, number>;
  onAnswer: (quizIndex: number, answerIndex: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

interface XPGainAnimation {
  id: string;
  amount: number;
}

export function QuizScreen({
  quizzes,
  currentIndex,
  answers,
  onAnswer,
  onNext,
  onPrev,
}: QuizScreenProps) {
  const [xpGains, setXpGains] = useState<XPGainAnimation[]>([]);
  const [processedAnswers, setProcessedAnswers] = useState<Set<string>>(new Set());

  // Trigger XP animation when a correct answer is given
  useEffect(() => {
    if (currentIndex < quizzes.length) {
      const quiz = quizzes[currentIndex];
      const selectedAnswer = answers.get(quiz.id);
      
      // Check if this is a newly answered question
      if (selectedAnswer !== undefined && 
          !processedAnswers.has(quiz.id) && 
          selectedAnswer === quiz.correctAnswerIndex) {
        // Correct answer! Show +10 XP
        const xpGainId = `xp-${Date.now()}-${Math.random()}`;
        setXpGains((prev) => [...prev, { id: xpGainId, amount: 10 }]);
        
        // Mark as processed
        setProcessedAnswers((prev) => new Set(prev).add(quiz.id));
        
        // Remove animation after it completes (2 seconds)
        setTimeout(() => {
          setXpGains((prev) => prev.filter((xp) => xp.id !== xpGainId));
        }, 2000);
      }
    }
  }, [currentIndex, answers, quizzes, processedAnswers]);

  // Handle empty quiz list first
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

  // Check if we should show results screen
  const showResults = currentIndex >= quizzes.length;

  if (showResults) {
    // Calculate quiz results
    const correctCount = Array.from(answers.entries()).filter(([quizId, answerIndex]) => {
      const quiz = quizzes.find((q) => q.id === quizId);
      return quiz && quiz.correctAnswerIndex === answerIndex;
    }).length;

    const score = quizzes.length > 0 ? Math.round((correctCount / quizzes.length) * 100) : 0;
    const isPerfect = score === 100;

    // Calculate XP
    const baseXP = calculateQuizAnswerXP(correctCount);
    const perfectBonus = calculatePerfectQuizBonus(isPerfect);
    const totalXP = baseXP + perfectBonus;

    // Determine tiered feedback
    let feedback = '';
    let emoji = '';
    
    if (score >= 80) {
      feedback = "Amazing! You're crushing it!";
      emoji = '🎉';
    } else if (score >= 60) {
      feedback = "Good work! You're learning and improving!";
      emoji = '💪';
    } else if (score >= 40) {
      feedback = "Keep going! Every practice helps you learn!";
      emoji = '🌟';
    } else {
      feedback = "Don't worry! This content will come up again tomorrow. You've got this!";
      emoji = '💖';
    }

    return (
      <div className="p-6 pb-32 text-center">
        <h1 className="text-3xl font-bold mb-4">Quiz Complete!</h1>
        
        {/* Score Display */}
        <div className="mb-6">
          <div className="text-6xl font-bold text-primary-500 mb-2">
            {score}%
          </div>
          <div className="text-gray-600">
            {correctCount} out of {quizzes.length} correct
          </div>
        </div>

        {/* Tiered Feedback */}
        <div className="mb-8">
          <div className="text-4xl mb-3">{emoji}</div>
          <p className="text-xl font-semibold text-gray-900">{feedback}</p>
        </div>

        {/* XP Summary */}
        <div className="bg-primary-50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-primary-600 mb-4">
            <span>♥</span>
            <span>{totalXP} XP earned</span>
          </div>
          
          {/* XP Breakdown */}
          <div className="text-sm text-gray-700 space-y-1">
            <div>Base: {correctCount} × 10 = {baseXP} XP</div>
            {isPerfect && (
              <div className="font-semibold text-primary-600">
                Perfect Quiz Bonus: +{perfectBonus} XP
              </div>
            )}
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={onNext}
          className="w-full bg-primary-500 text-white py-4 rounded-lg font-semibold text-lg active:scale-95 transition-transform"
        >
          Continue
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

      {/* XP Gain Animations */}
      <AnimatePresence>
        {xpGains.map((xp) => (
          <XPGain key={xp.id} amount={xp.amount} />
        ))}
      </AnimatePresence>
    </div>
  );
}
