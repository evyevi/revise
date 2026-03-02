import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudyCalendar } from '../progress/StudyCalendar';

describe('StudyCalendar', () => {
  it('renders the current month name', () => {
    render(<StudyCalendar activityDates={new Map()} currentDate={new Date('2026-02-15')} />);
    expect(screen.getByText(/February 2026/i)).toBeInTheDocument();
  });

  it('renders day-of-week headers', () => {
    render(<StudyCalendar activityDates={new Map()} currentDate={new Date('2026-02-15')} />);
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });

  it('highlights days with study activity', () => {
    const activity = new Map([
      ['2026-02-10', { sessions: 1, xpEarned: 50 }],
      ['2026-02-15', { sessions: 2, xpEarned: 100 }],
    ]);
    render(<StudyCalendar activityDates={activity} currentDate={new Date('2026-02-15')} />);
    
    const day10 = screen.getByTestId('calendar-day-10');
    const day15 = screen.getByTestId('calendar-day-15');
    expect(day10.className).toContain('bg-primary');
    expect(day15.className).toContain('bg-primary');
  });

  it('does not highlight inactive days', () => {
    render(<StudyCalendar activityDates={new Map()} currentDate={new Date('2026-02-15')} />);
    const day5 = screen.getByTestId('calendar-day-5');
    expect(day5.className).not.toContain('bg-primary');
  });
});
