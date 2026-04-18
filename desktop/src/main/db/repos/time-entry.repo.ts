// src/main/db/repos/time-entry.repo.ts
import type { DbHandle } from '../connection';
import { TimeEntryRow } from '../schema';
import { many, run } from './base';

export function createTimeEntryRepo(db: DbHandle) {
  return {
    listForSession(sessionId: string): TimeEntryRow[] {
      return many(
        db,
        TimeEntryRow,
        `SELECT * FROM time_entry WHERE session_id = ? ORDER BY started_at`,
        [sessionId],
      );
    },
    insert(row: TimeEntryRow): void {
      run(
        db,
        `INSERT INTO time_entry (id, session_id, started_at, ended_at, duration_seconds, synced_at)
         VALUES (?,?,?,?,?,?)`,
        [
          row.id,
          row.session_id,
          row.started_at,
          row.ended_at,
          row.duration_seconds,
          row.synced_at,
        ],
      );
    },
    close(id: string, endedAt: number, durationSeconds: number): void {
      run(
        db,
        `UPDATE time_entry SET ended_at = ?, duration_seconds = ? WHERE id = ?`,
        [endedAt, durationSeconds, id],
      );
    },
  };
}
export type TimeEntryRepo = ReturnType<typeof createTimeEntryRepo>;
