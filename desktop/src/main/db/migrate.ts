// src/main/db/migrate.ts
// Migration runner. Reads .sql files from ./migrations/ in sorted order and
// applies each one exactly once. Applied versions are recorded in the
// `schema_migrations` table.
//
// Naming convention: NNN_description.sql where NNN is zero-padded ascending.

import fs from 'node:fs';
import path from 'node:path';
import type { DbHandle } from './connection';
import { logger } from '../logger';

interface MigrationFile {
  id: number;
  name: string;
  filename: string;
  sql: string;
}

function loadMigrations(): MigrationFile[] {
  // Packaged app: electron-builder copies src/main/db/migrations -> extraResources/migrations.
  // Dev mode: we read straight from src/main/db/migrations.
  // tsc compiles to dist/main/main/db, so __dirname at runtime is either:
  //   - dist/main/main/db (dev after build)
  //   - inside app.asar (packaged)
  const resourcesPath =
    typeof process.resourcesPath === 'string' ? process.resourcesPath : '';
  const candidates = [
    resourcesPath ? path.join(resourcesPath, 'migrations') : '',
    path.join(__dirname, 'migrations'),
    path.join(__dirname, '..', '..', '..', 'src', 'main', 'db', 'migrations'),
    path.join(process.cwd(), 'src', 'main', 'db', 'migrations'),
  ].filter(Boolean);

  let migrationsDir: string | null = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      migrationsDir = c;
      break;
    }
  }
  if (!migrationsDir) {
    throw new Error(
      `migrations directory not found. Looked in: ${candidates.join(', ')}`,
    );
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  return files.map((filename) => {
    const match = filename.match(/^(\d+)_(.+)\.sql$/);
    if (!match) {
      throw new Error(`invalid migration filename: ${filename}`);
    }
    const idStr = match[1] ?? '0';
    const name = match[2] ?? filename;
    const id = parseInt(idStr, 10);
    const sql = fs.readFileSync(path.join(migrationsDir!, filename), 'utf8');
    return { id, name, filename, sql };
  });
}

export function runMigrations(db: DbHandle): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      filename TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const applied = new Set<number>(
    (
      db
        .prepare<[], { id: number }>('SELECT id FROM schema_migrations')
        .all() as { id: number }[]
    ).map((r) => r.id),
  );

  const migrations = loadMigrations();

  const tx = db.transaction((list: MigrationFile[]) => {
    for (const m of list) {
      if (applied.has(m.id)) continue;
      logger.info({ id: m.id, name: m.name }, 'applying migration');
      db.exec(m.sql);
      db.prepare(
        `INSERT INTO schema_migrations (id, name, filename, applied_at) VALUES (?, ?, ?, ?)`,
      ).run(m.id, m.name, m.filename, Date.now());
    }
  });

  try {
    tx(migrations);
  } catch (err) {
    throw new Error(
      `migration_failed: ${(err as Error).message ?? String(err)}`,
    );
  }
}
