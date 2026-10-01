import { randomUUID } from 'node:crypto';

import { migrate, MIGRATIONS } from '@/data/migrations';
import { createTestDb } from './helpers/node-db';
import { createRepo, type Repo } from '@/data/repo';
import type { SeriesInput } from '@/data/types';
import { zonedDateTimeToInstant } from '@/domain/dates';

const TZ = 'Australia/Sydney';

async function setup(startDate = '2026-10-01') {
  const db = createTestDb();
  await migrate(db);
  const clock = { now: new Date(zonedDateTimeToInstant(startDate, '09:00', TZ)) };
  const repo = createRepo(db, { newId: randomUUID, now: () => clock.now, deviceTimeZone: () => TZ });
  await repo.completeOnboarding(TZ);
  const areaId = await repo.createArea({ name: 'Front', sizeM2: 120, grassType: 'Buffalo' });
  const setToday = (d: string) => {
    clock.now = new Date(zonedDateTimeToInstant(d, '09:00', TZ));
  };
  return { db, repo, areaId, setToday };
}

function mowing(areaId: string, extra: Partial<SeriesInput> = {}): SeriesInput {
  return {
    areaId,
    kind: 'mow',
    title: 'Mow',
    mode: 'after_completion',
    intervalDays: 7,
    startDate: '2026-10-01',
    reminderTime: '07:00',
    ...extra,
  };
}

async function onlyTask(repo: Repo) {
  const s = await repo.loadSnapshot();
  expect(s.tasks).toHaveLength(1);
  return s.tasks[0];
}

describe('migrations', () => {
  it('apply once and are idempotent', async () => {
    const { db } = await setup();
    await migrate(db);
    const v = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(v?.user_version).toBe(MIGRATIONS.length);
  });
});

describe('core journey: area → reminder → complete → next due → history', () => {
  it('produces the next date from the real completion and records history', async () => {
    const { repo, areaId, setToday } = await setup();
    await repo.createSeries(mowing(areaId));
    const first = await onlyTask(repo);
    expect(first.occurrence.dueDate).toBe('2026-10-01');
    expect(first.area?.name).toBe('Front');

    setToday('2026-10-03'); // done two days late
    const result = await repo.completeOccurrence(first.occurrence.id, '2026-10-03');
    expect(result.successorDue).toBe('2026-10-10');

    const s = await repo.loadSnapshot();
    expect(s.tasks[0].occurrence.dueDate).toBe('2026-10-10');
    expect(s.tasks[0].lastDone).toBe('2026-10-03');
    expect(s.activities).toHaveLength(1);
    expect(s.activities[0]).toMatchObject({ kind: 'mow', localDate: '2026-10-03', seriesId: first.series.id });
  });

  it('survives reopening the database (persistence is the database, not memory)', async () => {
    const { db, repo, areaId } = await setup();
    await repo.createSeries(mowing(areaId));
    const t = await onlyTask(repo);
    await repo.completeOccurrence(t.occurrence.id, '2026-10-01');
    const reopened = createRepo(db, { newId: randomUUID, now: () => new Date(zonedDateTimeToInstant('2026-10-02', '09:00', TZ)), deviceTimeZone: () => 'UTC' });
    const s = await reopened.loadSnapshot();
    expect(s.timeZone).toBe(TZ); // stored zone wins over the device zone
    expect(s.tasks[0].occurrence.dueDate).toBe('2026-10-08');
    expect(s.activities).toHaveLength(1);
  });
});

describe('repeated taps', () => {
  it('completing the same occurrence twice creates one activity and one successor', async () => {
    const { repo, areaId, db } = await setup();
    await repo.createSeries(mowing(areaId));
    const t = await onlyTask(repo);
    const [a, b] = await Promise.all([
      repo.completeOccurrence(t.occurrence.id, '2026-10-01'),
      repo.completeOccurrence(t.occurrence.id, '2026-10-01'),
    ]);
    expect([a.alreadyResolved, b.alreadyResolved].sort()).toEqual([false, true]);
    const acts = await db.getAllAsync('SELECT * FROM activities WHERE deleted_at IS NULL');
    expect(acts).toHaveLength(1);
    expect(await repo.countPending()).toBe(1);
  });

  it('the database itself refuses a second open occurrence for a series', async () => {
    const { repo, areaId, db } = await setup();
    const { seriesId } = await repo.createSeries(mowing(areaId));
    await expect(
      db.runAsync(
        "INSERT INTO task_occurrences (id, series_id, due_date, status, created_at, updated_at) VALUES ('x', ?, '2026-10-02', 'pending', 'n', 'n')",
        seriesId,
      ),
    ).rejects.toThrow(/UNIQUE/);
  });
});

describe('snooze, reschedule and skip', () => {
  it('snooze changes the alert, not the due date or history', async () => {
    const { repo, areaId } = await setup();
    await repo.createSeries(mowing(areaId));
    const t = await onlyTask(repo);
    const until = new Date('2026-10-01T05:00:00Z');
    await repo.snoozeOccurrence(t.occurrence.id, until);
    const after = await onlyTask(repo);
    expect(after.occurrence.dueDate).toBe('2026-10-01');
    expect(after.occurrence.snoozedUntil).toBe(until.toISOString());
    expect((await repo.loadSnapshot()).activities).toHaveLength(0);
  });

  it('reschedule moves only this occurrence; completion still counts from the real date', async () => {
    const { repo, areaId, setToday } = await setup();
    await repo.createSeries(mowing(areaId));
    const t = await onlyTask(repo);
    await repo.rescheduleOccurrence(t.occurrence.id, '2026-10-05');
    expect((await onlyTask(repo)).occurrence.dueDate).toBe('2026-10-05');
    setToday('2026-10-04');
    const r = await repo.completeOccurrence(t.occurrence.id, '2026-10-04');
    expect(r.successorDue).toBe('2026-10-11');
  });

  it('skipping a fixed series keeps later dates and creates no activity', async () => {
    const { repo, areaId } = await setup();
    await repo.createSeries(mowing(areaId, { kind: 'fertilise_granular', title: 'Feed', mode: 'fixed', intervalDays: 28 }));
    const t = await onlyTask(repo);
    const r = await repo.skipOccurrence(t.occurrence.id);
    expect(r.successorDue).toBe('2026-10-29');
    expect((await repo.loadSnapshot()).activities).toHaveLength(0);
  });

  it('skipping an after-completion series without a date pauses it', async () => {
    const { repo, areaId } = await setup();
    await repo.createSeries(mowing(areaId));
    const t = await onlyTask(repo);
    const r = await repo.skipOccurrence(t.occurrence.id);
    expect(r.paused).toBe(true);
    const s = await repo.loadSnapshot();
    expect(s.tasks).toHaveLength(0);
    expect(s.series[0].paused).toBe(true);
    await repo.resumeSeries(s.series[0].id, '2026-10-08');
    expect((await onlyTask(repo)).occurrence.dueDate).toBe('2026-10-08');
  });

  it('skipping an after-completion series with a chosen date uses that date', async () => {
    const { repo, areaId } = await setup();
    await repo.createSeries(mowing(areaId));
    const t = await onlyTask(repo);
    expect((await repo.skipOccurrence(t.occurrence.id, '2026-10-06')).successorDue).toBe('2026-10-06');
  });
});

describe('undo, backdate, edit and delete', () => {
  it('undo of a completion reopens the task and removes the entry', async () => {
    const { repo, areaId } = await setup();
    await repo.createSeries(mowing(areaId));
    const t = await onlyTask(repo);
    await repo.completeOccurrence(t.occurrence.id, '2026-10-01');
    expect(await repo.reopenOccurrence(t.occurrence.id)).toBe(true);
    const s = await repo.loadSnapshot();
    expect(s.tasks[0].occurrence.id).toBe(t.occurrence.id);
    expect(s.tasks[0].occurrence.dueDate).toBe('2026-10-01');
    expect(s.activities).toHaveLength(0);
  });

  it('undo is refused once the next occurrence has been changed', async () => {
    const { repo, areaId } = await setup();
    await repo.createSeries(mowing(areaId));
    const t = await onlyTask(repo);
    await repo.completeOccurrence(t.occurrence.id, '2026-10-01');
    const next = await onlyTask(repo);
    await repo.rescheduleOccurrence(next.occurrence.id, '2026-10-09');
    expect(await repo.reopenOccurrence(t.occurrence.id)).toBe(false);
  });

  it('undo of a pausing skip resumes the series', async () => {
    const { repo, areaId } = await setup();
    await repo.createSeries(mowing(areaId));
    const t = await onlyTask(repo);
    await repo.skipOccurrence(t.occurrence.id);
    expect(await repo.reopenOccurrence(t.occurrence.id)).toBe(true);
    const again = await onlyTask(repo);
    expect(again.series.paused).toBe(false);
  });

  it('a backdated completion older than the latest one does not pull the schedule back', async () => {
    const { repo, areaId, setToday } = await setup();
    await repo.createSeries(mowing(areaId, { intervalDays: 14 }));
    setToday('2026-10-10');
    await repo.completeOccurrence((await onlyTask(repo)).occurrence.id, '2026-10-10'); // next 24 Oct
    // User then logs an older mow against the open task.
    const r = await repo.logActivity({ areaId, kind: 'mow', localDate: '2026-10-05' }, (await onlyTask(repo)).occurrence.id);
    expect(r.successorDue).toBe('2026-10-24');
  });

  it('editing the latest linked date recomputes the open task', async () => {
    const { repo, areaId, setToday } = await setup();
    await repo.createSeries(mowing(areaId));
    setToday('2026-10-03');
    await repo.completeOccurrence((await onlyTask(repo)).occurrence.id, '2026-10-03');
    const s = await repo.loadSnapshot();
    const act = s.activities[0];
    await repo.updateActivity(act.id, { areaId, kind: 'mow', localDate: '2026-10-02' });
    expect((await onlyTask(repo)).occurrence.dueDate).toBe('2026-10-09');
  });

  it('deleting the latest linked entry after later changes rebuilds from remaining history', async () => {
    const { repo, areaId, setToday } = await setup();
    await repo.createSeries(mowing(areaId));
    await repo.completeOccurrence((await onlyTask(repo)).occurrence.id, '2026-10-01'); // next 8 Oct
    setToday('2026-10-08');
    await repo.completeOccurrence((await onlyTask(repo)).occurrence.id, '2026-10-08'); // next 15 Oct
    const open = await onlyTask(repo);
    await repo.snoozeOccurrence(open.occurrence.id, new Date('2026-10-14T20:00:00Z')); // touched: no reopen
    const latest = (await repo.loadSnapshot()).activities.find((a) => a.localDate === '2026-10-08')!;
    expect((await repo.deleteActivity(latest.id)).reopened).toBe(false);
    const after = await onlyTask(repo);
    expect(after.occurrence.dueDate).toBe('2026-10-08'); // 1 Oct + 7
    expect(after.lastDone).toBe('2026-10-01');
  });

  it('deleting the entry that just completed a task reopens it', async () => {
    const { repo, areaId } = await setup();
    await repo.createSeries(mowing(areaId));
    const t = await onlyTask(repo);
    const r = await repo.completeOccurrence(t.occurrence.id, '2026-10-01');
    expect((await repo.deleteActivity(r.activityId!)).reopened).toBe(true);
    expect((await onlyTask(repo)).occurrence.id).toBe(t.occurrence.id);
  });

  it('rejects work logged in the future', async () => {
    const { repo, areaId } = await setup();
    await expect(repo.logActivity({ areaId, kind: 'mow', localDate: '2026-10-02' })).rejects.toThrow(/today or earlier/);
  });
});

describe('products and provenance', () => {
  it('copies the rate used into the history entry so later edits do not rewrite it', async () => {
    const { repo, areaId } = await setup();
    const { seriesId } = await repo.createSeries(
      mowing(areaId, { kind: 'fertilise_granular', title: 'Feed', mode: 'fixed', intervalDays: 42, productName: 'Example 10-2-6', rateValue: 25, rateUnit: 'g/m2' }),
    );
    await repo.completeOccurrence((await onlyTask(repo)).occurrence.id, '2026-10-01');
    const s = await repo.loadSnapshot();
    await repo.updateSeries(seriesId, { ...mowing(areaId), kind: 'fertilise_granular', title: 'Feed', mode: 'fixed', intervalDays: 42, rateValue: 30, rateUnit: 'g/m2' });
    const after = await repo.loadSnapshot();
    expect(s.activities[0]).toMatchObject({ productName: 'Example 10-2-6', rateValue: 25, rateUnit: 'g/m2', rateSource: 'user' });
    expect(after.activities[0].rateValue).toBe(25);
  });

  it('logs unlinked work without touching any schedule', async () => {
    const { repo, areaId } = await setup();
    await repo.createSeries(mowing(areaId));
    await repo.logActivity({ areaId, kind: 'mow', localDate: '2026-10-01' });
    const t = await onlyTask(repo);
    expect(t.occurrence.dueDate).toBe('2026-10-01');
    expect(t.lastDone).toBeNull();
  });
});

describe('areas', () => {
  it('removing an area removes its open tasks but keeps history', async () => {
    const { repo, areaId } = await setup();
    await repo.createSeries(mowing(areaId));
    await repo.completeOccurrence((await onlyTask(repo)).occurrence.id, '2026-10-01');
    await repo.deleteArea(areaId);
    const s = await repo.loadSnapshot();
    expect(s.tasks).toHaveLength(0);
    expect(s.areas).toHaveLength(0);
    expect(s.activities).toHaveLength(1);
  });
});
