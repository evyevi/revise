export interface ReminderTime {
  hour: number;
  minute: number;
}

interface ScheduledReminderInfo {
  time: ReminderTime | null;
}

let _time: ReminderTime | null = null;
let _timerId: ReturnType<typeof setTimeout> | null = null;

function msUntilNext(hour: number, minute: number): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

function fireNotification(): void {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification('Time to study! 📚', {
      body: 'Your daily study session is waiting for you.',
      icon: '/icons/icon-192.png',
      tag: 'daily-reminder',
    });
  }
  // Re-schedule for the next day
  if (_time) scheduleReminder(_time.hour, _time.minute);
}

export function scheduleReminder(hour: number, minute: number): void {
  if (_timerId !== null) clearTimeout(_timerId);
  _time = { hour, minute };
  _timerId = setTimeout(fireNotification, msUntilNext(hour, minute));
}

export function cancelReminder(): void {
  if (_timerId !== null) {
    clearTimeout(_timerId);
    _timerId = null;
  }
  _time = null;
}

export function getScheduledReminder(): ScheduledReminderInfo {
  return { time: _time };
}

export function handleSwMessage(event: MessageEvent): void {
  const data = event.data as { type: string; payload?: ReminderTime };
  if (data.type === 'SCHEDULE_REMINDER' && data.payload) {
    scheduleReminder(data.payload.hour, data.payload.minute);
  } else if (data.type === 'CANCEL_REMINDER') {
    cancelReminder();
  }
}
