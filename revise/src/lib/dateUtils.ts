const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toUtcDayTimestamp(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function daysBetween(start: Date, end: Date): number {
  const startUtc = toUtcDayTimestamp(start);
  const endUtc = toUtcDayTimestamp(end);
  const diffDays = Math.ceil((endUtc - startUtc) / MS_PER_DAY);
  return Math.max(diffDays, 0);
}

export function clampDateToToday(date: Date, today: Date = new Date()): Date {
  return toUtcDayTimestamp(date) < toUtcDayTimestamp(today) ? today : date;
}
