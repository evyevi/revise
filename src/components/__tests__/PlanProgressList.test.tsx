import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlanProgressList } from '../progress/PlanProgressList';

describe('PlanProgressList', () => {
  it('renders empty state when no plans', () => {
    render(<PlanProgressList plans={[]} />);
    expect(screen.getByText(/no study plans yet/i)).toBeInTheDocument();
  });

  it('renders plan name and percentage', () => {
    const plans = [
      { planId: '1', subject: 'Math', completed: 3, total: 10, percentage: 30, testDate: new Date('2026-03-15') },
    ];
    render(<PlanProgressList plans={plans} />);
    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('3/10 days')).toBeInTheDocument();
  });

  it('renders multiple plans', () => {
    const plans = [
      { planId: '1', subject: 'Math', completed: 3, total: 10, percentage: 30, testDate: new Date('2026-03-15') },
      { planId: '2', subject: 'Physics', completed: 7, total: 7, percentage: 100, testDate: new Date('2026-03-10') },
    ];
    render(<PlanProgressList plans={plans} />);
    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('Physics')).toBeInTheDocument();
  });

  it('shows completed badge for 100% plans', () => {
    const plans = [
      { planId: '1', subject: 'Math', completed: 10, total: 10, percentage: 100, testDate: new Date('2026-03-15') },
    ];
    render(<PlanProgressList plans={plans} />);
    expect(screen.getByText('✅')).toBeInTheDocument();
  });
});
