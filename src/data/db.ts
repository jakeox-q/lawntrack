/**
 * The subset of expo-sqlite's SQLiteDatabase the app uses. Keeping it narrow lets
 * the repository run against Node's built-in SQLite in tests.
 */
export type BindValue = string | number | null;

export interface Db {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: BindValue[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getFirstAsync<T>(source: string, ...params: BindValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: BindValue[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
