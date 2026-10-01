import {
  dueFromHistory,
  dueState,
  intervalLabel,
  nextFixedDate,
  successorAfterCompletion,
  successorAfterSkip,
  validateRule,
} from '@/domain/schedule';

const fixed14 = { mode: 'fixed' as const, intervalDays: 14, startDate: '2026-10-01' };
const after42 = { mode: 'after_completion' as const, intervalDays: 42, startDate: '2026-10-01' };
const once = { mode: 'once' as const, intervalDays: null, startDate: '2026-10-10' };

describe('fixed series', () => {
  it('keeps its anchor dates', () => {
    expect(nextFixedDate('2026-10-01', 14, '2026-10-01', '2026-10-01')).toBe('2026-10-15');
    expect(nextFixedDate('2026-10-01', 14, '2026-09-20', '2026-09-20')).toBe('2026-10-01');
  });

  it('does not move when completed late, and does not create a backlog', () => {
    // Due 1 Oct, done 20 Oct: 15 Oct has passed, so the next is 29 Oct (not 3 Nov).
    expect(successorAfterCompletion(fixed14, '2026-10-01', '2026-10-20', '2026-10-20')).toBe('2026-10-29');
  });

  it('does not move when completed early', () => {
    expect(successorAfterCompletion(fixed14, '2026-10-15', '2026-10-10', '2026-10-10')).toBe('2026-10-29');
  });

  it('keeps later dates when an occurrence is skipped', () => {
    expect(successorAfterSkip(fixed14, '2026-10-15', '2026-10-15')).toEqual({ kind: 'next', due: '2026-10-29' });
  });
});

describe('after-completion series', () => {
  it('counts from the actual completion date', () => {
    expect(successorAfterCompletion(after42, '2026-10-01', '2026-10-09', '2026-10-09')).toBe('2026-11-20');
  });

  it('never lets a backdated entry pull the schedule behind a later completion', () => {
    // The caller passes the latest linked completion, which is the later one.
    expect(successorAfterCompletion(after42, '2026-11-20', '2026-11-18', '2026-11-25')).toBe('2026-12-30');
  });

  it('asks for a date or pauses when skipped, and never implies completion', () => {
    expect(successorAfterSkip(after42, '2026-11-20', '2026-11-20')).toEqual({ kind: 'pause' });
    expect(successorAfterSkip(after42, '2026-11-20', '2026-11-20', '2026-12-01')).toEqual({ kind: 'next', due: '2026-12-01' });
  });

  it('rebuilds from remaining history or falls back to the chosen start date', () => {
    expect(dueFromHistory(after42, '2026-10-09', '2026-10-20')).toBe('2026-11-20');
    expect(dueFromHistory(after42, null, '2026-10-20')).toBe('2026-10-01');
  });
});

describe('one-off tasks', () => {
  it('end after completion or skip', () => {
    expect(successorAfterCompletion(once, '2026-10-10', '2026-10-10', '2026-10-10')).toBeNull();
    expect(successorAfterSkip(once, '2026-10-10', '2026-10-10')).toEqual({ kind: 'end' });
  });
});

describe('rules and labels', () => {
  it('validates intervals', () => {
    expect(validateRule(once)).toBeNull();
    expect(validateRule({ ...fixed14, intervalDays: 0 })).not.toBeNull();
    expect(validateRule({ ...fixed14, intervalDays: 2.5 })).not.toBeNull();
    expect(validateRule(fixed14)).toBeNull();
  });

  it('describes due state relative to today', () => {
    expect(dueState('2026-09-30', '2026-10-01')).toBe('overdue');
    expect(dueState('2026-10-01', '2026-10-01')).toBe('today');
    expect(dueState('2026-10-04', '2026-10-01')).toBe('soon');
    expect(dueState('2026-10-05', '2026-10-01')).toBe('later');
  });

  it('labels intervals in weeks when they divide evenly', () => {
    expect(intervalLabel(7)).toBe('every week');
    expect(intervalLabel(42)).toBe('every 6 weeks');
    expect(intervalLabel(10)).toBe('every 10 days');
  });
});
