import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuizScoreChart } from '../progress/QuizScoreChart';

describe('QuizScoreChart', () => {
  it('renders empty state when no scores', () => {
    render(<QuizScoreChart scores={[]} />);
    expect(screen.getByText(/no quiz scores yet/i)).toBeInTheDocument();
  });

  it('renders score values', () => {
    const scores = [
      { date: '2026-02-18', score: 75 },
      { date: '2026-02-19', score: 90 },
    ];
    render(<QuizScoreChart scores={scores} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('renders date labels', () => {
    const scores = [
      { date: '2026-02-18', score: 75 },
    ];
    render(<QuizScoreChart scores={scores} />);
    expect(screen.getByText('Feb 18')).toBeInTheDocument();
  });
});
