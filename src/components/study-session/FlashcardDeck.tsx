import { useState, useEffect } from 'react';
import type { Flashcard } from '../../types';
import { Quality } from '../../lib/sm2Calculator';

interface FlashcardDeckProps {
  cards: Flashcard[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onCardGraded?: (cardId: string, quality: Quality) => void;
  isLoading?: boolean;
}

export function FlashcardDeck({
  cards,
  currentIndex,
  onNext,
  onPrev,
  onSkip,
  onCardGraded,
  isLoading = false,
}: FlashcardDeckProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const card = cards[currentIndex];

  const handleGrade = (quality: Quality) => {
    // Show positive feedback for Good (2) and Easy (3), negative for Again (0) and Hard (1)
    const isPositive = quality >= 2;
    setShowFeedback(isPositive ? 'correct' : 'incorrect');
    
    if (onCardGraded) {
      onCardGraded(card.id, quality);
    }
  };

  // Auto-advance after feedback with proper cleanup
  useEffect(() => {
    if (showFeedback === null) return;
    
    const timer = setTimeout(() => {
      setShowFeedback(null);
      setIsFlipped(false);
      onNext();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [showFeedback, onNext]);

  if (cards.length === 0 || !card) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 mb-4">No flashcards for today</p>
        <button
          onClick={onSkip}
          className="bg-primary-500 text-white py-3 px-6 rounded-lg font-semibold"
        >
          Skip to Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col min-h-[100dvh] pb-[env(safe-area-inset-bottom)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Flashcards</h1>
        <p className="text-gray-600 text-sm">
          {currentIndex + 1} of {cards.length}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1 mb-8 overflow-hidden">
        <div
          className="bg-primary-500 h-full transition-all"
          style={{
            width: `${((currentIndex + 1) / cards.length) * 100}%`,
          }}
        />
      </div>

      {/* Card */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="flex-1 flex items-center justify-center mb-8 cursor-pointer"
      >
        <div
          className={`w-full max-w-sm bg-gradient-to-br ${
            isFlipped
              ? 'from-blue-100 to-blue-50'
              : 'from-primary-100 to-primary-50'
          } rounded-3xl p-8 shadow-lg aspect-square flex flex-col items-center justify-center text-center transition-all transform hover:scale-105 relative`}
        >
          {/* Feedback overlay */}
          {showFeedback && (
            <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/50 animate-pulse">
              <div className={`text-6xl font-bold ${showFeedback === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                {showFeedback === 'correct' ? '✓' : '✗'}
              </div>
            </div>
          )}

          <div className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wider">
            {isFlipped ? '📝 Answer' : '❓ Question'}
          </div>
          <p
            className={`${
              isFlipped ? 'text-lg leading-relaxed' : 'text-2xl font-bold'
            } text-gray-900`}
          >
            {isFlipped ? card.back : card.front}
          </p>
          <div className="text-xs text-gray-500 mt-8">Tap to flip</div>
        </div>
      </div>

      {/* Grading buttons (only show when flipped and no feedback) */}
      {isFlipped && showFeedback === null && (
        <div className="grid grid-cols-2 gap-2 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Again - Red */}
          <button
            onClick={() => handleGrade(Quality.Again)}
            disabled={isLoading}
            data-testid="grade-again-button"
            data-quality={Quality.Again}
            className="bg-red-100 text-red-700 py-3 rounded-lg font-semibold active:scale-95 transition-transform border-2 border-red-500 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
          >
            <span>Again</span>
            <span className="text-xs text-red-600">Today</span>
          </button>

          {/* Hard - Orange */}
          <button
            onClick={() => handleGrade(Quality.Hard)}
            disabled={isLoading}
            data-testid="grade-hard-button"
            data-quality={Quality.Hard}
            className="bg-orange-100 text-orange-700 py-3 rounded-lg font-semibold active:scale-95 transition-transform border-2 border-orange-500 hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
          >
            <span>Hard</span>
            <span className="text-xs text-orange-600">3 days</span>
          </button>

          {/* Good - Green */}
          <button
            onClick={() => handleGrade(Quality.Good)}
            disabled={isLoading}
            data-testid="grade-good-button"
            data-quality={Quality.Good}
            className="bg-green-100 text-green-700 py-3 rounded-lg font-semibold active:scale-95 transition-transform border-2 border-green-500 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
          >
            <span>Good</span>
            <span className="text-xs text-green-600">1 week</span>
          </button>

          {/* Easy - Blue */}
          <button
            onClick={() => handleGrade(Quality.Easy)}
            disabled={isLoading}
            data-testid="grade-easy-button"
            data-quality={Quality.Easy}
            className="bg-blue-100 text-blue-700 py-3 rounded-lg font-semibold active:scale-95 transition-transform border-2 border-blue-500 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
          >
            <span>Easy</span>
            <span className="text-xs text-blue-600">~2 weeks</span>
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-3">
        {/* Swipe indicators */}
        <div className="flex justify-between text-xs text-gray-500 px-2">
          <span>← Unsure</span>
          <span>Sure →</span>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
          >
            ← Previous
          </button>
          <button
            onClick={() => {
              setIsFlipped(false);
              onNext();
            }}
            className="flex-1 bg-primary-500 text-white py-3 rounded-lg font-semibold active:scale-95 transition-transform"
          >
            {currentIndex === cards.length - 1 ? 'Done' : 'Next →'}
          </button>
        </div>

        {/* Skip to quiz */}
        <button
          onClick={onSkip}
          className="w-full text-primary-600 py-2 font-semibold text-sm"
        >
          Skip to Quiz
        </button>
      </div>
    </div>
  );
}
