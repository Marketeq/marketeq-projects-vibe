// src/main/db/repos/idle.repo.ts
import type { DbHandle } from '../connection';
import { IdleEventRow } from '../schema';
import { many, run } from './base';

export function createIdleRepo(db: DbHandle) {
  return {
    listForSession(sessionId: string): IdleEventRow[] {
      return many(
        db,
        IdleEventRow,
        `SELECT * FROM idle_event WHERE session_id = ? ORDER BY started_at`,
        [sessionId],
      );
    },
    insert(row: IdleEventRow): void {
      run(
        db,
        `INSERT INTO idle_event (id, session_id, started_at, ended_at, seconds, resolution, synced_at)
         VALUES (?,?,?,?,?,?,?)`,
        [
          row.id,
          row.session_id,
          row.started_at,
          row.ended_at,
          row.seconds,
          row.resolution,
          row.synced_at,
        ],
      );
    },
    setResolution(
      id: string,
      resolution: 'keep' | 'discard' | 'convert_to_break',
    ): void {
      run(db, `UPDATE idle_event SET resolution = ? WHERE id = ?`, [
        resolution,
        id,
      ]);
    },
  };
}
export type IdleRepo = ReturnType<typeof createIdleRepo>;
