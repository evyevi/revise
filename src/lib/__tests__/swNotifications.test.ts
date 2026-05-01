import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  scheduleReminder,
  cancelReminder,
  getScheduledReminder,
  handleSwMessage,
} from '../../lib/swNotificationLogic';

describe('SW notification logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cancelReminder();
  });

  it('scheduleReminder stores the hour/minute', () => {
    scheduleReminder(9, 0);
    expect(getScheduledReminder().time).toEqual({ hour: 9, minute: 0 });
  });

  it('handleSwMessage SCHEDULE_REMINDER sets a reminder', () => {
    handleSwMessage({ data: { type: 'SCHEDULE_REMINDER', payload: { hour: 8, minute: 30 } } } as MessageEvent);
    expect(getScheduledReminder().time).toEqual({ hour: 8, minute: 30 });
  });

  it('handleSwMessage CANCEL_REMINDER clears the reminder', () => {
    handleSwMessage({ data: { type: 'SCHEDULE_REMINDER', payload: { hour: 8, minute: 30 } } } as MessageEvent);
    handleSwMessage({ data: { type: 'CANCEL_REMINDER' } } as MessageEvent);
    expect(getScheduledReminder().time).toBeNull();
  });

  it('cancelReminder clears scheduled time', () => {
    scheduleReminder(9, 0);
    cancelReminder();
    expect(getScheduledReminder().time).toBeNull();
  });

  it('scheduling a second reminder replaces the first', () => {
    scheduleReminder(9, 0);
    scheduleReminder(10, 30);
    expect(getScheduledReminder().time).toEqual({ hour: 10, minute: 30 });
  });
});
