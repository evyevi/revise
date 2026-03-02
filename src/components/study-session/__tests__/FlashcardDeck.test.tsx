import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlashcardDeck } from '../FlashcardDeck';
import { Quality } from '../../../lib/sm2Calculator';
import type { Flashcard } from '../../../types';

const mockCards: Flashcard[] = [
  {
    id: 'card-1',
    topicId: 'topic-1',
    front: 'What is 2 + 2?',
    back: '4',
    reviewDates: [],
    masteryLevel: 0,
    easinessFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: new Date(),
  },
  {
    id: 'card-2',
    topicId: 'topic-1',
    front: 'What is the capital of France?',
    back: 'Paris',
    reviewDates: [],
    masteryLevel: 0,
    easinessFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: new Date(),
  },
];

const defaultProps = {
  cards: mockCards,
  currentIndex: 0,
  onNext: vi.fn(),
  onPrev: vi.fn(),
  onSkip: vi.fn(),
  onCardGraded: vi.fn(),
};

describe('FlashcardDeck', () => {
  describe('Test 1: Renders 4 Quality buttons', () => {
    it('should render all 4 Quality buttons labeled "Again", "Hard", "Good", "Easy"', () => {
      render(<FlashcardDeck {...defaultProps} />);

      // Flip the card first - click on the card itself
      const question = screen.getByText(/What is 2 \+ 2\?/);
      fireEvent.click(question);

      // Verify all 4 buttons are rendered
      expect(screen.getByTestId('grade-again-button')).toBeInTheDocument();
      expect(screen.getByTestId('grade-hard-button')).toBeInTheDocument();
      expect(screen.getByTestId('grade-good-button')).toBeInTheDocument();
      expect(screen.getByTestId('grade-easy-button')).toBeInTheDocument();

      // Verify button labels
      expect(screen.getByText('Again')).toBeInTheDocument();
      expect(screen.getByText('Hard')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
      expect(screen.getByText('Easy')).toBeInTheDocument();
    });
  });

  describe('Test 2: Buttons call callback with correct Quality', () => {
    it('should call onCardGraded with Quality.Again when Again button clicked', async () => {
      const onCardGraded = vi.fn();
      render(<FlashcardDeck {...defaultProps} onCardGraded={onCardGraded} />);

      // Flip the card
      fireEvent.click(screen.getByText(/What is 2 \+ 2\?/));
      await waitFor(() => expect(screen.getByTestId('grade-again-button')).toBeInTheDocument());

      // Click Again button
      fireEvent.click(screen.getByTestId('grade-again-button'));

      expect(onCardGraded).toHaveBeenCalledWith('card-1', Quality.Again);
    });

    it('should call onCardGraded with Quality.Hard when Hard button clicked', async () => {
      const onCardGraded = vi.fn();
      render(<FlashcardDeck {...defaultProps} onCardGraded={onCardGraded} />);

      // Flip the card
      fireEvent.click(screen.getByText(/What is 2 \+ 2\?/));
      await waitFor(() => expect(screen.getByTestId('grade-hard-button')).toBeInTheDocument());

      // Click Hard button
      fireEvent.click(screen.getByTestId('grade-hard-button'));

      expect(onCardGraded).toHaveBeenCalledWith('card-1', Quality.Hard);
    });

    it('should call onCardGraded with Quality.Good when Good button clicked', async () => {
      const onCardGraded = vi.fn();
      render(<FlashcardDeck {...defaultProps} onCardGraded={onCardGraded} />);

      // Flip the card
      fireEvent.click(screen.getByText(/What is 2 \+ 2\?/));
      await waitFor(() => expect(screen.getByTestId('grade-good-button')).toBeInTheDocument());

      // Click Good button
      fireEvent.click(screen.getByTestId('grade-good-button'));

      expect(onCardGraded).toHaveBeenCalledWith('card-1', Quality.Good);
    });

    it('should call onCardGraded with Quality.Easy when Easy button clicked', async () => {
      const onCardGraded = vi.fn();
      render(<FlashcardDeck {...defaultProps} onCardGraded={onCardGraded} />);

      // Flip the card
      fireEvent.click(screen.getByText(/What is 2 \+ 2\?/));
      await waitFor(() => expect(screen.getByTestId('grade-easy-button')).toBeInTheDocument());

      // Click Easy button
      fireEvent.click(screen.getByTestId('grade-easy-button'));

      expect(onCardGraded).toHaveBeenCalledWith('card-1', Quality.Easy);
    });
  });

  describe('Test 3: Interval hints displayed', () => {
    it('should display interval hints for each Quality option', async () => {
      render(<FlashcardDeck {...defaultProps} />);

      // Flip the card
      fireEvent.click(screen.getByText(/What is 2 \+ 2\?/));
      await waitFor(() => expect(screen.getByTestId('grade-again-button')).toBeInTheDocument());

      // Verify interval hints are displayed
      expect(screen.getByText('Today')).toBeInTheDocument(); // Again hint
      expect(screen.getByText('3 days')).toBeInTheDocument(); // Hard hint
      expect(screen.getByText('1 week')).toBeInTheDocument(); // Good hint
      expect(screen.getByText('~2 weeks')).toBeInTheDocument(); // Easy hint
    });

    it('should display interval hints with correct color classes', async () => {
      render(<FlashcardDeck {...defaultProps} />);

      // Flip the card
      fireEvent.click(screen.getByText(/What is 2 \+ 2\?/));
      await waitFor(() => expect(screen.getByTestId('grade-again-button')).toBeInTheDocument());

      // Verify hint text is present in the right colored buttons
      const againBtn = screen.getByTestId('grade-again-button');
      const hardBtn = screen.getByTestId('grade-hard-button');
      const goodBtn = screen.getByTestId('grade-good-button');
      const easyBtn = screen.getByTestId('grade-easy-button');

      expect(againBtn).toHaveClass('text-red-700');
      expect(hardBtn).toHaveClass('text-orange-700');
      expect(goodBtn).toHaveClass('text-green-700');
      expect(easyBtn).toHaveClass('text-blue-700');
    });
  });

  describe('Test 4: Buttons disabled during loading', () => {
    it('should disable all buttons when isLoading=true', async () => {
      render(<FlashcardDeck {...defaultProps} isLoading={true} />);

      // Flip the card
      fireEvent.click(screen.getByText(/What is 2 \+ 2\?/));
      await waitFor(() => expect(screen.getByTestId('grade-again-button')).toBeInTheDocument());

      // Verify all buttons are disabled
      expect(screen.getByTestId('grade-again-button')).toBeDisabled();
      expect(screen.getByTestId('grade-hard-button')).toBeDisabled();
      expect(screen.getByTestId('grade-good-button')).toBeDisabled();
      expect(screen.getByTestId('grade-easy-button')).toBeDisabled();
    });

    it('should enable buttons when isLoading=false', async () => {
      render(<FlashcardDeck {...defaultProps} isLoading={false} />);

      // Flip the card
      fireEvent.click(screen.getByText(/What is 2 \+ 2\?/));
      await waitFor(() => expect(screen.getByTestId('grade-again-button')).toBeInTheDocument());

      // Verify all buttons are enabled
      expect(screen.getByTestId('grade-again-button')).not.toBeDisabled();
      expect(screen.getByTestId('grade-hard-button')).not.toBeDisabled();
      expect(screen.getByTestId('grade-good-button')).not.toBeDisabled();
      expect(screen.getByTestId('grade-easy-button')).not.toBeDisabled();
    });
  });

  describe('Test 5: Card content unchanged', () => {
    it('should render question when card is not flipped', () => {
      render(<FlashcardDeck {...defaultProps} />);

      // Verify question is displayed
      expect(screen.getByText(/What is 2 \+ 2\?/)).toBeInTheDocument();
    });

    it('should render answer when card is flipped', async () => {
      render(<FlashcardDeck {...defaultProps} />);

      // Flip the card
      fireEvent.click(screen.getByText(/What is 2 \+ 2\?/));
      await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument());

      // Verify answer is displayed
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should render progress counter', () => {
      render(<FlashcardDeck {...defaultProps} />);

      // Verify progress counter is displayed
      expect(screen.getByText('1 of 2')).toBeInTheDocument();
    });

    it('should render progress bar', () => {
      render(<FlashcardDeck {...defaultProps} />);

      // Verify progress bar is rendered - it should have the width style set
      const progressContainer = screen.getByText(/What is 2 \+ 2\?/).closest('.p-6');
      expect(progressContainer?.querySelector('.bg-primary-500')).toBeInTheDocument();
    });
  });

  describe('Test 6: Button styling (visual distinction)', () => {
    it('should have different data-quality attributes for each button', async () => {
      render(<FlashcardDeck {...defaultProps} />);

      // Flip the card
      fireEvent.click(screen.getByText(/What is 2 \+ 2\?/));
      await waitFor(() => expect(screen.getByTestId('grade-again-button')).toBeInTheDocument());

      // Verify data-quality attributes
      expect(screen.getByTestId('grade-again-button')).toHaveAttribute('data-quality', String(Quality.Again));
      expect(screen.getByTestId('grade-hard-button')).toHaveAttribute('data-quality', String(Quality.Hard));
      expect(screen.getByTestId('grade-good-button')).toHaveAttribute('data-quality', String(Quality.Good));
      expect(screen.getByTestId('grade-easy-button')).toHaveAttribute('data-quality', String(Quality.Easy));
    });

    it('should have distinct color classes for each button', async () => {
      render(<FlashcardDeck {...defaultProps} />);

      // Flip the card
      fireEvent.click(screen.getByText(/What is 2 \+ 2\?/));
      await waitFor(() => expect(screen.getByTestId('grade-again-button')).toBeInTheDocument());

      // Verify color classes are distinct
      const againBtn = screen.getByTestId('grade-again-button');
      const hardBtn = screen.getByTestId('grade-hard-button');
      const goodBtn = screen.getByTestId('grade-good-button');
      const easyBtn = screen.getByTestId('grade-easy-button');

      expect(againBtn).toHaveClass('bg-red-100');
      expect(hardBtn).toHaveClass('bg-orange-100');
      expect(goodBtn).toHaveClass('bg-green-100');
      expect(easyBtn).toHaveClass('bg-blue-100');

      expect(againBtn).toHaveClass('border-red-500');
      expect(hardBtn).toHaveClass('border-orange-500');
      expect(goodBtn).toHaveClass('border-green-500');
      expect(easyBtn).toHaveClass('border-blue-500');
    });

    it('should have proper hover states for visual feedback', async () => {
      render(<FlashcardDeck {...defaultProps} />);

      // Flip the card
      fireEvent.click(screen.getByText(/What is 2 \+ 2\?/));
      await waitFor(() => expect(screen.getByTestId('grade-again-button')).toBeInTheDocument());

      // Verify hover classes exist
      expect(screen.getByTestId('grade-again-button')).toHaveClass('hover:bg-red-200');
      expect(screen.getByTestId('grade-hard-button')).toHaveClass('hover:bg-orange-200');
      expect(screen.getByTestId('grade-good-button')).toHaveClass('hover:bg-green-200');
      expect(screen.getByTestId('grade-easy-button')).toHaveClass('hover:bg-blue-200');
    });
  });

  describe('Additional behavior tests', () => {
    it('should not show grading buttons before card is flipped', () => {
      render(<FlashcardDeck {...defaultProps} />);

      // Buttons should not be visible initially
      expect(screen.queryByTestId('grade-again-button')).not.toBeInTheDocument();
    });

    it('should show grading buttons only when card is flipped', async () => {
      render(<FlashcardDeck {...defaultProps} />);

      // Flip the card
      fireEvent.click(screen.getByText(/What is 2 \+ 2\?/));
      await waitFor(() => expect(screen.getByTestId('grade-again-button')).toBeInTheDocument());

      // Buttons should be visible
      expect(screen.getByTestId('grade-again-button')).toBeInTheDocument();
      expect(screen.getByTestId('grade-hard-button')).toBeInTheDocument();
      expect(screen.getByTestId('grade-good-button')).toBeInTheDocument();
      expect(screen.getByTestId('grade-easy-button')).toBeInTheDocument();
    });
  });
});
