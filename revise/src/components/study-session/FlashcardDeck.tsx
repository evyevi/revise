import { useState } from 'react';
import type { Flashcard } from '../../types';

interface FlashcardDeckProps {
  cards: Flashcard[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export function FlashcardDeck({
  cards,
  currentIndex,
  onNext,
  onPrev,
  onSkip,
}: FlashcardDeckProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const card = cards[currentIndex];

  if (cards.length === 0) {
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
    <div className="p-6 flex flex-col h-screen">
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
          } rounded-3xl p-8 shadow-lg aspect-square flex flex-col items-center justify-center text-center transition-all transform hover:scale-105`}
        >
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
