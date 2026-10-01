import { addDays, type LocalTime, nextWeekday, todayIn, weekday, zonedDateTimeToInstant } from './dates';

export interface SnoozeChoice {
  key: 'later' | 'tomorrow' | 'weekend';
  label: string;
  until: Date;
}

/** Snoozing moves the alert only. The task keeps its due date. */
export function snoozeChoices(now: Date, timeZone: string, reminderTime: LocalTime): SnoozeChoice[] {
  const today = todayIn(timeZone, now);
  const tomorrow = zonedDateTimeToInstant(addDays(today, 1), reminderTime, timeZone);
  const day = weekday(today);
  const saturday = day === 6 || day === 0 ? nextWeekday(today, 6) : nextWeekday(today, 6, true);
  return [
    { key: 'later', label: 'In 3 hours', until: new Date(now.getTime() + 3 * 3600_000) },
    { key: 'tomorrow', label: 'Tomorrow', until: new Date(tomorrow) },
    { key: 'weekend', label: 'Saturday', until: new Date(zonedDateTimeToInstant(saturday, reminderTime, timeZone)) },
  ];
}
