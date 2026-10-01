/**
 * Desired notification state is derived from the database, then reconciled with
 * what the operating system has scheduled. The OS identifier encodes the occurrence,
 * fire time and content, so any change produces a new identifier and stale alerts
 * are cancelled rather than left behind.
 */
import { formatDate, relativeDue } from './format';
import { type LocalDate, type LocalTime, instantToLocalDate, zonedDateTimeToInstant } from './dates';

/** iOS keeps at most 64 pending local notifications per app; stay well under it. */
export const MAX_SCHEDULED = 48;
export const ID_PREFIX = 'lt:';

export interface ReminderCandidate {
  occurrenceId: string;
  title: string;
  areaName: string | null;
  dueDate: LocalDate;
  reminderTime: LocalTime;
  /** ISO timestamp; overrides the normal alert time without changing the due date. */
  snoozedUntil: string | null;
}

export interface DesiredNotification {
  id: string;
  occurrenceId: string;
  fireAt: number;
  title: string;
  body: string;
}

export function alertInstant(c: ReminderCandidate, timeZone: string): number {
  if (c.snoozedUntil) {
    const t = Date.parse(c.snoozedUntil);
    if (Number.isFinite(t)) return t;
  }
  return zonedDateTimeToInstant(c.dueDate, c.reminderTime, timeZone);
}

function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function notificationId(occurrenceId: string, fireAt: number, title: string, body: string): string {
  return `${ID_PREFIX}${occurrenceId}:${fireAt}:${hash(`${title}\n${body}`)}`;
}

export function occurrenceIdFromNotificationId(id: string): string | null {
  if (!id.startsWith(ID_PREFIX)) return null;
  const rest = id.slice(ID_PREFIX.length);
  const idx = rest.indexOf(':');
  return idx > 0 ? rest.slice(0, idx) : null;
}

export function planNotifications(
  candidates: ReminderCandidate[],
  timeZone: string,
  now: number,
  limit = MAX_SCHEDULED,
): DesiredNotification[] {
  const planned: DesiredNotification[] = [];
  for (const c of candidates) {
    const fireAt = alertInstant(c, timeZone);
    if (fireAt <= now + 5_000) continue; // already passed: the task stays visible in the app instead
    const fireDate = instantToLocalDate(fireAt, timeZone);
    const title = c.areaName ? `${c.title} · ${c.areaName}` : c.title;
    const body =
      fireDate === c.dueDate
        ? 'Due today. Tap to mark done or snooze.'
        : `${relativeDue(c.dueDate, fireDate)} (${formatDate(c.dueDate, fireDate)}). Tap to mark done or snooze.`;
    planned.push({ id: notificationId(c.occurrenceId, fireAt, title, body), occurrenceId: c.occurrenceId, fireAt, title, body });
  }
  planned.sort((a, b) => a.fireAt - b.fireAt || a.id.localeCompare(b.id));
  return planned.slice(0, limit);
}

export interface NotificationDiff {
  cancel: string[];
  schedule: DesiredNotification[];
}

/** Only identifiers this app created (prefix `lt:`) are ever cancelled. */
export function diffNotifications(desired: DesiredNotification[], scheduledIds: string[]): NotificationDiff {
  const want = new Set(desired.map((d) => d.id));
  const have = new Set(scheduledIds);
  return {
    cancel: scheduledIds.filter((id) => id.startsWith(ID_PREFIX) && !want.has(id)),
    schedule: desired.filter((d) => !have.has(d.id)),
  };
}
