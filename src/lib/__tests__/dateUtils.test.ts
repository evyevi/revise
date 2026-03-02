import { describe, it, expect } from 'vitest';
import { daysBetween, clampDateToToday } from '../dateUtils';

describe('dateUtils', () => {
  it('computes days between dates (inclusive)', () => {
    const start = new Date(Date.UTC(2026, 1, 22));
    const end = new Date(Date.UTC(2026, 1, 24));
    expect(daysBetween(start, end)).toBe(2);
  });

  it('clamps past dates to today', () => {
    const today = new Date(Date.UTC(2026, 1, 22));
    const past = new Date(Date.UTC(2026, 1, 1));
    expect(clampDateToToday(past, today).toISOString().slice(0, 10))
      .toBe(today.toISOString().slice(0, 10));
  });
});
