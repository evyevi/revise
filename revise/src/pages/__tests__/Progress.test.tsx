import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Progress } from '../Progress';
import { db } from '../../lib/db';

function renderProgress() {
  return render(
    <MemoryRouter>
      <Progress />
    </MemoryRouter>
  );
}

describe('Progress page', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('shows loading spinner initially', () => {
    renderProgress();
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });

  it('renders page heading', async () => {
    renderProgress();
    await waitFor(() => {
      expect(screen.getByText('Progress')).toBeInTheDocument();
    });
  });

  it('renders empty state sections', async () => {
    renderProgress();
    await waitFor(() => {
      expect(screen.getByText(/no study plans yet/i)).toBeInTheDocument();
      expect(screen.getByText(/no quiz scores yet/i)).toBeInTheDocument();
    });
  });

  it('renders overview stats with data', async () => {
    await db.userStats.add({
      id: 'default',
      totalXP: 150,
      currentStreak: 2,
      longestStreak: 4,
      badges: ['first-step'],
    });

    renderProgress();
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });

  it('renders badge showcase', async () => {
    renderProgress();
    await waitFor(() => {
      expect(screen.getByText('First Step')).toBeInTheDocument();
      expect(screen.getByText('On Fire!')).toBeInTheDocument();
    });
  });
});
