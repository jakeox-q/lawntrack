import {
  addDays,
  diffDays,
  instantToLocalDate,
  instantToLocalTime,
  isLocalDate,
  nextWeekday,
  todayIn,
  zonedDateTimeToInstant,
} from '@/domain/dates';

describe('local dates', () => {
  it('validates real calendar dates only', () => {
    expect(isLocalDate('2026-02-28')).toBe(true);
    expect(isLocalDate('2026-02-29')).toBe(false);
    expect(isLocalDate('2028-02-29')).toBe(true);
    expect(isLocalDate('2026-10-1')).toBe(false);
  });

  it('does calendar-day arithmetic across month, year and DST boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-25', 14)).toBe('2027-01-08');
    expect(addDays('2026-10-03', 1)).toBe('2026-10-04'); // Sydney DST starts 4 Oct 2026
    expect(diffDays('2026-10-01', '2026-11-12')).toBe(42);
    expect(diffDays('2026-11-12', '2026-10-01')).toBe(-42);
  });

  it('finds the next weekday', () => {
    // 1 Oct 2026 is a Thursday
    expect(nextWeekday('2026-10-01', 6)).toBe('2026-10-03');
    expect(nextWeekday('2026-10-03', 6)).toBe('2026-10-10');
    expect(nextWeekday('2026-10-03', 6, true)).toBe('2026-10-03');
  });
});

describe('time zones', () => {
  const SYD = 'Australia/Sydney';
  const PER = 'Australia/Perth';

  it('treats a due date as the date where the lawn is, not UTC', () => {
    // 20:30 UTC on 30 Sep is already 1 Oct in Sydney (+10).
    const now = new Date('2026-09-30T20:30:00Z');
    expect(todayIn(SYD, now)).toBe('2026-10-01');
    expect(todayIn(PER, now)).toBe('2026-10-01');
    expect(todayIn('UTC', now)).toBe('2026-09-30');
  });

  it('converts a reminder wall time to the right instant either side of daylight saving', () => {
    expect(new Date(zonedDateTimeToInstant('2026-10-03', '07:00', SYD)).toISOString()).toBe('2026-10-02T21:00:00.000Z'); // AEST +10
    expect(new Date(zonedDateTimeToInstant('2026-10-05', '07:00', SYD)).toISOString()).toBe('2026-10-04T20:00:00.000Z'); // AEDT +11
    expect(new Date(zonedDateTimeToInstant('2026-10-05', '07:00', PER)).toISOString()).toBe('2026-10-04T23:00:00.000Z'); // no DST
  });

  it('moves a time inside the spring-forward gap to after the change', () => {
    const t = zonedDateTimeToInstant('2026-10-04', '02:30', SYD);
    expect(instantToLocalDate(t, SYD)).toBe('2026-10-04');
    expect(instantToLocalTime(t, SYD)).toBe('03:30');
  });

  it('round-trips ordinary times', () => {
    const t = zonedDateTimeToInstant('2027-04-04', '18:45', SYD);
    expect(instantToLocalDate(t, SYD)).toBe('2027-04-04');
    expect(instantToLocalTime(t, SYD)).toBe('18:45');
  });
});
