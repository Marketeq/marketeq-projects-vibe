// src/main/db/repos/activity.repo.ts
import type { DbHandle } from '../connection';
import { ActivityMinuteRow } from '../schema';
import { many, run } from './base';

export function createActivityRepo(db: DbHandle) {
  return {
    listForSession(sessionId: string): ActivityMinuteRow[] {
      return many(
        db,
        ActivityMinuteRow,
        `SELECT * FROM activity_minute WHERE session_id = ? ORDER BY minute_start_at`,
        [sessionId],
      );
    },
    upsert(row: ActivityMinuteRow): void {
      run(
        db,
        `INSERT INTO activity_minute (id, session_id, minute_start_at, active, synced_at)
         VALUES (?,?,?,?,?)
         ON CONFLICT(session_id, minute_start_at) DO UPDATE SET
           active = excluded.active`,
        [
          row.id,
          row.session_id,
          row.minute_start_at,
          row.active,
          row.synced_at,
        ],
      );
    },
  };
}
export type ActivityRepo = ReturnType<typeof createActivityRepo>;
