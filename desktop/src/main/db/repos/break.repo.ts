// src/main/db/repos/break.repo.ts
import { z } from 'zod';
import type { DbHandle } from '../connection';
import { BreakEventRow } from '../schema';
import { many, one, run } from './base';

const PaidBreakTotalRow = z.object({ total: z.number().nonnegative() });

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
    /**
     * PMCM-829/830: paid break seconds the user took on a contract for breaks
     * started in [startAt, endAt) — the daily allowance is per day, not per
     * session. An open break counts up to `now`.
     */
    sumPaidSecondsForContract(input: {
      userId: string;
      contractId: string;
      startAt: number;
      endAt: number;
      now: number;
    }): number {
      const row = one(
        db,
        PaidBreakTotalRow,
        `SELECT COALESCE(SUM(MAX(0, (COALESCE(b.ended_at, ?) - b.started_at) / 1000)), 0) AS total
           FROM break_event b
           JOIN session s ON s.id = b.session_id
          WHERE b.kind = 'paid' AND s.user_id = ? AND s.contract_id = ?
            AND b.started_at >= ? AND b.started_at < ?`,
        [input.now, input.userId, input.contractId, input.startAt, input.endAt],
      );
      return Math.floor(row?.total ?? 0);
    },
  };
}
export type BreakRepo = ReturnType<typeof createBreakRepo>;
