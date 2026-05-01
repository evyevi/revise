import { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';

const DEFAULT_HOUR = 9;
const DEFAULT_MINUTE = 0;

export function NotificationSettings() {
  const { permission, isScheduled, reminderTime, requestPermission, scheduleDaily, cancelDaily } =
    useNotifications();

  const [hour, setHour] = useState(reminderTime?.hour ?? DEFAULT_HOUR);
  const [minute, setMinute] = useState(reminderTime?.minute ?? DEFAULT_MINUTE);

  async function handleEnable() {
    const perm = await requestPermission();
    if (perm === 'granted') {
      scheduleDaily(hour, minute);
    }
  }

  function handleTimeChange(value: string) {
    const [h, m] = value.split(':').map(Number);
    setHour(h);
    setMinute(m);
    if (isScheduled) scheduleDaily(h, m);
  }

  const timeValue = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  if (permission === 'denied') {
    return (
      <p className="text-sm text-gray-500">
        Notifications are blocked. Enable them in your browser settings to get daily reminders.
      </p>
    );
  }

  if (permission === 'default' && !isScheduled) {
    return (
      <button
        type="button"
        onClick={() => void handleEnable()}
        className="w-full py-3 bg-primary-400 text-white rounded-xl font-semibold hover:bg-primary-500 transition-colors"
      >
        Enable Reminders
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="reminder-time" className="block text-sm font-medium text-gray-700 mb-1">
          Reminder time
        </label>
        <input
          id="reminder-time"
          type="time"
          value={timeValue}
          onChange={(e) => handleTimeChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
      </div>
      <button
        type="button"
        onClick={cancelDaily}
        className="w-full py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
      >
        Cancel reminder
      </button>
    </div>
  );
}
