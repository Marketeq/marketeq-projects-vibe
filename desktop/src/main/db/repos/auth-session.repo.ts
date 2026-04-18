// src/main/db/repos/auth-session.repo.ts
// Local metadata only — actual tokens live in the OS keychain.
import type { DbHandle } from '../connection';
import { AuthSessionRow } from '../schema';
import { one, run } from './base';

export function createAuthSessionRepo(db: DbHandle) {
  return {
    findCurrent(): AuthSessionRow | null {
      return one(
        db,
        AuthSessionRow,
        `SELECT * FROM auth_session ORDER BY updated_at DESC LIMIT 1`,
      );
    },
    upsert(row: AuthSessionRow): void {
      run(
        db,
        `INSERT INTO auth_session (id, user_id, access_token_expires_at, refresh_token_ref, created_at, updated_at)
         VALUES (?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET
           user_id=excluded.user_id,
           access_token_expires_at=excluded.access_token_expires_at,
           refresh_token_ref=excluded.refresh_token_ref,
           updated_at=excluded.updated_at`,
        [
          row.id,
          row.user_id,
          row.access_token_expires_at,
          row.refresh_token_ref,
          row.created_at,
          row.updated_at,
        ],
      );
    },
    clear(): void {
      run(db, `DELETE FROM auth_session`);
    },
  };
}
export type AuthSessionRepo = ReturnType<typeof createAuthSessionRepo>;
