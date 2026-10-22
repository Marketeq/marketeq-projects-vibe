// Test double for the notification_idempotency repository. It honours what the service relies on:
// an INSERT that conflicts on the key (orIgnore), findOne, and an UPDATE whose criteria (including
// the IsNull / LessThanOrEqual operators) are evaluated and applied atomically, like one SQL
// statement - there is no await between checking the criteria and applying the patch.
import { InternalServerErrorException } from '@nestjs/common';

export interface IdempotencyRow {
  key: string;
  createdAt: Date;
  lockedUntil: Date | null;
  notificationId: string | null;
  ablyDone: boolean;
  emailDone: boolean;
  completedAt: Date | null;
}

const matchValue = (actual: unknown, expected: any): boolean => {
  if (expected && typeof expected === 'object' && ('_type' in expected || 'type' in expected)) {
    const type = expected.type ?? expected._type;
    const value = expected.value ?? expected._value;
    if (type === 'isNull') return actual == null;
    if (type === 'lessThanOrEqual') return actual != null && (actual as Date).getTime() <= (value as Date).getTime();
    throw new InternalServerErrorException(`unsupported operator ${type}`);
  }
  return actual === expected;
};

export function memoryIdempotencyRepo() {
  const rows = new Map<string, IdempotencyRow>();
  const failures: Array<(patch: any) => boolean> = [];
  const repo: any = {
    rows,
    /** Make the next UPDATE whose patch satisfies `when` reject once (simulates a database failure). */
    failNextUpdate: (when: (patch: any) => boolean) => failures.push(when),
    createQueryBuilder: () => {
      let values: any = {};
      const qb: any = {
        insert: () => qb,
        values: (v: any) => ((values = v), qb),
        orIgnore: () => qb,
        returning: () => qb,
        execute: async () => {
          if (rows.has(values.key)) return { raw: [] };
          rows.set(values.key, {
            key: values.key, createdAt: new Date(), lockedUntil: values.lockedUntil ?? null, notificationId: null,
            ablyDone: false, emailDone: false, completedAt: null,
          });
          return { raw: [{ key: values.key }] };
        },
      };
      return qb;
    },
    findOne: async ({ where }: any) => {
      const row = rows.get(where.key);
      return row ? { ...row } : null;
    },
    update: async (criteria: any, patch: any) => {
      const i = failures.findIndex((f) => f(patch));
      if (i >= 0) { failures.splice(i, 1); throw new InternalServerErrorException('database unavailable'); }
      let affected = 0;
      for (const row of rows.values()) {
        if (Object.entries(criteria).every(([k, v]) => matchValue((row as any)[k], v))) {
          Object.assign(row, patch);
          affected++;
        }
      }
      return { affected };
    },
  };
  return repo;
}
