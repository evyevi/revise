export function daysBetween(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const diffDays = Math.ceil((endUtc - startUtc) / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 0);
}

export function clampDateToToday(date: Date, today: Date = new Date()): Date {
  return date < today ? today : date;
}
