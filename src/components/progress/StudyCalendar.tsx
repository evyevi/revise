import type { ReactElement } from 'react';
import { motion } from 'framer-motion';
import type { StudyActivityEntry } from '../../lib/progressService';

interface StudyCalendarProps {
  activityDates: Map<string, StudyActivityEntry>;
  currentDate?: Date;
}

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function StudyCalendar({ activityDates, currentDate }: StudyCalendarProps) {
  const date = currentDate ?? new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const today = new Date();

  const heading = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1);
  let startDayOfWeek = firstDay.getDay() - 1;
  if (startDayOfWeek < 0) startDayOfWeek = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const isToday = (day: number) =>
    year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

  const cells: ReactElement[] = [];

  // Empty padding cells
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(<div key={`pad-${String(i)}`} />);
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${String(year)}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isActive = activityDates.has(dateStr);

    let classes = 'flex items-center justify-center rounded-lg w-9 h-9 text-sm font-medium';
    if (isActive) {
      classes += ' bg-primary-200 text-primary-700';
    } else {
      classes += ' text-gray-600';
    }
    if (isToday(day)) {
      classes += ' ring-2 ring-primary-400';
    }

    cells.push(
      <motion.div
        key={day}
        data-testid={`calendar-day-${String(day)}`}
        className={classes}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: day * 0.02, duration: 0.2 }}
      >
        {day}
      </motion.div>,
    );
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-center text-lg font-semibold text-gray-800">{heading}</h3>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400">
        {DAY_HEADERS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Study activity calendar">{cells}</div>
    </div>
  );
}
