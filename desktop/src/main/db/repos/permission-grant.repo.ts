// src/main/db/repos/permission-grant.repo.ts
// Stores the last-known status of each OS permission the Marketeq Time
// Tracker requires. Backs the audit trail referenced by doc 18 §2.1.

import type { DbHandle } from '../connection';
import { PermissionGrantRow } from '../schema';
import { many, one, run } from './base';

export function createPermissionGrantRepo(db: DbHandle) {
  return {
    get(key: PermissionGrantRow['key']): PermissionGrantRow | null {
      return one(
        db,
        PermissionGrantRow,
        `SELECT * FROM permission_grant WHERE key = ?`,
        [key],
      );
    },
    listAll(): PermissionGrantRow[] {
      return many(
        db,
        PermissionGrantRow,
        `SELECT * FROM permission_grant ORDER BY key`,
      );
    },
    upsert(row: PermissionGrantRow): void {
      run(
        db,
        `INSERT INTO permission_grant
          (key, status, platform, last_checked_at, last_requested_at, last_changed_at)
         VALUES (?,?,?,?,?,?)
         ON CONFLICT(key) DO UPDATE SET
           status = excluded.status,
           platform = excluded.platform,
           last_checked_at = excluded.last_checked_at,
           last_requested_at = COALESCE(excluded.last_requested_at, permission_grant.last_requested_at),
           last_changed_at = CASE
             WHEN permission_grant.status = excluded.status THEN permission_grant.last_changed_at
             ELSE excluded.last_changed_at
           END`,
        [
          row.key,
          row.status,
          row.platform,
          row.last_checked_at,
          row.last_requested_at,
          row.last_changed_at,
        ],
      );
    },
  };
}
export type PermissionGrantRepo = ReturnType<typeof createPermissionGrantRepo>;
