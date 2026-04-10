// src/main/db/repos/auth-attempts.repo.ts
//
// Repository for the auth_attempts table — client-side soft lockout ledger.
//
// Tracks per-email failed sign-in attempts to enforce a local rate limit in
// front of the server's /auth/login throttle (doc 13 §15 — 5 req / 300 s).
// This lets the UI show a friendly "wait N seconds" banner before hitting
// the backend, and preserves lockout state across app restarts.

import { z } from 'zod';
import type { DbHandle } from '../connection';
import { one, run } from './base';

export const AuthAttemptRow = z.object({
  email: z.string().email(),
  failure_count: z.number().int().nonnegative(),
  first_failure_at: z.number().int().nonnegative().nullable(),
  last_failure_at: z.number().int().nonnegative().nullable(),
  locked_until: z.number().int().nonnegative().nullable(),
});
export type AuthAttemptRow = z.infer<typeof AuthAttemptRow>;

export function createAuthAttemptsRepo(db: DbHandle) {
  return {
    find(email: string): AuthAttemptRow | null {
      return one(
        db,
        AuthAttemptRow,
        `SELECT email, failure_count, first_failure_at, last_failure_at, locked_until
         FROM auth_attempts WHERE email = ?`,
        [email.toLowerCase()],
      );
    },

    upsert(row: AuthAttemptRow): void {
      run(
        db,
        `INSERT INTO auth_attempts
           (email, failure_count, first_failure_at, last_failure_at, locked_until)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET
           failure_count = excluded.failure_count,
           first_failure_at = excluded.first_failure_at,
           last_failure_at = excluded.last_failure_at,
           locked_until = excluded.locked_until`,
        [
          row.email.toLowerCase(),
          row.failure_count,
          row.first_failure_at,
          row.last_failure_at,
          row.locked_until,
        ],
      );
    },

    clear(email: string): void {
      run(db, `DELETE FROM auth_attempts WHERE email = ?`, [
        email.toLowerCase(),
      ]);
    },

    clearAll(): void {
      run(db, `DELETE FROM auth_attempts`);
    },
  };
}
export type AuthAttemptsRepo = ReturnType<typeof createAuthAttemptsRepo>;
