// src/main/db/repos/dispute.repo.ts
import type { DbHandle } from '../connection';
import { DisputeRow } from '../schema';
import { many, run } from './base';

export function createDisputeRepo(db: DbHandle) {
  return {
    listForSession(sessionId: string): DisputeRow[] {
      return many(
        db,
        DisputeRow,
        `SELECT * FROM dispute WHERE session_id = ? ORDER BY created_at`,
        [sessionId],
      );
    },
    insert(row: DisputeRow): void {
      run(
        db,
        `INSERT INTO dispute (id, session_id, reason, note, created_at, synced_at)
         VALUES (?,?,?,?,?,?)`,
        [
          row.id,
          row.session_id,
          row.reason,
          row.note,
          row.created_at,
          row.synced_at,
        ],
      );
    },
  };
}
export type DisputeRepo = ReturnType<typeof createDisputeRepo>;
