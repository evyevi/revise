import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotifications } from '../useNotifications';

// jsdom doesn't implement Notification; we stub it
const mockRequestPermission = vi.fn();
const NotificationMock = vi.fn() as unknown as typeof Notification;
Object.defineProperty(NotificationMock, 'permission', {
  get: vi.fn(() => 'default'),
  configurable: true,
});
(NotificationMock as unknown as { requestPermission: typeof mockRequestPermission }).requestPermission = mockRequestPermission;

beforeEach(() => {
  vi.stubGlobal('Notification', NotificationMock);
  localStorage.clear();
  mockRequestPermission.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useNotifications', () => {
  it('returns default permission when Notification API is available', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.permission).toBe('default');
  });

  it('returns "denied" when Notifications API is not available', () => {
    vi.stubGlobal('Notification', undefined);
    const { result } = renderHook(() => useNotifications());
    expect(result.current.permission).toBe('denied');
  });

  it('requestPermission calls Notification.requestPermission and updates state', async () => {
    mockRequestPermission.mockResolvedValue('granted');
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      const perm = await result.current.requestPermission();
      expect(perm).toBe('granted');
    });

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('scheduleDaily saves reminder time to localStorage', () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.scheduleDaily(9, 0);
    });

    expect(localStorage.getItem('revise:reminder')).toBe(JSON.stringify({ hour: 9, minute: 0 }));
  });

  it('cancelDaily removes reminder time from localStorage', () => {
    localStorage.setItem('revise:reminder', JSON.stringify({ hour: 9, minute: 0 }));
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.cancelDaily();
    });

    expect(localStorage.getItem('revise:reminder')).toBeNull();
  });

  it('isScheduled reflects localStorage state', () => {
    localStorage.setItem('revise:reminder', JSON.stringify({ hour: 9, minute: 0 }));
    const { result } = renderHook(() => useNotifications());
    expect(result.current.isScheduled).toBe(true);
  });
});
