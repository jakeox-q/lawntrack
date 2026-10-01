import { instantToLocalDate, instantToLocalTime, zonedDateTimeToInstant } from '@/domain/dates';
import { snoozeChoices } from '@/domain/snooze';

const TZ = 'Australia/Sydney';

it('offers later today, tomorrow at the reminder time, and the coming Saturday', () => {
  const now = new Date(zonedDateTimeToInstant('2026-10-01', '09:00', TZ)); // Thursday
  const [later, tomorrow, sat] = snoozeChoices(now, TZ, '07:30');
  expect(later.until.getTime() - now.getTime()).toBe(3 * 3600_000);
  expect(instantToLocalDate(tomorrow.until.getTime(), TZ)).toBe('2026-10-02');
  expect(instantToLocalTime(tomorrow.until.getTime(), TZ)).toBe('07:30');
  expect(instantToLocalDate(sat.until.getTime(), TZ)).toBe('2026-10-03');
});

it('on a weekend, Saturday means next week', () => {
  const now = new Date(zonedDateTimeToInstant('2026-10-03', '09:00', TZ)); // Saturday
  expect(instantToLocalDate(snoozeChoices(now, TZ, '07:00')[2].until.getTime(), TZ)).toBe('2026-10-10');
});
