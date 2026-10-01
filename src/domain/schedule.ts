/**
 * Scheduling rules, kept free of storage and UI so they can be tested directly.
 *
 * A task series has at most one pending occurrence. Missed work never piles up
 * into a backlog of repeated instructions.
 */
import { addDays, compareDates, diffDays, type LocalDate, maxDate } from './dates';

export type SeriesMode = 'once' | 'fixed' | 'after_completion';

export interface ScheduleRule {
  mode: SeriesMode;
  intervalDays: number | null;
  /** First due date. For fixed series this is also the anchor all repeats count from. */
  startDate: LocalDate;
}

export function validateRule(rule: ScheduleRule): string | null {
  if (rule.mode === 'once') return null;
  if (!rule.intervalDays || !Number.isInteger(rule.intervalDays) || rule.intervalDays < 1) {
    return 'Choose how often this repeats.';
  }
  if (rule.intervalDays > 730) return 'Repeats can be at most two years apart.';
  return null;
}

/**
 * The first fixed-series date (anchor + k × interval) that is after `after`
 * and not before `notBefore`.
 */
export function nextFixedDate(
  anchor: LocalDate,
  intervalDays: number,
  after: LocalDate,
  notBefore: LocalDate,
): LocalDate {
  const floor = maxDate(addDays(after, 1), notBefore)!;
  const gap = diffDays(anchor, floor);
  if (gap <= 0) return anchor;
  const k = Math.ceil(gap / intervalDays);
  return addDays(anchor, k * intervalDays);
}

/**
 * The due date for a series' pending occurrence when it is (re)built from history.
 * After-completion series count from the latest linked completion; otherwise from the start date.
 */
export function dueFromHistory(rule: ScheduleRule, latestLinkedCompletion: LocalDate | null, today: LocalDate): LocalDate {
  if (rule.mode === 'after_completion') {
    return latestLinkedCompletion ? addDays(latestLinkedCompletion, rule.intervalDays!) : rule.startDate;
  }
  if (rule.mode === 'fixed') {
    if (compareDates(rule.startDate, today) >= 0) return rule.startDate;
    return nextFixedDate(rule.startDate, rule.intervalDays!, addDays(today, -1), today);
  }
  return rule.startDate;
}

/**
 * The next occurrence created when an occurrence is completed.
 * `latestLinkedCompletion` must include the completion just recorded, so a
 * backdated entry can never pull the schedule behind a later real completion.
 */
export function successorAfterCompletion(
  rule: ScheduleRule,
  occurrenceDue: LocalDate,
  latestLinkedCompletion: LocalDate,
  today: LocalDate,
): LocalDate | null {
  switch (rule.mode) {
    case 'once':
      return null;
    case 'fixed':
      return nextFixedDate(rule.startDate, rule.intervalDays!, occurrenceDue, today);
    case 'after_completion':
      return addDays(latestLinkedCompletion, rule.intervalDays!);
  }
}

export type SkipOutcome =
  | { kind: 'next'; due: LocalDate }
  | { kind: 'pause' }
  | { kind: 'end' };

/**
 * Skipping never counts as doing the work.
 * Fixed series keep their later dates. After-completion series have no completion
 * to count from, so the user picks the next date, or the series pauses.
 */
export function successorAfterSkip(
  rule: ScheduleRule,
  occurrenceDue: LocalDate,
  today: LocalDate,
  chosenNext?: LocalDate | null,
): SkipOutcome {
  switch (rule.mode) {
    case 'once':
      return { kind: 'end' };
    case 'fixed':
      return { kind: 'next', due: nextFixedDate(rule.startDate, rule.intervalDays!, occurrenceDue, today) };
    case 'after_completion':
      return chosenNext ? { kind: 'next', due: chosenNext } : { kind: 'pause' };
  }
}

export type DueState = 'overdue' | 'today' | 'soon' | 'later';

export function dueState(due: LocalDate, today: LocalDate): DueState {
  const d = diffDays(today, due);
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d <= 3) return 'soon';
  return 'later';
}

export function intervalLabel(days: number): string {
  if (days % 7 === 0) {
    const w = days / 7;
    return w === 1 ? 'every week' : `every ${w} weeks`;
  }
  return days === 1 ? 'every day' : `every ${days} days`;
}
