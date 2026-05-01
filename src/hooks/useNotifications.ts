import { useState, useCallback } from 'react';

type NotificationPermission = 'default' | 'granted' | 'denied';

const REMINDER_KEY = 'revise:reminder';

function getInitialPermission(): NotificationPermission {
  if (typeof Notification === 'undefined') return 'denied';
  return Notification.permission as NotificationPermission;
}

export interface ReminderTime {
  hour: number;
  minute: number;
}

export interface UseNotificationsReturn {
  permission: NotificationPermission;
  isScheduled: boolean;
  reminderTime: ReminderTime | null;
  requestPermission: () => Promise<NotificationPermission>;
  scheduleDaily: (hour: number, minute: number) => void;
  cancelDaily: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>(getInitialPermission);
  const [reminderTime, setReminderTime] = useState<ReminderTime | null>(() => {
    const stored = localStorage.getItem(REMINDER_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as ReminderTime;
    } catch {
      return null;
    }
  });

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof Notification === 'undefined') return 'denied';
    const result = await Notification.requestPermission() as NotificationPermission;
    setPermission(result);
    return result;
  }, []);

  const scheduleDaily = useCallback((hour: number, minute: number) => {
    const time: ReminderTime = { hour, minute };
    localStorage.setItem(REMINDER_KEY, JSON.stringify(time));
    setReminderTime(time);
    // Notify the service worker so it can schedule a periodic check
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_REMINDER',
        payload: time,
      });
    }
  }, []);

  const cancelDaily = useCallback(() => {
    localStorage.removeItem(REMINDER_KEY);
    setReminderTime(null);
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CANCEL_REMINDER' });
    }
  }, []);

  return {
    permission,
    isScheduled: reminderTime !== null,
    reminderTime,
    requestPermission,
    scheduleDaily,
    cancelDaily,
  };
}
