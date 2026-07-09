// src/main/db/connection.ts
// better-sqlite3 connection factory.
// - WAL journal mode (doc 11 §5)
// - foreign_keys = ON
// - synchronous = NORMAL
// - busy_timeout = 5000
// - temp_store = MEMORY

import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { SQLITE_FILENAME } from '../../shared/constants';

export type DbHandle = Database.Database;

let _db: DbHandle | null = null;

export function initDatabase(): DbHandle {
  if (_db) return _db;
  const userData = app.getPath('userData');
  const dir = path.join(userData, 'dtt');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, SQLITE_FILENAME);

  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('temp_store = MEMORY');

  _db = db;
  return db;
}

export function getDb(): DbHandle {
  if (!_db) throw new Error('Database not initialized. Call initDatabase() first.');
  return _db;
}

export function closeDatabase(): void {
  if (_db) {
    try {
      _db.pragma('wal_checkpoint(TRUNCATE)');
    } catch {
      /* ignore */
    }
    _db.close();
    _db = null;
  }
}

export function checkpoint(
  db: DbHandle,
  mode: 'PASSIVE' | 'TRUNCATE' = 'TRUNCATE',
): void {
  db.pragma(`wal_checkpoint(${mode})`);
}
