// src/main/db/repos/service-health.repo.ts
import type { DbHandle } from '../connection';
import { ServiceHealthRow } from '../schema';
import { many, one, run } from './base';

export function createServiceHealthRepo(db: DbHandle) {
  return {
    get(service: string): ServiceHealthRow | null {
      return one(
        db,
        ServiceHealthRow,
        `SELECT * FROM service_health WHERE service = ?`,
        [service],
      );
    },
    list(): ServiceHealthRow[] {
      return many(db, ServiceHealthRow, `SELECT * FROM service_health`);
    },
    upsert(row: ServiceHealthRow): void {
      run(
        db,
        `INSERT INTO service_health (service, status, checked_at, latency_ms)
         VALUES (?,?,?,?)
         ON CONFLICT(service) DO UPDATE SET
           status=excluded.status,
           checked_at=excluded.checked_at,
           latency_ms=excluded.latency_ms`,
        [row.service, row.status, row.checked_at, row.latency_ms],
      );
    },
  };
}
export type ServiceHealthRepo = ReturnType<typeof createServiceHealthRepo>;
