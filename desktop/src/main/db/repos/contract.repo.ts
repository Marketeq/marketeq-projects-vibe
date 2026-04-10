// src/main/db/repos/contract.repo.ts
import type { DbHandle } from '../connection';
import { ContractRow } from '../schema';
import { one, many, run } from './base';

export function createContractRepo(db: DbHandle) {
  return {
    findById(id: string): ContractRow | null {
      return one(db, ContractRow, 'SELECT * FROM contract WHERE id = ?', [id]);
    },
    listActive(): ContractRow[] {
      return many(
        db,
        ContractRow,
        `SELECT * FROM contract WHERE status = 'active' ORDER BY name`,
      );
    },
    upsert(row: ContractRow): void {
      run(
        db,
        `INSERT INTO contract (id, name, client_name, status, currency, rate_minor, daily_cap_seconds, weekly_cap_seconds, paid_break_allowance_seconds, screenshot_interval_seconds, mirrored_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name,
           client_name=excluded.client_name,
           status=excluded.status,
           currency=excluded.currency,
           rate_minor=excluded.rate_minor,
           daily_cap_seconds=excluded.daily_cap_seconds,
           weekly_cap_seconds=excluded.weekly_cap_seconds,
           paid_break_allowance_seconds=excluded.paid_break_allowance_seconds,
           screenshot_interval_seconds=excluded.screenshot_interval_seconds,
           mirrored_at=excluded.mirrored_at`,
        [
          row.id,
          row.name,
          row.client_name,
          row.status,
          row.currency,
          row.rate_minor,
          row.daily_cap_seconds,
          row.weekly_cap_seconds,
          row.paid_break_allowance_seconds,
          row.screenshot_interval_seconds,
          row.mirrored_at,
        ],
      );
    },
  };
}
export type ContractRepo = ReturnType<typeof createContractRepo>;
