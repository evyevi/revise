import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { PlanCard } from '../PlanCard';
import type { StudyPlan } from '../../types';

const basePlan: StudyPlan = {
  id: 'plan-1',
  subject: 'Physics',
  testDate: new Date('2026-04-15'),
  createdDate: new Date('2026-03-01'),
  totalDays: 20,
  suggestedMinutesPerDay: 30,
  topics: [],
};

describe('PlanCard', () => {
  const confirmSpy = vi.spyOn(window, 'confirm');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    confirmSpy.mockReset();
  });

  it('shows a trash button for deleting the plan', () => {
    render(
      <MemoryRouter>
        <PlanCard
          plan={basePlan}
          todayCompleted={false}
          daysCompleted={5}
          onDelete={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Delete study plan')).toBeInTheDocument();
  });

  it('calls onDelete after user confirms permanent deletion warning', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    confirmSpy.mockReturnValue(true);

    render(
      <MemoryRouter>
        <PlanCard
          plan={basePlan}
          todayCompleted={false}
          daysCompleted={5}
          onDelete={onDelete}
        />
      </MemoryRouter>
    );

    await user.click(screen.getByLabelText('Delete study plan'));

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('permanently delete')
    );
    expect(onDelete).toHaveBeenCalledWith(basePlan.id);
  });

  it('does not call onDelete when user cancels warning', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    confirmSpy.mockReturnValue(false);

    render(
      <MemoryRouter>
        <PlanCard
          plan={basePlan}
          todayCompleted={false}
          daysCompleted={5}
          onDelete={onDelete}
        />
      </MemoryRouter>
    );

    await user.click(screen.getByLabelText('Delete study plan'));

    expect(onDelete).not.toHaveBeenCalled();
  });
});
