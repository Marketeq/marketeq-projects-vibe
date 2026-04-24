// src/main/db/repos/device.repo.ts
import type { DbHandle } from '../connection';
import { DeviceSelfRow } from '../schema';
import { one, run } from './base';

export function createDeviceRepo(db: DbHandle) {
  return {
    findSelf(): DeviceSelfRow | null {
      return one(db, DeviceSelfRow, 'SELECT * FROM device_self LIMIT 1');
    },
    insert(row: DeviceSelfRow): void {
      run(
        db,
        `INSERT INTO device_self (id, installation_uuid, os_name, os_version, app_version, arch, created_at)
         VALUES (?,?,?,?,?,?,?)`,
        [
          row.id,
          row.installation_uuid,
          row.os_name,
          row.os_version,
          row.app_version,
          row.arch,
          row.created_at,
        ],
      );
    },
  };
}
export type DeviceRepo = ReturnType<typeof createDeviceRepo>;
