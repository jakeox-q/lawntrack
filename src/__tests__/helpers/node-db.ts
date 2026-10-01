import type { BindValue, Db } from '@/data/db';

type Statement = { run(...p: BindValue[]): { changes: number | bigint; lastInsertRowid: number | bigint }; get(...p: BindValue[]): unknown; all(...p: BindValue[]): unknown[] };
type DatabaseSync = { exec(sql: string): void; prepare(sql: string): Statement };

/** An in-memory database with the same async surface as expo-sqlite. */
export function createTestDb(): Db {
  const sqlite = (process as unknown as { getBuiltinModule(name: string): { DatabaseSync: new (path: string) => DatabaseSync } }).getBuiltinModule('node:sqlite');
  const db = new sqlite.DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  let depth = 0;
  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, ...params) {
      const r = db.prepare(sql).run(...params);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async getFirstAsync<T>(sql: string, ...params: BindValue[]) {
      const row = db.prepare(sql).get(...params);
      return (row ?? null) as T | null;
    },
    async getAllAsync<T>(sql: string, ...params: BindValue[]) {
      return db.prepare(sql).all(...params) as T[];
    },
    async withTransactionAsync(task) {
      if (depth > 0) throw new Error('Nested transaction');
      depth++;
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      } finally {
        depth--;
      }
    },
  };
}
