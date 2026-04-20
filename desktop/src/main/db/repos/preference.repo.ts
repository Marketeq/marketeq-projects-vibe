// src/main/db/repos/preference.repo.ts
import type { DbHandle } from '../connection';
import { PreferenceRow } from '../schema';
import { one, run } from './base';

export function createPreferenceRepo(db: DbHandle) {
  return {
    get(key: string): PreferenceRow | null {
      return one(db, PreferenceRow, `SELECT * FROM preference WHERE key = ?`, [
        key,
      ]);
    },
    set(key: string, valueJson: string): void {
      run(
        db,
        `INSERT INTO preference (key, value_json, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
        [key, valueJson, Date.now()],
      );
    },
    delete(key: string): void {
      run(db, `DELETE FROM preference WHERE key = ?`, [key]);
    },
  };
}
export type PreferenceRepo = ReturnType<typeof createPreferenceRepo>;
