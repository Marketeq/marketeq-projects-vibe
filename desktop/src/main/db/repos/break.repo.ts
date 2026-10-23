// src/main/db/repos/break.repo.ts
import type { DbHandle } from '../connection';
import { BreakEventRow } from '../schema';
import { many, run } from './base';

export function createBreakRepo(db: DbHandle) {
  return {
    listForSession(sessionId: string): BreakEventRow[] {
      return many(
        db,
        BreakEventRow,
        `SELECT * FROM break_event WHERE session_id = ? ORDER BY started_at`,
        [sessionId],
      );
    },
    insert(row: BreakEventRow): void {
      run(
        db,
        `INSERT INTO break_event (id, session_id, kind, started_at, ended_at, synced_at)
         VALUES (?,?,?,?,?,?)`,
        [
          row.id,
          row.session_id,
          row.kind,
          row.started_at,
          row.ended_at,
          row.synced_at,
        ],
      );
    },
    close(id: string, endedAt: number): void {
      run(db, `UPDATE break_event SET ended_at = ? WHERE id = ?`, [
        endedAt,
        id,
      ]);
    },
    /** Crash recovery: end any break the crash left open, at the crash point (doc 05 CRASH.03). */
    closeOpenForSession(sessionId: string, endedAt: number): void {
      run(
        db,
        `UPDATE break_event SET ended_at = MAX(started_at, ?) WHERE session_id = ? AND ended_at IS NULL`,
        [endedAt, sessionId],
      );
    },
  };
}
export type BreakRepo = ReturnType<typeof createBreakRepo>;
