import { zonedDateTimeToInstant } from '@/domain/dates';
import {
  diffNotifications,
  occurrenceIdFromNotificationId,
  planNotifications,
  type ReminderCandidate,
} from '@/domain/notification-plan';

const TZ = 'Australia/Sydney';
const now = zonedDateTimeToInstant('2026-10-01', '09:00', TZ);

function candidate(id: string, due: string, extra: Partial<ReminderCandidate> = {}): ReminderCandidate {
  return { occurrenceId: id, title: 'Mow', areaName: 'Front', dueDate: due, reminderTime: '07:00', snoozedUntil: null, ...extra };
}

describe('planning notifications', () => {
  it('skips alerts whose time has passed and orders the rest', () => {
    const plan = planNotifications([candidate('b', '2026-10-05'), candidate('a', '2026-10-01'), candidate('c', '2026-10-02')], TZ, now);
    expect(plan.map((p) => p.occurrenceId)).toEqual(['c', 'b']);
    expect(plan[0].title).toBe('Mow · Front');
    expect(plan[0].body).toMatch(/^Due today/);
  });

  it('uses the snooze time without changing the due date', () => {
    const until = new Date(now + 3 * 3600_000).toISOString();
    const [p] = planNotifications([candidate('a', '2026-10-01', { snoozedUntil: until })], TZ, now);
    expect(p.fireAt).toBe(Date.parse(until));
    const [later] = planNotifications(
      [candidate('a', '2026-10-01', { snoozedUntil: new Date(zonedDateTimeToInstant('2026-10-03', '07:00', TZ)).toISOString() })],
      TZ,
      now,
    );
    expect(later.body).toMatch(/Overdue by 2 days/);
  });

  it('stays under the platform limit, keeping the soonest', () => {
    const many = Array.from({ length: 80 }, (_, i) => candidate(`o${i}`, `2026-11-${String((i % 28) + 1).padStart(2, '0')}`));
    const plan = planNotifications(many, TZ, now, 48);
    expect(plan).toHaveLength(48);
    expect(plan[0].fireAt).toBeLessThanOrEqual(plan[47].fireAt);
  });

  it('changes the identifier when anything about the alert changes', () => {
    const [a] = planNotifications([candidate('x', '2026-10-05')], TZ, now);
    const [b] = planNotifications([candidate('x', '2026-10-06')], TZ, now);
    const [c] = planNotifications([candidate('x', '2026-10-05', { title: 'Mow the lawn' })], TZ, now);
    expect(new Set([a.id, b.id, c.id]).size).toBe(3);
    expect(occurrenceIdFromNotificationId(a.id)).toBe('x');
  });
});

describe('reconciling with the operating system', () => {
  it('cancels stale app alerts, keeps current ones, schedules missing ones and ignores others', () => {
    const desired = planNotifications([candidate('a', '2026-10-05'), candidate('b', '2026-10-06')], TZ, now);
    const diff = diffNotifications(desired, [desired[0].id, 'lt:old:1:abc', 'someone-else']);
    expect(diff.cancel).toEqual(['lt:old:1:abc']);
    expect(diff.schedule.map((d) => d.occurrenceId)).toEqual(['b']);
  });

  it('is a no-op when already in sync', () => {
    const desired = planNotifications([candidate('a', '2026-10-05')], TZ, now);
    expect(diffNotifications(desired, desired.map((d) => d.id))).toEqual({ cancel: [], schedule: [] });
  });
});
