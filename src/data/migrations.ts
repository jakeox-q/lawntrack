import type { Db } from './db';

/**
 * Append-only. Never edit a migration that has shipped in a build; add a new one.
 * Every row has a UUID, updated_at and (where users can delete) deleted_at so
 * records can later be synced to an account without reshaping local data.
 */
export const MIGRATIONS: readonly string[] = [
  /* 1 */ `
  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE areas (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    size_m2 REAL,
    grass_type TEXT,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE task_series (
    id TEXT PRIMARY KEY NOT NULL,
    area_id TEXT REFERENCES areas(id),
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('once', 'fixed', 'after_completion')),
    interval_days INTEGER,
    start_date TEXT NOT NULL,
    reminder_time TEXT NOT NULL,
    product_name TEXT,
    rate_value REAL,
    rate_unit TEXT,
    notes TEXT,
    paused INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE task_occurrences (
    id TEXT PRIMARY KEY NOT NULL,
    series_id TEXT NOT NULL REFERENCES task_series(id),
    due_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'done', 'skipped')),
    due_overridden INTEGER NOT NULL DEFAULT 0,
    snoozed_until TEXT,
    previous_occurrence_id TEXT,
    activity_id TEXT,
    resolved_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- A series never has more than one open occurrence: no backlog of missed work.
  CREATE UNIQUE INDEX occurrences_one_pending ON task_occurrences(series_id) WHERE status = 'pending';
  CREATE INDEX occurrences_due ON task_occurrences(status, due_date);

  CREATE TABLE activities (
    id TEXT PRIMARY KEY NOT NULL,
    area_id TEXT REFERENCES areas(id),
    kind TEXT NOT NULL,
    title TEXT,
    local_date TEXT NOT NULL,
    logged_at TEXT NOT NULL,
    series_id TEXT REFERENCES task_series(id),
    occurrence_id TEXT REFERENCES task_occurrences(id),
    product_name TEXT,
    quantity_value REAL,
    quantity_unit TEXT,
    rate_value REAL,
    rate_unit TEXT,
    rate_source TEXT,
    mow_height_mm REAL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  -- Completing the same occurrence twice cannot create two records.
  CREATE UNIQUE INDEX activities_one_per_occurrence ON activities(occurrence_id)
    WHERE occurrence_id IS NOT NULL AND deleted_at IS NULL;
  CREATE INDEX activities_date ON activities(local_date);
  CREATE INDEX activities_series ON activities(series_id, local_date);
  `,
];

export async function migrate(db: Db): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current > MIGRATIONS.length) {
    throw new Error(`Database version ${current} is newer than this app (${MIGRATIONS.length}). Update the app.`);
  }
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
