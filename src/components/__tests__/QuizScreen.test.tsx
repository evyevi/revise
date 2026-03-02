import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizScreen } from '../study-session/QuizScreen';
import type { QuizQuestion } from '../../types';

const mockQuizzes: QuizQuestion[] = [
  {
    id: 'quiz-1',
    topicId: 'topic-1',
    question: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correctAnswerIndex: 1,
    explanation: 'Basic addition: 2 + 2 = 4',
  },
  {
    id: 'quiz-2',
    topicId: 'topic-1',
    question: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Rome'],
    correctAnswerIndex: 2,
    explanation: 'Paris is the capital of France.',
  },
];

describe('QuizScreen', () => {
  describe('Basic functionality', () => {
    it('renders quiz question and options', () => {
      const mockAnswers = new Map();
      const mockOnAnswer = vi.fn();
      const mockOnNext = vi.fn();
      const mockOnPrev = vi.fn();

      render(
        <QuizScreen
          quizzes={mockQuizzes}
          currentIndex={0}
          answers={mockAnswers}
          onAnswer={mockOnAnswer}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />
      );

      expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('calls onAnswer when option is selected', async () => {
      const user = userEvent.setup();
      const mockAnswers = new Map();
      const mockOnAnswer = vi.fn();
      const mockOnNext = vi.fn();
      const mockOnPrev = vi.fn();

      render(
        <QuizScreen
          quizzes={mockQuizzes}
          currentIndex={0}
          answers={mockAnswers}
          onAnswer={mockOnAnswer}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />
      );

      const option = screen.getByText('4');
      await user.click(option);

      expect(mockOnAnswer).toHaveBeenCalledWith(0, 1);
    });

    it('shows explanation after answer is selected', () => {
      const mockAnswers = new Map([['quiz-1', 1]]);
      const mockOnAnswer = vi.fn();
      const mockOnNext = vi.fn();
      const mockOnPrev = vi.fn();

      render(
        <QuizScreen
          quizzes={mockQuizzes}
          currentIndex={0}
          answers={mockAnswers}
          onAnswer={mockOnAnswer}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />
      );

      expect(screen.getByText('Basic addition: 2 + 2 = 4')).toBeInTheDocument();
    });

    it('shows "Complete Session" button when no quizzes', async () => {
      const user = userEvent.setup();
      const mockAnswers = new Map();
      const mockOnAnswer = vi.fn();
      const mockOnNext = vi.fn();
      const mockOnPrev = vi.fn();

      render(
        <QuizScreen
          quizzes={[]}
          currentIndex={0}
          answers={mockAnswers}
          onAnswer={mockOnAnswer}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />
      );

      const completeButton = screen.getByText('Complete Session');
      expect(completeButton).toBeInTheDocument();

      await user.click(completeButton);
      expect(mockOnNext).toHaveBeenCalled();
    });
  });

  describe('Gamification: XP Display', () => {
    it('displays +10 XP when user answers correctly', async () => {
      const user = userEvent.setup();
      const mockAnswers = new Map();
      const mockOnAnswer = vi.fn((quizIndex, answerIndex) => {
        // Simulate parent updating answers
        mockAnswers.set(mockQuizzes[quizIndex].id, answerIndex);
      });
      const mockOnNext = vi.fn();
      const mockOnPrev = vi.fn();

      const { rerender } = render(
        <QuizScreen
          quizzes={mockQuizzes}
          currentIndex={0}
          answers={mockAnswers}
          onAnswer={mockOnAnswer}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />
      );

      // Select correct answer
      const correctOption = screen.getByText('4');
      await user.click(correctOption);

      // Rerender with updated answers
      rerender(
        <QuizScreen
          quizzes={mockQuizzes}
          currentIndex={0}
          answers={new Map([['quiz-1', 1]])}
          onAnswer={mockOnAnswer}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />
      );

      // Check for XP gain display
      await waitFor(() => {
        expect(screen.getByTestId('xp-gain')).toBeInTheDocument();
      });

      expect(screen.getByText('+10')).toBeInTheDocument();
    });

    it('does NOT display XP when user answers incorrectly', async () => {
      const user = userEvent.setup();
      const mockAnswers = new Map();
      const mockOnAnswer = vi.fn();
      const mockOnNext = vi.fn();
      const mockOnPrev = vi.fn();

      const { rerender } = render(
        <QuizScreen
          quizzes={mockQuizzes}
          currentIndex={0}
          answers={mockAnswers}
          onAnswer={mockOnAnswer}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />
      );

      // Select wrong answer (index 0 = '3')
      const wrongOption = screen.getByText('3');
      await user.click(wrongOption);

      // Rerender with updated answers
      rerender(
        <QuizScreen
          quizzes={mockQuizzes}
          currentIndex={0}
          answers={new Map([['quiz-1', 0]])}
          onAnswer={mockOnAnswer}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />
      );

      // XP gain should NOT appear
      expect(screen.queryByTestId('xp-gain')).not.toBeInTheDocument();
    });
  });

  describe('Gamification: Tiered Feedback', () => {
    it('shows high-score feedback (80-100%) with fireworks emoji', () => {
      // All answers correct: 100% score
      const mockAnswers = new Map([
        ['quiz-1', 1],
        ['quiz-2', 2],
      ]);
      const mockOnAnswer = vi.fn();
      const mockOnNext = vi.fn();
      const mockOnPrev = vi.fn();

      render(
        <QuizScreen
          quizzes={mockQuizzes}
          currentIndex={2} // Past last question = show results
          answers={mockAnswers}
          onAnswer={mockOnAnswer}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />
      );

      expect(screen.getByText(/Amazing! You're crushing it!/i)).toBeInTheDocument();
      expect(screen.getByText(/🎉/)).toBeInTheDocument();
    });

    it('shows medium-score feedback (60-79%)', () => {
      // Create 5 quizzes, get 3 correct = 60%
      const fiveQuizzes: QuizQuestion[] = [
        ...mockQuizzes,
        {
          id: 'quiz-3',
          topicId: 'topic-1',
          question: 'Test 3?',
          options: ['A', 'B'],
          correctAnswerIndex: 0,
          explanation: 'Answer is A',
        },
        {
          id: 'quiz-4',
          topicId: 'topic-1',
          question: 'Test 4?',
          options: ['A', 'B'],
          correctAnswerIndex: 0,
          explanation: 'Answer is A',
        },
        {
          id: 'quiz-5',
          topicId: 'topic-1',
          question: 'Test 5?',
          options: ['A', 'B'],
          correctAnswerIndex: 0,
          explanation: 'Answer is A',
        },
      ];

      const mockAnswers = new Map([
        ['quiz-1', 1], // correct
        ['quiz-2', 2], // correct
        ['quiz-3', 0], // correct
        ['quiz-4', 1], // wrong
        ['quiz-5', 1], // wrong
      ]);
      const mockOnAnswer = vi.fn();
      const mockOnNext = vi.fn();
      const mockOnPrev = vi.fn();

      render(
        <QuizScreen
          quizzes={fiveQuizzes}
          currentIndex={5} // Past last question
          answers={mockAnswers}
          onAnswer={mockOnAnswer}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />
      );

      expect(screen.getByText(/Good work! You're learning and improving!/i)).toBeInTheDocument();
      expect(screen.getByText(/💪/)).toBeInTheDocument();
    });

    it('shows low-score feedback (<40%) with encouragement', () => {
      // 0 out of 2 = 0%
      const mockAnswers = new Map([
        ['quiz-1', 0], // wrong
        ['quiz-2', 0], // wrong
      ]);
      const mockOnAnswer = vi.fn();
      const mockOnNext = vi.fn();
      const mockOnPrev = vi.fn();

      render(
        <QuizScreen
          quizzes={mockQuizzes}
          currentIndex={2} // Past last question
          answers={mockAnswers}
          onAnswer={mockOnAnswer}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />
      );

      expect(
        screen.getByText(/Don't worry! This content will come up again tomorrow/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/💖/)).toBeInTheDocument();
    });

    it('shows medium-low score feedback (40-59%)', () => {
      // Create 5 quizzes, get 2 correct = 40%
      const fiveQuizzes: QuizQuestion[] = [
        ...mockQuizzes,
        {
          id: 'quiz-3',
          topicId: 'topic-1',
          question: 'Test 3?',
          options: ['A', 'B'],
          correctAnswerIndex: 0,
          explanation: 'Answer is A',
        },
        {
          id: 'quiz-4',
          topicId: 'topic-1',
          question: 'Test 4?',
          options: ['A', 'B'],
          correctAnswerIndex: 0,
          explanation: 'Answer is A',
        },
        {
          id: 'quiz-5',
          topicId: 'topic-1',
          question: 'Test 5?',
          options: ['A', 'B'],
          correctAnswerIndex: 0,
          explanation: 'Answer is A',
        },
      ];

      const mockAnswers = new Map([
        ['quiz-1', 1], // correct
        ['quiz-2', 2], // correct
        ['quiz-3', 1], // wrong
        ['quiz-4', 1], // wrong
        ['quiz-5', 1], // wrong
      ]);
      const mockOnAnswer = vi.fn();
      const mockOnNext = vi.fn();
      const mockOnPrev = vi.fn();

      render(
        <QuizScreen
          quizzes={fiveQuizzes}
          currentIndex={5}
          answers={mockAnswers}
          onAnswer={mockOnAnswer}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />
      );

      expect(screen.getByText(/Keep going! Every practice helps you learn!/i)).toBeInTheDocument();
      expect(screen.getByText(/🌟/)).toBeInTheDocument();
    });
  });

  describe('Gamification: Total XP Display', () => {
    it('displays total XP with pink heart icon', () => {
      // 2 correct answers = 20 XP
      const mockAnswers = new Map([
        ['quiz-1', 1], // correct
        ['quiz-2', 2], // correct
      ]);
      const mockOnAnswer = vi.fn();
      const mockOnNext = vi.fn();
      const mockOnPrev = vi.fn();

      render(
        <QuizScreen
          quizzes={mockQuizzes}
          currentIndex={2}
          answers={mockAnswers}
          onAnswer={mockOnAnswer}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />
      );

      // Should show heart and XP amount
      expect(screen.getByText(/♥/)).toBeInTheDocument();
      expect(screen.getByText(/50 XP earned/i)).toBeInTheDocument(); // 20 base + 30 perfect bonus
    });

    it('calculates and displays perfect quiz bonus (+30 XP)', () => {
      // All correct = 100% = perfect bonus
      const mockAnswers = new Map([
        ['quiz-1', 1], // correct
        ['quiz-2', 2], // correct
      ]);
      const mockOnAnswer = vi.fn();
      const mockOnNext = vi.fn();
      const mockOnPrev = vi.fn();

      render(
        <QuizScreen
          quizzes={mockQuizzes}
          currentIndex={2}
          answers={mockAnswers}
          onAnswer={mockOnAnswer}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />
      );

      // Base: 2 * 10 = 20, Perfect bonus: 30, Total: 50
      expect(screen.getByText(/50 XP earned/i)).toBeInTheDocument();
      expect(screen.getByText(/Perfect Quiz Bonus/i)).toBeInTheDocument();
    });

    it('does NOT show perfect bonus when score is not 100%', () => {
      // 1 correct out of 2 = 50%
      const mockAnswers = new Map([
        ['quiz-1', 1], // correct
        ['quiz-2', 0], // wrong
      ]);
      const mockOnAnswer = vi.fn();
      const mockOnNext = vi.fn();
      const mockOnPrev = vi.fn();

      render(
        <QuizScreen
          quizzes={mockQuizzes}
          currentIndex={2}
          answers={mockAnswers}
          onAnswer={mockOnAnswer}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />
      );

      // Only base XP: 1 * 10 = 10
      expect(screen.getByText(/10 XP earned/i)).toBeInTheDocument();
      expect(screen.queryByText(/Perfect Quiz Bonus/i)).not.toBeInTheDocument();
    });
  });

  describe('Gamification: Continue button from results', () => {
    it('shows Continue button on results screen', () => {
      const mockAnswers = new Map([
        ['quiz-1', 1],
        ['quiz-2', 2],
      ]);
      const mockOnAnswer = vi.fn();
      const mockOnNext = vi.fn();
      const mockOnPrev = vi.fn();

      render(
        <QuizScreen
          quizzes={mockQuizzes}
          currentIndex={2}
          answers={mockAnswers}
          onAnswer={mockOnAnswer}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />
      );

      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).toBeInTheDocument();
    });

    it('calls onNext when Continue is clicked on results', async () => {
      const user = userEvent.setup();
      const mockAnswers = new Map([
        ['quiz-1', 1],
        ['quiz-2', 2],
      ]);
      const mockOnAnswer = vi.fn();
      const mockOnNext = vi.fn();
      const mockOnPrev = vi.fn();

      render(
        <QuizScreen
          quizzes={mockQuizzes}
          currentIndex={2}
          answers={mockAnswers}
          onAnswer={mockOnAnswer}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />
      );

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      expect(mockOnNext).toHaveBeenCalled();
    });
  });
});
