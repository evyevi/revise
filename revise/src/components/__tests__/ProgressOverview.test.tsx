import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressOverview } from '../progress/ProgressOverview';

describe('ProgressOverview', () => {
  const defaultProps = {
    totalXP: 450,
    currentStreak: 5,
    longestStreak: 7,
    totalSessions: 12,
    badgeCount: 3,
    totalBadges: 7,
  };

  it('renders XP total', () => {
    render(<ProgressOverview {...defaultProps} />);
    expect(screen.getByText('450')).toBeInTheDocument();
  });

  it('renders current streak', () => {
    render(<ProgressOverview {...defaultProps} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders longest streak', () => {
    render(<ProgressOverview {...defaultProps} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders session count', () => {
    render(<ProgressOverview {...defaultProps} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders badge count as fraction', () => {
    render(<ProgressOverview {...defaultProps} />);
    expect(screen.getByText('3/7')).toBeInTheDocument();
  });
});
