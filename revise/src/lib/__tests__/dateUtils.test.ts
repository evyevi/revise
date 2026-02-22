import { describe, it, expect } from 'vitest';
import { daysBetween, clampDateToToday } from '../dateUtils';

describe('dateUtils', () => {
  it('computes days between dates (inclusive)', () => {
    const start = new Date('2026-02-22');
    const end = new Date('2026-02-24');
    expect(daysBetween(start, end)).toBe(2);
  });

  it('clamps past dates to today', () => {
    const today = new Date('2026-02-22');
    const past = new Date('2026-02-01');
    expect(clampDateToToday(past, today).toDateString()).toBe(today.toDateString());
  });
});
