import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompletionScreen } from '../study-session/CompletionScreen';
import type { BadgeType } from '../../lib/badgeService';

describe('CompletionScreen', () => {
  const mockOnContinue = vi.fn();

  describe('Basic functionality', () => {
    it('displays XP earned', () => {
      render(
        <CompletionScreen
          xpEarned={150}
          onContinue={mockOnContinue}
        />
      );

      expect(screen.getByText(/150/)).toBeInTheDocument();
    });

    it('calls onContinue when continue button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <CompletionScreen
          xpEarned={100}
          onContinue={mockOnContinue}
        />
      );

      const continueButton = screen.getByRole('button', { name: /see you tomorrow|continue/i });
      await user.click(continueButton);

      expect(mockOnContinue).toHaveBeenCalledTimes(1);
    });

    it('displays completion message', () => {
      render(
        <CompletionScreen
          xpEarned={100}
          onContinue={mockOnContinue}
        />
      );

      expect(screen.getByText(/day complete/i)).toBeInTheDocument();
    });
  });

  describe('Streak information', () => {
    it('shows current streak when provided', () => {
      render(
        <CompletionScreen
          xpEarned={100}
          currentStreak={5}
          onContinue={mockOnContinue}
        />
      );

      expect(screen.getByText(/5 days?/i)).toBeInTheDocument();
    });

    it('shows streak bonus when provided', () => {
      render(
        <CompletionScreen
          xpEarned={100}
          streakBonus={20}
          currentStreak={3}
          onContinue={mockOnContinue}
        />
      );

      expect(screen.getByText(/20/)).toBeInTheDocument();
    });

    it('displays current streak with fire emoji', () => {
      render(
        <CompletionScreen
          xpEarned={100}
          currentStreak={7}
          onContinue={mockOnContinue}
        />
      );

      // Look for streak display with fire emoji
      const streakText = screen.getByText(/🔥/);
      expect(streakText).toBeInTheDocument();
    });
  });

  describe('Badge display', () => {
    it('displays new badges when provided', () => {
      const badges: BadgeType[] = ['first-step', 'dedicated-student'];
      
      render(
        <CompletionScreen
          xpEarned={100}
          newBadges={badges}
          onContinue={mockOnContinue}
        />
      );

      // Should show badge unlock for first badge
      expect(screen.getByTestId('badge-unlock')).toBeInTheDocument();
    });

    it('shows no badges when none are provided', () => {
      render(
        <CompletionScreen
          xpEarned={100}
          onContinue={mockOnContinue}
        />
      );

      expect(screen.queryByTestId('badge-unlock')).not.toBeInTheDocument();
    });

    it('handles multiple badges with advance flow', async () => {
      const user = userEvent.setup();
      const badges: BadgeType[] = ['first-step', 'dedicated-student', 'on-fire'];
      
      render(
        <CompletionScreen
          xpEarned={100}
          newBadges={badges}
          onContinue={mockOnContinue}
        />
      );

      // First badge should be shown
      expect(screen.getByTestId('badge-unlock')).toBeInTheDocument();

      // Find and click next/continue button to advance through badges
      const nextButton = screen.getByRole('button', { name: /next|continue|got it/i });
      await user.click(nextButton);

      // Should still show badge unlock for next badge
      await waitFor(() => {
        expect(screen.getByTestId('badge-unlock')).toBeInTheDocument();
      });
    });
  });

  describe('Celebration animation', () => {
    it('shows celebration when component mounts', () => {
      render(
        <CompletionScreen
          xpEarned={100}
          onContinue={mockOnContinue}
        />
      );

      // Should show celebration
      expect(screen.getByTestId('celebration')).toBeInTheDocument();
    });
  });

  describe('XP breakdown display', () => {
    it('shows session rewards in XP summary', () => {
      render(
        <CompletionScreen
          xpEarned={100}
          onContinue={mockOnContinue}
        />
      );

      // Should display session rewards
      expect(screen.getByText(/session rewards?/i)).toBeInTheDocument();
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    it('separates base XP from streak bonus', () => {
      render(
        <CompletionScreen
          xpEarned={100}
          streakBonus={20}
          currentStreak={3}
          onContinue={mockOnContinue}
        />
      );

      // Should show both components
      expect(screen.getByText(/session rewards?/i)).toBeInTheDocument();
      expect(screen.getByText(/streak bonus/i)).toBeInTheDocument();
      expect(screen.getByText(/100/)).toBeInTheDocument();
      expect(screen.getByText(/20/)).toBeInTheDocument();
    });
  });
});
