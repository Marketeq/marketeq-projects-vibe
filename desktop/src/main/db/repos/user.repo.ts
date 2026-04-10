// src/main/db/repos/user.repo.ts
import type { DbHandle } from '../connection';
import { UserRow } from '../schema';
import { one, run } from './base';

export function createUserRepo(db: DbHandle) {
  return {
    findById(id: string): UserRow | null {
      return one(db, UserRow, 'SELECT * FROM user WHERE id = ?', [id]);
    },
    findFirst(): UserRow | null {
      return one(db, UserRow, 'SELECT * FROM user LIMIT 1');
    },
    upsert(row: UserRow): void {
      run(
        db,
        `INSERT INTO user (id, email, display_name, avatar_url, timezone, currency, pending_erasure, mirrored_at)
         VALUES (?,?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET
           email=excluded.email,
           display_name=excluded.display_name,
           avatar_url=excluded.avatar_url,
           timezone=excluded.timezone,
           currency=excluded.currency,
           pending_erasure=excluded.pending_erasure,
           mirrored_at=excluded.mirrored_at`,
        [
          row.id,
          row.email,
          row.display_name,
          row.avatar_url,
          row.timezone,
          row.currency,
          row.pending_erasure,
          row.mirrored_at,
        ],
      );
    },
    deleteAll(): void {
      run(db, 'DELETE FROM user');
    },
  };
}
export type UserRepo = ReturnType<typeof createUserRepo>;
