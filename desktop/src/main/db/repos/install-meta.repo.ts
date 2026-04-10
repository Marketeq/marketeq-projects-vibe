// src/main/db/repos/install-meta.repo.ts
import type { DbHandle } from '../connection';
import { InstallMetaRow } from '../schema';
import { one, run } from './base';

export function createInstallMetaRepo(db: DbHandle) {
  return {
    get(key: string): InstallMetaRow | null {
      return one(db, InstallMetaRow, `SELECT * FROM install_meta WHERE key = ?`, [
        key,
      ]);
    },
    set(key: string, value: string): void {
      run(
        db,
        `INSERT INTO install_meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, value],
      );
    },
  };
}
export type InstallMetaRepo = ReturnType<typeof createInstallMetaRepo>;
