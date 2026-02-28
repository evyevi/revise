import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BadgeShowcase } from '../progress/BadgeShowcase';
import { getAllBadges } from '../../lib/badgeService';

const badges = getAllBadges();

describe('BadgeShowcase', () => {
  it('renders all badge definitions', () => {
    render(<BadgeShowcase earnedBadges={[]} badges={badges} />);
    expect(screen.getByText('First Step')).toBeInTheDocument();
    expect(screen.getByText('Dedicated Student')).toBeInTheDocument();
    expect(screen.getByText('On Fire!')).toBeInTheDocument();
    expect(screen.getByText('Unstoppable!')).toBeInTheDocument();
    expect(screen.getByText('Quiz Champion')).toBeInTheDocument();
    expect(screen.getByText('Flashcard Master')).toBeInTheDocument();
    expect(screen.getByText('Test Ready!')).toBeInTheDocument();
  });

  it('marks earned badges as unlocked', () => {
    render(<BadgeShowcase earnedBadges={['first-step', 'on-fire']} badges={badges} />);
    const firstStep = screen.getByTestId('badge-first-step');
    const onFire = screen.getByTestId('badge-on-fire');
    expect(firstStep.className).not.toContain('opacity-40');
    expect(onFire.className).not.toContain('opacity-40');
  });

  it('dims unearned badges', () => {
    render(<BadgeShowcase earnedBadges={['first-step']} badges={badges} />);
    const quizChamp = screen.getByTestId('badge-quiz-champion');
    expect(quizChamp.className).toContain('opacity-40');
  });

  it('shows badge conditions for locked badges', () => {
    render(<BadgeShowcase earnedBadges={[]} badges={badges} />);
    expect(screen.getByText('Complete 1 study session')).toBeInTheDocument();
  });
});
