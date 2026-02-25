import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { Home } from '../Home';
import { db, getUserStats } from '../../lib/db';
import type { StudyPlan, UserStats } from '../../types';

vi.mock('../../lib/db', () => ({
  db: {
    studyPlans: {
      toArray: vi.fn(),
    },
    studyDays: {
      toArray: vi.fn(),
    },
  },
  getUserStats: vi.fn(),
}));

const basePlan: StudyPlan = {
  id: 'plan-1',
  subject: 'Biology',
  testDate: new Date('2026-03-10'),
  createdDate: new Date('2026-02-20'),
  totalDays: 10,
  suggestedMinutesPerDay: 30,
  topics: [],
};

const renderHome = () => {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
};

const buildStats = (overrides: Partial<UserStats> = {}): UserStats => ({
  id: 'default',
  totalXP: 500,
  currentStreak: 0,
  longestStreak: 0,
  badges: [],
  ...overrides,
});

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.studyPlans.toArray).mockResolvedValue([basePlan]);
    vi.mocked(db.studyDays.toArray).mockResolvedValue([]);
  });

  it('shows streak count and omits milestone progress when streak is 7', async () => {
    vi.mocked(getUserStats).mockResolvedValue(
      buildStats({
        currentStreak: 7,
        longestStreak: 10,
        badges: ['first-step', 'dedicated-student'],
      })
    );

    renderHome();

    await screen.findByText(/welcome back/i);

    expect(screen.getByText(/🔥\s*7/)).toBeInTheDocument();
    expect(screen.queryByText(/more to/i)).not.toBeInTheDocument();
  });

  it('displays badge count', async () => {
    vi.mocked(getUserStats).mockResolvedValue(
      buildStats({
        currentStreak: 3,
        badges: ['first-step', 'quiz-champion'],
      })
    );

    renderHome();

    await screen.findByText(/welcome back/i);

    expect(screen.getByText(/🏆\s*2\/7/)).toBeInTheDocument();
  });

  it('shows progress to next milestone when streak is 3', async () => {
    vi.mocked(getUserStats).mockResolvedValue(
      buildStats({
        currentStreak: 3,
        longestStreak: 5,
        badges: ['first-step'],
      })
    );

    renderHome();

    await screen.findByText(/welcome back/i);

    await waitFor(() => {
      expect(screen.getByText(/2 more to On Fire/i)).toBeInTheDocument();
    });
  });
});
