import { activityType, isActivityKind } from '@/domain/activity-types';
import { isRateUnit } from '@/domain/calculator';
import { compareDates, isLocalDate, isLocalTime, type LocalDate, todayIn } from '@/domain/dates';
import {
  dueFromHistory,
  type ScheduleRule,
  successorAfterCompletion,
  successorAfterSkip,
  validateRule,
} from '@/domain/schedule';

import type { Db } from './db';
import type {
  Activity,
  ActivityDetails,
  ActivityInput,
  Area,
  Occurrence,
  Series,
  SeriesInput,
  Settings,
  Snapshot,
  TaskItem,
} from './types';

export interface RepoDeps {
  newId(): string;
  now(): Date;
  deviceTimeZone(): string;
}

export class RepoError extends Error {}

type Row = Record<string, unknown>;

const str = (v: unknown): string | null => (v == null ? null : String(v));
const num = (v: unknown): number | null => (v == null ? null : Number(v));

function mapArea(r: Row): Area {
  return {
    id: String(r.id),
    name: String(r.name),
    sizeM2: num(r.size_m2),
    grassType: str(r.grass_type),
    notes: str(r.notes),
    sortOrder: Number(r.sort_order ?? 0),
  };
}

function mapSeries(r: Row): Series {
  const kind = String(r.kind);
  const unit = str(r.rate_unit);
  return {
    id: String(r.id),
    areaId: str(r.area_id),
    kind: isActivityKind(kind) ? kind : 'other',
    title: String(r.title),
    mode: r.mode as Series['mode'],
    intervalDays: num(r.interval_days),
    startDate: String(r.start_date),
    reminderTime: String(r.reminder_time),
    productName: str(r.product_name),
    rateValue: num(r.rate_value),
    rateUnit: isRateUnit(unit) ? unit : null,
    notes: str(r.notes),
    paused: Number(r.paused) === 1,
  };
}

function mapOccurrence(r: Row): Occurrence {
  return {
    id: String(r.id),
    seriesId: String(r.series_id),
    dueDate: String(r.due_date),
    status: r.status as Occurrence['status'],
    dueOverridden: Number(r.due_overridden) === 1,
    snoozedUntil: str(r.snoozed_until),
    previousOccurrenceId: str(r.previous_occurrence_id),
    activityId: str(r.activity_id),
    resolvedAt: str(r.resolved_at),
  };
}

function mapActivity(r: Row): Activity {
  const kind = String(r.kind);
  const unit = str(r.rate_unit);
  return {
    id: String(r.id),
    areaId: str(r.area_id),
    kind: isActivityKind(kind) ? kind : 'other',
    title: str(r.title),
    localDate: String(r.local_date),
    loggedAt: String(r.logged_at),
    seriesId: str(r.series_id),
    occurrenceId: str(r.occurrence_id),
    productName: str(r.product_name),
    quantityValue: num(r.quantity_value),
    quantityUnit: str(r.quantity_unit),
    rateValue: num(r.rate_value),
    rateUnit: isRateUnit(unit) ? unit : null,
    rateSource: str(r.rate_source),
    mowHeightMm: num(r.mow_height_mm),
    notes: str(r.notes),
  };
}

const ruleOf = (s: Series): ScheduleRule => ({ mode: s.mode, intervalDays: s.intervalDays, startDate: s.startDate });

const clean = (v: string | null | undefined): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

export interface CompletionResult {
  activityId: string | null;
  successorDue: LocalDate | null;
  alreadyResolved: boolean;
}

export interface SkipResult {
  successorDue: LocalDate | null;
  paused: boolean;
  alreadyResolved: boolean;
}

export type Repo = ReturnType<typeof createRepo>;

export function createRepo(db: Db, deps: RepoDeps) {
  // One mutation at a time: expo-sqlite transactions are not exclusive, so concurrent
  // taps (or a notification action racing a screen) are queued here.
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = queue.then(fn, fn);
    queue = run.catch(() => undefined);
    return run;
  }
  function tx<T>(fn: () => Promise<T>): Promise<T> {
    return serial(async () => {
      let result!: T;
      await db.withTransactionAsync(async () => {
        result = await fn();
      });
      return result;
    });
  }

  const stamp = () => deps.now().toISOString();

  // ---------- settings ----------

  async function readSettings(): Promise<Settings> {
    const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const reminder = map.get('reminder_time');
    return {
      timeZone: map.get('time_zone') ?? null,
      reminderTime: isLocalTime(reminder) ? reminder : '07:00',
      onboardingComplete: map.get('onboarding_complete') === '1',
      notificationsAsked: map.get('notifications_asked') === '1',
    };
  }

  async function writeSetting(key: string, value: string) {
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      value,
    );
  }

  async function zone(): Promise<string> {
    return (await readSettings()).timeZone ?? deps.deviceTimeZone();
  }

  async function today(): Promise<LocalDate> {
    return todayIn(await zone(), deps.now());
  }

  // ---------- reads used inside transactions ----------

  async function getSeriesRow(id: string): Promise<Series | null> {
    const r = await db.getFirstAsync<Row>('SELECT * FROM task_series WHERE id = ? AND deleted_at IS NULL', id);
    return r ? mapSeries(r) : null;
  }

  async function getOccurrenceRow(id: string): Promise<Occurrence | null> {
    const r = await db.getFirstAsync<Row>('SELECT * FROM task_occurrences WHERE id = ?', id);
    return r ? mapOccurrence(r) : null;
  }

  async function getActivityRow(id: string): Promise<Activity | null> {
    const r = await db.getFirstAsync<Row>('SELECT * FROM activities WHERE id = ? AND deleted_at IS NULL', id);
    return r ? mapActivity(r) : null;
  }

  async function pendingFor(seriesId: string): Promise<Occurrence | null> {
    const r = await db.getFirstAsync<Row>(
      "SELECT * FROM task_occurrences WHERE series_id = ? AND status = 'pending'",
      seriesId,
    );
    return r ? mapOccurrence(r) : null;
  }

  async function latestLinked(seriesId: string): Promise<LocalDate | null> {
    const r = await db.getFirstAsync<{ d: string | null }>(
      'SELECT MAX(local_date) AS d FROM activities WHERE series_id = ? AND deleted_at IS NULL',
      seriesId,
    );
    return r?.d ?? null;
  }

  async function insertOccurrence(seriesId: string, due: LocalDate, previousId: string | null, overridden = false) {
    const id = deps.newId();
    const t = stamp();
    await db.runAsync(
      `INSERT INTO task_occurrences (id, series_id, due_date, status, due_overridden, previous_occurrence_id, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)`,
      id,
      seriesId,
      due,
      overridden ? 1 : 0,
      previousId,
      t,
      t,
    );
    return id;
  }

  async function insertActivity(
    input: ActivityInput & { seriesId: string | null; occurrenceId: string | null },
  ): Promise<string> {
    const id = deps.newId();
    const t = stamp();
    const rate = input.rateValue ?? null;
    await db.runAsync(
      `INSERT INTO activities (id, area_id, kind, title, local_date, logged_at, series_id, occurrence_id, product_name,
         quantity_value, quantity_unit, rate_value, rate_unit, rate_source, mow_height_mm, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.areaId,
      input.kind,
      clean(input.title),
      input.localDate,
      t,
      input.seriesId,
      input.occurrenceId,
      clean(input.productName),
      input.quantityValue ?? null,
      clean(input.quantityUnit),
      rate,
      rate != null ? (input.rateUnit ?? null) : null,
      rate != null ? 'user' : null,
      input.mowHeightMm ?? null,
      clean(input.notes),
      t,
      t,
    );
    return id;
  }

  /** Rebuild an after-completion series' open date from its remaining history. */
  async function recomputePending(seriesId: string) {
    const series = await getSeriesRow(seriesId);
    if (!series || series.mode !== 'after_completion') return;
    const pending = await pendingFor(seriesId);
    if (!pending || pending.dueOverridden) return;
    const due = dueFromHistory(ruleOf(series), await latestLinked(seriesId), await today());
    if (due !== pending.dueDate) {
      await db.runAsync(
        'UPDATE task_occurrences SET due_date = ?, snoozed_until = NULL, updated_at = ? WHERE id = ?',
        due,
        stamp(),
        pending.id,
      );
    }
  }

  async function assertNotFuture(date: LocalDate) {
    if (!isLocalDate(date)) throw new RepoError('Choose a valid date.');
    if (compareDates(date, await today()) > 0) throw new RepoError('Work can only be logged for today or earlier.');
  }

  async function completeInternal(occurrenceId: string, localDate: LocalDate, details: ActivityDetails): Promise<CompletionResult> {
    const occ = await getOccurrenceRow(occurrenceId);
    if (!occ) throw new RepoError('That task no longer exists.');
    if (occ.status !== 'pending') {
      return { activityId: occ.activityId, successorDue: null, alreadyResolved: true };
    }
    const series = await getSeriesRow(occ.seriesId);
    if (!series) throw new RepoError('That task no longer exists.');
    await assertNotFuture(localDate);

    const hasRate = details.rateValue != null;
    const activityId = await insertActivity({
      areaId: series.areaId,
      kind: series.kind,
      title: series.title,
      localDate,
      seriesId: series.id,
      occurrenceId: occ.id,
      productName: details.productName !== undefined ? details.productName : series.productName,
      quantityValue: details.quantityValue,
      quantityUnit: details.quantityUnit,
      rateValue: hasRate ? details.rateValue : series.rateValue,
      rateUnit: hasRate ? details.rateUnit : series.rateUnit,
      mowHeightMm: details.mowHeightMm,
      notes: details.notes,
    });
    const t = stamp();
    await db.runAsync(
      "UPDATE task_occurrences SET status = 'done', activity_id = ?, resolved_at = ?, snoozed_until = NULL, updated_at = ? WHERE id = ?",
      activityId,
      t,
      t,
      occ.id,
    );
    const latest = (await latestLinked(series.id)) ?? localDate;
    const nextDue = successorAfterCompletion(ruleOf(series), occ.dueDate, latest, await today());
    if (nextDue) await insertOccurrence(series.id, nextDue, occ.id);
    return { activityId, successorDue: nextDue, alreadyResolved: false };
  }

  /** Put a resolved occurrence back to pending, if nothing has happened since. */
  async function reopenInternal(occurrenceId: string): Promise<boolean> {
    const occ = await getOccurrenceRow(occurrenceId);
    if (!occ || occ.status === 'pending') return false;
    const succRow = await db.getFirstAsync<Row>(
      'SELECT * FROM task_occurrences WHERE previous_occurrence_id = ?',
      occ.id,
    );
    const successor = succRow ? mapOccurrence(succRow) : null;
    if (successor && (successor.status !== 'pending' || successor.dueOverridden || successor.snoozedUntil)) return false;
    const otherPending = await pendingFor(occ.seriesId);
    if (otherPending && otherPending.id !== successor?.id) return false;

    const t = stamp();
    if (successor) await db.runAsync('DELETE FROM task_occurrences WHERE id = ?', successor.id);
    if (occ.activityId) {
      await db.runAsync('UPDATE activities SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, occ.activityId);
    }
    if (occ.status === 'skipped' && !successor) {
      await db.runAsync('UPDATE task_series SET paused = 0, updated_at = ? WHERE id = ?', t, occ.seriesId);
    }
    await db.runAsync(
      "UPDATE task_occurrences SET status = 'pending', activity_id = NULL, resolved_at = NULL, updated_at = ? WHERE id = ?",
      t,
      occ.id,
    );
    return true;
  }

  function validateSeriesInput(input: SeriesInput) {
    if (!clean(input.title)) throw new RepoError('Give the task a name.');
    if (!isActivityKind(input.kind)) throw new RepoError('Choose a type of job.');
    if (!isLocalDate(input.startDate)) throw new RepoError('Choose a first date.');
    if (!isLocalTime(input.reminderTime)) throw new RepoError('Choose a reminder time.');
    const ruleError = validateRule({ mode: input.mode, intervalDays: input.intervalDays, startDate: input.startDate });
    if (ruleError) throw new RepoError(ruleError);
    if (input.rateValue != null && (!Number.isFinite(input.rateValue) || input.rateValue <= 0)) {
      throw new RepoError('Enter a rate above zero, or leave it blank.');
    }
    if (input.rateValue != null && !input.rateUnit) throw new RepoError('Choose the rate unit.');
  }

  // ---------- public API ----------

  return {
    async loadSnapshot(): Promise<Snapshot> {
      return serial(async () => {
        const settings = await readSettings();
        const timeZone = settings.timeZone ?? deps.deviceTimeZone();
        const todayDate = todayIn(timeZone, deps.now());
        const areas = (
          await db.getAllAsync<Row>('SELECT * FROM areas WHERE deleted_at IS NULL ORDER BY sort_order, created_at')
        ).map(mapArea);
        const series = (
          await db.getAllAsync<Row>('SELECT * FROM task_series WHERE deleted_at IS NULL ORDER BY created_at')
        ).map(mapSeries);
        const pending = (
          await db.getAllAsync<Row>(
            `SELECT o.* FROM task_occurrences o JOIN task_series s ON s.id = o.series_id
             WHERE o.status = 'pending' AND s.deleted_at IS NULL AND s.paused = 0
             ORDER BY o.due_date, s.created_at`,
          )
        ).map(mapOccurrence);
        const last = await db.getAllAsync<{ series_id: string; d: string }>(
          `SELECT series_id, MAX(local_date) AS d FROM activities
           WHERE deleted_at IS NULL AND series_id IS NOT NULL GROUP BY series_id`,
        );
        const activities = (
          await db.getAllAsync<Row>(
            'SELECT * FROM activities WHERE deleted_at IS NULL ORDER BY local_date DESC, logged_at DESC LIMIT 1000',
          )
        ).map(mapActivity);

        const seriesById = new Map(series.map((s) => [s.id, s]));
        const areaById = new Map(areas.map((a) => [a.id, a]));
        const lastBySeries = new Map(last.map((l) => [l.series_id, l.d]));
        const tasks: TaskItem[] = [];
        for (const occurrence of pending) {
          const s = seriesById.get(occurrence.seriesId);
          if (!s) continue;
          tasks.push({
            occurrence,
            series: s,
            area: s.areaId ? (areaById.get(s.areaId) ?? null) : null,
            lastDone: lastBySeries.get(s.id) ?? null,
          });
        }
        return { today: todayDate, timeZone, settings, areas, series, tasks, activities };
      });
    },

    // settings
    setTimeZone: (tz: string) => tx(() => writeSetting('time_zone', tz)),
    setDefaultReminderTime: (time: string) =>
      tx(async () => {
        if (!isLocalTime(time)) throw new RepoError('Choose a valid time.');
        await writeSetting('reminder_time', time);
      }),
    markNotificationsAsked: () => tx(() => writeSetting('notifications_asked', '1')),
    completeOnboarding: (tz: string) =>
      tx(async () => {
        await writeSetting('time_zone', tz);
        await writeSetting('onboarding_complete', '1');
      }),

    // areas
    createArea: (input: { name: string; sizeM2: number | null; grassType: string | null }) =>
      tx(async () => {
        const name = clean(input.name);
        if (!name) throw new RepoError('Give the lawn area a name.');
        if (input.sizeM2 != null && (!Number.isFinite(input.sizeM2) || input.sizeM2 <= 0)) {
          throw new RepoError('Enter a size above zero, or leave it blank.');
        }
        const id = deps.newId();
        const t = stamp();
        const order = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM areas');
        await db.runAsync(
          'INSERT INTO areas (id, name, size_m2, grass_type, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          id,
          name,
          input.sizeM2,
          clean(input.grassType),
          order?.n ?? 0,
          t,
          t,
        );
        return id;
      }),

    updateArea: (id: string, input: { name: string; sizeM2: number | null; grassType: string | null; notes?: string | null }) =>
      tx(async () => {
        const name = clean(input.name);
        if (!name) throw new RepoError('Give the lawn area a name.');
        if (input.sizeM2 != null && (!Number.isFinite(input.sizeM2) || input.sizeM2 <= 0)) {
          throw new RepoError('Enter a size above zero, or leave it blank.');
        }
        await db.runAsync(
          'UPDATE areas SET name = ?, size_m2 = ?, grass_type = ?, notes = ?, updated_at = ? WHERE id = ?',
          name,
          input.sizeM2,
          clean(input.grassType),
          clean(input.notes),
          stamp(),
          id,
        );
      }),

    deleteArea: (id: string) =>
      tx(async () => {
        const t = stamp();
        await db.runAsync('UPDATE areas SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, id);
        await db.runAsync(
          `DELETE FROM task_occurrences WHERE status = 'pending'
           AND series_id IN (SELECT id FROM task_series WHERE area_id = ?)`,
          id,
        );
        await db.runAsync('UPDATE task_series SET deleted_at = ?, updated_at = ? WHERE area_id = ? AND deleted_at IS NULL', t, t, id);
      }),

    // series
    createSeries: (input: SeriesInput) =>
      tx(async () => {
        validateSeriesInput(input);
        const id = deps.newId();
        const t = stamp();
        await db.runAsync(
          `INSERT INTO task_series (id, area_id, kind, title, mode, interval_days, start_date, reminder_time,
             product_name, rate_value, rate_unit, notes, paused, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          id,
          input.areaId,
          input.kind,
          clean(input.title)!,
          input.mode,
          input.mode === 'once' ? null : input.intervalDays,
          input.startDate,
          input.reminderTime,
          clean(input.productName),
          input.rateValue ?? null,
          input.rateValue != null ? (input.rateUnit ?? null) : null,
          clean(input.notes),
          t,
          t,
        );
        const occurrenceId = await insertOccurrence(id, input.startDate, null);
        return { seriesId: id, occurrenceId };
      }),

    updateSeries: (id: string, input: SeriesInput) =>
      tx(async () => {
        validateSeriesInput(input);
        const before = await getSeriesRow(id);
        if (!before) throw new RepoError('That task no longer exists.');
        await db.runAsync(
          `UPDATE task_series SET area_id = ?, kind = ?, title = ?, mode = ?, interval_days = ?, start_date = ?,
             reminder_time = ?, product_name = ?, rate_value = ?, rate_unit = ?, notes = ?, updated_at = ? WHERE id = ?`,
          input.areaId,
          input.kind,
          clean(input.title)!,
          input.mode,
          input.mode === 'once' ? null : input.intervalDays,
          input.startDate,
          input.reminderTime,
          clean(input.productName),
          input.rateValue ?? null,
          input.rateValue != null ? (input.rateUnit ?? null) : null,
          clean(input.notes),
          stamp(),
          id,
        );
        const after = (await getSeriesRow(id))!;
        const pending = await pendingFor(id);
        const scheduleChanged =
          before.mode !== after.mode || before.intervalDays !== after.intervalDays || before.startDate !== after.startDate;
        if (pending && scheduleChanged) {
          const due = dueFromHistory(ruleOf(after), await latestLinked(id), await today());
          await db.runAsync(
            'UPDATE task_occurrences SET due_date = ?, due_overridden = 0, snoozed_until = NULL, updated_at = ? WHERE id = ?',
            due,
            stamp(),
            pending.id,
          );
        } else if (!pending && !after.paused && scheduleChanged && after.mode !== 'once') {
          await insertOccurrence(id, dueFromHistory(ruleOf(after), await latestLinked(id), await today()), null);
        }
      }),

    pauseSeries: (id: string) =>
      tx(async () => {
        await db.runAsync('UPDATE task_series SET paused = 1, updated_at = ? WHERE id = ?', stamp(), id);
      }),

    resumeSeries: (id: string, due: LocalDate) =>
      tx(async () => {
        if (!isLocalDate(due)) throw new RepoError('Choose a valid date.');
        await db.runAsync('UPDATE task_series SET paused = 0, updated_at = ? WHERE id = ?', stamp(), id);
        const pending = await pendingFor(id);
        if (pending) {
          await db.runAsync(
            'UPDATE task_occurrences SET due_date = ?, due_overridden = 1, snoozed_until = NULL, updated_at = ? WHERE id = ?',
            due,
            stamp(),
            pending.id,
          );
        } else {
          await insertOccurrence(id, due, null, true);
        }
      }),

    deleteSeries: (id: string) =>
      tx(async () => {
        const t = stamp();
        await db.runAsync("DELETE FROM task_occurrences WHERE series_id = ? AND status = 'pending'", id);
        await db.runAsync('UPDATE task_series SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, id);
      }),

    // occurrences
    completeOccurrence: (occurrenceId: string, localDate: LocalDate, details: ActivityDetails = {}) =>
      tx(() => completeInternal(occurrenceId, localDate, details)),

    skipOccurrence: (occurrenceId: string, chosenNext?: LocalDate | null) =>
      tx(async (): Promise<SkipResult> => {
        const occ = await getOccurrenceRow(occurrenceId);
        if (!occ) throw new RepoError('That task no longer exists.');
        if (occ.status !== 'pending') return { successorDue: null, paused: false, alreadyResolved: true };
        const series = (await getSeriesRow(occ.seriesId))!;
        if (chosenNext != null && !isLocalDate(chosenNext)) throw new RepoError('Choose a valid date.');
        const outcome = successorAfterSkip(ruleOf(series), occ.dueDate, await today(), chosenNext);
        const t = stamp();
        await db.runAsync(
          "UPDATE task_occurrences SET status = 'skipped', resolved_at = ?, snoozed_until = NULL, updated_at = ? WHERE id = ?",
          t,
          t,
          occ.id,
        );
        if (outcome.kind === 'next') {
          await insertOccurrence(series.id, outcome.due, occ.id, series.mode === 'after_completion');
          return { successorDue: outcome.due, paused: false, alreadyResolved: false };
        }
        if (outcome.kind === 'pause') {
          await db.runAsync('UPDATE task_series SET paused = 1, updated_at = ? WHERE id = ?', t, series.id);
          return { successorDue: null, paused: true, alreadyResolved: false };
        }
        return { successorDue: null, paused: false, alreadyResolved: false };
      }),

    snoozeOccurrence: (occurrenceId: string, until: Date) =>
      tx(async () => {
        await db.runAsync(
          "UPDATE task_occurrences SET snoozed_until = ?, updated_at = ? WHERE id = ? AND status = 'pending'",
          until.toISOString(),
          stamp(),
          occurrenceId,
        );
      }),

    rescheduleOccurrence: (occurrenceId: string, due: LocalDate) =>
      tx(async () => {
        if (!isLocalDate(due)) throw new RepoError('Choose a valid date.');
        await db.runAsync(
          "UPDATE task_occurrences SET due_date = ?, due_overridden = 1, snoozed_until = NULL, updated_at = ? WHERE id = ? AND status = 'pending'",
          due,
          stamp(),
          occurrenceId,
        );
      }),

    /** Undo a completion or skip. Returns false if later changes make that unsafe. */
    reopenOccurrence: (occurrenceId: string) => tx(() => reopenInternal(occurrenceId)),

    // activities
    logActivity: (input: ActivityInput, linkOccurrenceId?: string | null) =>
      tx(async () => {
        if (!isActivityKind(input.kind)) throw new RepoError('Choose a type of job.');
        if (linkOccurrenceId) {
          const result = await completeInternal(linkOccurrenceId, input.localDate, input);
          return { activityId: result.activityId, linked: true, successorDue: result.successorDue, alreadyResolved: result.alreadyResolved };
        }
        await assertNotFuture(input.localDate);
        const activityId = await insertActivity({
          ...input,
          title: input.title ?? activityType(input.kind).label,
          seriesId: null,
          occurrenceId: null,
        });
        return { activityId, linked: false, successorDue: null, alreadyResolved: false };
      }),

    updateActivity: (id: string, input: ActivityInput) =>
      tx(async () => {
        const before = await getActivityRow(id);
        if (!before) throw new RepoError('That entry no longer exists.');
        await assertNotFuture(input.localDate);
        const rate = input.rateValue ?? null;
        await db.runAsync(
          `UPDATE activities SET area_id = ?, kind = ?, title = ?, local_date = ?, product_name = ?, quantity_value = ?,
             quantity_unit = ?, rate_value = ?, rate_unit = ?, rate_source = ?, mow_height_mm = ?, notes = ?, updated_at = ?
           WHERE id = ?`,
          // A linked activity keeps the series' kind and area so history stays consistent.
          before.seriesId ? before.areaId : input.areaId,
          before.seriesId ? before.kind : input.kind,
          clean(input.title) ?? before.title,
          input.localDate,
          clean(input.productName),
          input.quantityValue ?? null,
          clean(input.quantityUnit),
          rate,
          rate != null ? (input.rateUnit ?? null) : null,
          rate != null ? 'user' : null,
          input.mowHeightMm ?? null,
          clean(input.notes),
          stamp(),
          id,
        );
        if (before.seriesId && before.localDate !== input.localDate) await recomputePending(before.seriesId);
      }),

    /**
     * Delete a history entry. If it completed the latest occurrence and nothing has
     * happened since, the task reopens; otherwise the next date is rebuilt from what's left.
     */
    deleteActivity: (id: string) =>
      tx(async () => {
        const act = await getActivityRow(id);
        if (!act) return { reopened: false };
        if (act.occurrenceId) {
          const occ = await getOccurrenceRow(act.occurrenceId);
          if (occ && occ.status === 'done' && occ.activityId === act.id && (await reopenInternal(occ.id))) {
            return { reopened: true };
          }
        }
        const t = stamp();
        await db.runAsync('UPDATE activities SET deleted_at = ?, updated_at = ? WHERE id = ?', t, t, id);
        if (act.occurrenceId) {
          await db.runAsync(
            'UPDATE task_occurrences SET activity_id = NULL, updated_at = ? WHERE id = ? AND activity_id = ?',
            t,
            act.occurrenceId,
            id,
          );
        }
        if (act.seriesId) await recomputePending(act.seriesId);
        return { reopened: false };
      }),

    /** Restore an unlinked entry removed by "undo" on a quick log. */
    restoreActivity: (id: string) =>
      tx(async () => {
        await db.runAsync('UPDATE activities SET deleted_at = NULL, updated_at = ? WHERE id = ? AND series_id IS NULL', stamp(), id);
      }),

    // diagnostics for tests and the reminders screen
    countPending: () =>
      serial(async () => {
        const r = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM task_occurrences WHERE status = 'pending'");
        return r?.n ?? 0;
      }),
  };
}

