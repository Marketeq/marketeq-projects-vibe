// src/main/db/repos/base.ts
// Tiny query helpers shared by every repository.

import type { ZodSchema } from 'zod';
import type { DbHandle } from '../connection';

export function one<T>(
  db: DbHandle,
  schema: ZodSchema<T>,
  sql: string,
  params: unknown[] = [],
): T | null {
  const row = db.prepare(sql).get(...(params as unknown[])) as unknown;
  return row ? schema.parse(row) : null;
}

export function many<T>(
  db: DbHandle,
  schema: ZodSchema<T>,
  sql: string,
  params: unknown[] = [],
): T[] {
  const rows = db.prepare(sql).all(...(params as unknown[])) as unknown[];
  return rows.map((r) => schema.parse(r));
}

export function run(
  db: DbHandle,
  sql: string,
  params: unknown[] = [],
): { changes: number; lastInsertRowid: number | bigint } {
  return db.prepare(sql).run(...(params as unknown[]));
}

export function tx<T>(db: DbHandle, fn: () => T): T {
  const wrapped = db.transaction(fn);
  return wrapped();
}
