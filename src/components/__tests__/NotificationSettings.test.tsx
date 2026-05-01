import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationSettings } from '../NotificationSettings';
import * as useNotificationsModule from '../../hooks/useNotifications';

const mockUseNotifications = vi.spyOn(useNotificationsModule, 'useNotifications');

const defaultHook: useNotificationsModule.UseNotificationsReturn = {
  permission: 'default',
  isScheduled: false,
  reminderTime: null,
  requestPermission: vi.fn().mockResolvedValue('granted'),
  scheduleDaily: vi.fn(),
  cancelDaily: vi.fn(),
};

beforeEach(() => {
  mockUseNotifications.mockReturnValue({ ...defaultHook });
  vi.clearAllMocks();
});

describe('NotificationSettings', () => {
  it('renders enable button when permission is default', () => {
    render(<NotificationSettings />);
    expect(screen.getByRole('button', { name: /enable reminders/i })).toBeInTheDocument();
  });

  it('shows denied message when permission is denied', () => {
    mockUseNotifications.mockReturnValue({ ...defaultHook, permission: 'denied' });
    render(<NotificationSettings />);
    expect(screen.getByText(/notifications are blocked/i)).toBeInTheDocument();
  });

  it('shows time picker and cancel button when permission granted and scheduled', () => {
    mockUseNotifications.mockReturnValue({
      ...defaultHook,
      permission: 'granted',
      isScheduled: true,
      reminderTime: { hour: 9, minute: 0 },
    });
    render(<NotificationSettings />);
    expect(screen.getByLabelText(/reminder time/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel reminder/i })).toBeInTheDocument();
  });

  it('clicking enable reminders calls requestPermission then scheduleDaily', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    const scheduleDaily = vi.fn();
    mockUseNotifications.mockReturnValue({ ...defaultHook, requestPermission, scheduleDaily });

    render(<NotificationSettings />);
    await userEvent.click(screen.getByRole('button', { name: /enable reminders/i }));

    expect(requestPermission).toHaveBeenCalled();
    expect(scheduleDaily).toHaveBeenCalled();
  });

  it('clicking cancel reminder calls cancelDaily', async () => {
    const cancelDaily = vi.fn();
    mockUseNotifications.mockReturnValue({
      ...defaultHook,
      permission: 'granted',
      isScheduled: true,
      reminderTime: { hour: 9, minute: 0 },
      cancelDaily,
    });

    render(<NotificationSettings />);
    await userEvent.click(screen.getByRole('button', { name: /cancel reminder/i }));

    expect(cancelDaily).toHaveBeenCalled();
  });
});
