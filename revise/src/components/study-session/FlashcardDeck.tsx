import { useState } from 'react';
import type { Flashcard } from '../../types';

interface FlashcardDeckProps {
  cards: Flashcard[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export function FlashcardDeck({ cards, currentIndex, onNext, onPrev, onSkip }: FlashcardDeckProps) {
  const [flipped, setFlipped] = useState(false);
  const currentCard = cards[currentIndex];

  if (!currentCard) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 mb-4">No flashcards available</p>
        <button
          onClick={onSkip}
          className="bg-primary-500 text-white py-3 px-6 rounded-xl font-semibold"
        >
          Continue to Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 text-center">
        <p className="text-sm text-gray-600">
          Card {currentIndex + 1} of {cards.length}
        </p>
      </div>

      <div
        className="bg-white rounded-2xl shadow-lg p-8 min-h-[300px] flex items-center justify-center cursor-pointer"
        onClick={() => setFlipped(!flipped)}
      >
        <p className="text-xl text-center">
          {flipped ? currentCard.back : currentCard.front}
        </p>
      </div>

      <p className="text-center text-sm text-gray-500 mt-4">
        Tap card to flip
      </p>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-semibold disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => {
            setFlipped(false);
            onNext();
          }}
          className="flex-1 bg-primary-500 text-white py-3 px-4 rounded-xl font-semibold"
        >
          {currentIndex === cards.length - 1 ? 'Continue to Quiz' : 'Next'}
        </button>
      </div>

      {cards.length > 0 && (
        <button
          onClick={onSkip}
          className="w-full mt-3 text-gray-500 underline"
        >
          Skip to Quiz
        </button>
      )}
    </div>
  );
}
