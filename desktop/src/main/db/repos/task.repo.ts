// src/main/db/repos/task.repo.ts
import type { DbHandle } from '../connection';
import { TaskRow } from '../schema';
import { one, many, run } from './base';

export function createTaskRepo(db: DbHandle) {
  return {
    findById(id: string): TaskRow | null {
      return one(db, TaskRow, 'SELECT * FROM task WHERE id = ?', [id]);
    },
    listForContract(contractId: string): TaskRow[] {
      return many(
        db,
        TaskRow,
        'SELECT * FROM task WHERE contract_id = ? AND archived = 0 ORDER BY name',
        [contractId],
      );
    },
    upsert(row: TaskRow): void {
      run(
        db,
        `INSERT INTO task (id, contract_id, name, archived, mirrored_at)
         VALUES (?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET
           contract_id=excluded.contract_id,
           name=excluded.name,
           archived=excluded.archived,
           mirrored_at=excluded.mirrored_at`,
        [row.id, row.contract_id, row.name, row.archived, row.mirrored_at],
      );
    },
  };
}
export type TaskRepo = ReturnType<typeof createTaskRepo>;
