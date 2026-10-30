// src/main/db/repos/screenshot.repo.ts
import type { DbHandle } from '../connection';
import { ScreenshotRow } from '../schema';
import { many, one, run } from './base';

export function createScreenshotRepo(db: DbHandle) {
  return {
    listPending(): ScreenshotRow[] {
      return many(
        db,
        ScreenshotRow,
        `SELECT * FROM screenshot WHERE status IN ('pending','uploaded') ORDER BY taken_at`,
      );
    },
    listForSession(sessionId: string): ScreenshotRow[] {
      return many(
        db,
        ScreenshotRow,
        `SELECT * FROM screenshot WHERE session_id = ? ORDER BY taken_at`,
        [sessionId],
      );
    },
    findById(id: string): ScreenshotRow | null {
      return one(db, ScreenshotRow, `SELECT * FROM screenshot WHERE id = ?`, [
        id,
      ]);
    },
    countTakenSince(sinceMs: number): number {
      const row = db
        .prepare<[number], { c: number }>(
          `SELECT COUNT(*) AS c FROM screenshot WHERE taken_at >= ?`,
        )
        .get(sinceMs);
      return row?.c ?? 0;
    },
    listOlderThan(olderThanMs: number): ScreenshotRow[] {
      return many(
        db,
        ScreenshotRow,
        `SELECT * FROM screenshot WHERE taken_at < ? ORDER BY taken_at`,
        [olderThanMs],
      );
    },
    insert(row: ScreenshotRow): void {
      run(
        db,
        `INSERT INTO screenshot
          (id, session_id, taken_at, local_path, r2_key, status, width, height,
           bytes, sensitive, synced_at, blur_path, display_id, sha256)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          row.id,
          row.session_id,
          row.taken_at,
          row.local_path,
          row.r2_key,
          row.status,
          row.width,
          row.height,
          row.bytes,
          row.sensitive,
          row.synced_at,
          row.blur_path ?? null,
          row.display_id ?? null,
          row.sha256 ?? null,
        ],
      );
    },
    setStatus(id: string, status: ScreenshotRow['status']): void {
      run(db, `UPDATE screenshot SET status = ? WHERE id = ?`, [status, id]);
    },
    clearLocalPath(id: string): void {
      run(db, `UPDATE screenshot SET local_path = NULL WHERE id = ?`, [id]);
    },
    /** Rows that still point at an image file (written by builds before PMCM-832). */
    listWithLocalFiles(): ScreenshotRow[] {
      return many(
        db,
        ScreenshotRow,
        `SELECT * FROM screenshot WHERE local_path IS NOT NULL OR blur_path IS NOT NULL`,
        [],
      );
    },
    clearLocalFiles(id: string): void {
      run(db, `UPDATE screenshot SET local_path = NULL, blur_path = NULL WHERE id = ?`, [id]);
    },
    deleteById(id: string): void {
      run(db, `DELETE FROM screenshot WHERE id = ?`, [id]);
    },
  };
}
export type ScreenshotRepo = ReturnType<typeof createScreenshotRepo>;
