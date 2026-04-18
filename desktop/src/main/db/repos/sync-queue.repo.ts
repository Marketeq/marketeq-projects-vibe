// src/main/db/repos/sync-queue.repo.ts
import type { DbHandle } from '../connection';
import { SyncQueueRow } from '../schema';
import { many, run } from './base';

export function createSyncQueueRepo(db: DbHandle) {
  return {
    enqueue(row: SyncQueueRow): void {
      run(
        db,
        `INSERT INTO sync_queue
         (id, created_at, method, path, body_json, status, attempts, last_error, next_attempt_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          row.id,
          row.created_at,
          row.method,
          row.path,
          row.body_json,
          row.status,
          row.attempts,
          row.last_error,
          row.next_attempt_at,
        ],
      );
    },
    nextBatch(now: number, limit = 50): SyncQueueRow[] {
      return many(
        db,
        SyncQueueRow,
        `SELECT * FROM sync_queue
          WHERE status = 'pending'
            AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
          ORDER BY created_at ASC
          LIMIT ?`,
        [now, limit],
      );
    },
    markInflight(id: string): void {
      run(db, `UPDATE sync_queue SET status='inflight' WHERE id=?`, [id]);
    },
    markCompleted(id: string): void {
      run(db, `UPDATE sync_queue SET status='completed' WHERE id=?`, [id]);
    },
    markRetry(id: string, nextAttemptAt: number, lastError: string): void {
      run(
        db,
        `UPDATE sync_queue
            SET status='pending', attempts=attempts+1, next_attempt_at=?, last_error=?
          WHERE id=?`,
        [nextAttemptAt, lastError, id],
      );
    },
    markDeadLetter(id: string, lastError: string): void {
      run(
        db,
        `UPDATE sync_queue SET status='dead_letter', last_error=? WHERE id=?`,
        [lastError, id],
      );
    },
    counts(): { pending: number; deadLetter: number } {
      const pending = (
        db
          .prepare(
            `SELECT COUNT(*) AS n FROM sync_queue WHERE status='pending' OR status='inflight'`,
          )
          .get() as { n: number }
      ).n;
      const deadLetter = (
        db
          .prepare(
            `SELECT COUNT(*) AS n FROM sync_queue WHERE status='dead_letter'`,
          )
          .get() as { n: number }
      ).n;
      return { pending, deadLetter };
    },
  };
}
export type SyncQueueRepo = ReturnType<typeof createSyncQueueRepo>;
