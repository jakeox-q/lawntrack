import { diffDays, isLocalDate, type LocalDate, type LocalTime, weekday } from './dates';
import { intervalLabel, type ScheduleRule } from './schedule';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Mon 12 Oct" (adds the year when it differs from `today`). */
export function formatDate(date: LocalDate, today?: LocalDate): string {
  if (!isLocalDate(date)) return date;
  const [y, m, d] = date.split('-').map(Number);
  const base = `${DAYS[weekday(date)]} ${d} ${MONTHS[m - 1]}`;
  if (today && today.slice(0, 4) !== date.slice(0, 4)) return `${base} ${y}`;
  return base;
}

export function formatMonth(date: LocalDate): string {
  const [y, m] = date.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** "Today", "Tomorrow", "In 5 days", "Overdue by 2 days" */
export function relativeDue(due: LocalDate, today: LocalDate): string {
  const d = diffDays(today, due);
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  if (d === -1) return 'Overdue by 1 day';
  if (d < 0) return `Overdue by ${-d} days`;
  if (d < 7) return `Due ${DAYS[weekday(due)]}`;
  return `Due ${formatDate(due, today)}`;
}

/** "Today", "Yesterday", "3 days ago", or the date. */
export function relativePast(date: LocalDate, today: LocalDate): string {
  const d = diffDays(date, today);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d > 1 && d < 7) return `${d} days ago`;
  return formatDate(date, today);
}

export function formatTime(time: LocalTime): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

/** Plain-language reason a task is due, naming who chose the interval. */
export function explainRule(rule: ScheduleRule, lastDone: LocalDate | null, today: LocalDate): string {
  switch (rule.mode) {
    case 'once':
      return 'A one-off task on the date you chose.';
    case 'fixed':
      return `Repeats ${intervalLabel(rule.intervalDays!)} from ${formatDate(rule.startDate, today)}, on dates you set.`;
    case 'after_completion':
      return lastDone
        ? `You chose ${intervalLabel(rule.intervalDays!)} after it's done. Last done ${relativePast(lastDone, today).toLowerCase()}.`
        : `You chose ${intervalLabel(rule.intervalDays!)} after it's done. The first date is the one you picked.`;
  }
}

export function formatArea(m2: number | null | undefined): string {
  if (m2 == null) return 'Size not set';
  return `${Math.round(m2).toLocaleString('en-AU')} m²`;
}
