#!/usr/bin/env node
/**
 * run-migrations.js — Schema drift reporter / migration runner for the shared backend.
 *
 * Background: nothing in the deploy path has ever run TypeORM migrations. The
 * Dockerfile builds every service and boot-all.js starts them; no step applies
 * pending schema changes. That let user-service ship an entity field
 * (certifications."issuerLogoUrl") whose column was never created, which turned
 * every GET /users/:id into a 42703 Postgres error and broke the inbox for all
 * three frontends at once.
 *
 * Why this defaults to reporting rather than applying: there are ~130 migrations
 * on disk across the services (44 in user-service alone) with an unknown number
 * already applied by hand. Running them all against the live database in one
 * pass is a far larger action than fixing any single bug, so applying is opt-in
 * per service and reporting is the default.
 *
 * Usage:
 *   node run-migrations.js                      # report drift for every service
 *   MIGRATE_MODE=apply MIGRATE_SERVICES=user-service node run-migrations.js
 *
 * Environment:
 *   MIGRATE_MODE      'report' (default) | 'apply'
 *   MIGRATE_SERVICES  comma-separated service names, or 'all' (default)
 *
 * Report mode never writes and always exits 0, so it is safe to run on boot.
 * Apply mode exits non-zero if any selected service fails to migrate.
 */

const fs = require('fs');
const path = require('path');

const MODE = (process.env.MIGRATE_MODE || 'report').toLowerCase();
const SELECTED = (process.env.MIGRATE_SERVICES || 'all')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * nest build lays services out inconsistently across this monorepo, so probe the
 * same candidate paths boot-all.js uses rather than assuming one shape.
 */
function findCompiledDataSource(serviceDir) {
  const candidates = [
    path.join(__dirname, 'dist', serviceDir, 'data-source.js'),
    path.join(__dirname, 'dist', serviceDir, 'src', 'data-source.js'),
    path.join(__dirname, 'dist', serviceDir, serviceDir, 'src', 'data-source.js'),
    path.join(__dirname, 'dist', serviceDir, 'config', 'data-source.js'),
    path.join(__dirname, 'dist', serviceDir, 'src', 'config', 'data-source.js'),
    // identity-verification-service keeps its data-source and migrations under
    // src/database/. Without this entry it was dropped by discoverServices()
    // with no output at all, so its three migrations never ran and
    // "identity_verification.identity_verification_profiles" was never created —
    // the daily 09:00 Scheduler job had been failing on it unnoticed.
    path.join(__dirname, 'dist', serviceDir, 'src', 'database', 'data-source.js'),
    path.join(__dirname, 'dist', serviceDir, 'database', 'data-source.js'),
    // offer-service names its CLI data-source typeorm.config.ts rather than
    // data-source.ts. Its compiled migrations glob is __dirname-relative and so
    // still resolves correctly under dist/, which is what makes it safe to read
    // here — verified to yield schema "offer_service" and the two compiled
    // migrations in dist/apps/offer-service/migrations/.
    path.join(__dirname, 'dist', serviceDir, 'src', 'config', 'typeorm.config.js'),
    path.join(__dirname, 'dist', serviceDir, 'config', 'typeorm.config.js'),
    // Deliberately NOT probed: dist/<service>/typeorm.config.js at the service
    // root. time-tracking-service keeps its data-source there, but the file sits
    // outside its tsconfig's "include": ["src/**/*"], so the build never emits
    // it — any copy present locally is a stale artifact from an older layout,
    // and a freshly built image has none. Probing it would therefore find
    // nothing in production and, locally, would load a months-old config whose
    // migrations glob resolves to nothing: "up to date (0 applied)" for a
    // service with 12 unapplied migrations. A false clean is worse than the
    // honest "no data-source" warning it gets today. Bringing it under the
    // reporter means moving the config into src/ (so it is actually compiled)
    // first — not adding a path here.
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

/**
 * A service that ships compiled migrations but exposes no data-source is a
 * silent hole: nothing can ever apply those migrations and, before this check,
 * nothing said so. Used to turn that into a visible warning rather than an
 * absence. Mirrors the migration layouts actually present in this monorepo.
 */
function findCompiledMigrationsDir(serviceDir) {
  const candidates = [
    path.join(__dirname, 'dist', serviceDir, 'migrations'),
    path.join(__dirname, 'dist', serviceDir, 'src', 'migrations'),
    path.join(__dirname, 'dist', serviceDir, 'src', 'database', 'migrations'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

/**
 * Discover services from the compiled output, not from apps/. The production
 * image ships only dist/ and node_modules, so enumerating the TypeScript
 * sources would find nothing at runtime.
 */
function discoverServices() {
  const distApps = path.join(__dirname, 'dist', 'apps');
  if (!fs.existsSync(distApps)) return { services: [], orphanMigrations: [] };

  const all = fs
    .readdirSync(distApps, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `apps/${entry.name}`);

  return {
    services: all.filter((dir) => findCompiledDataSource(dir)),
    // Services with migrations on disk but no data-source to run them. Most
    // services legitimately have neither and are simply absent from both lists;
    // it is the combination that signals a gap worth reporting.
    orphanMigrations: all.filter(
      (dir) => !findCompiledDataSource(dir) && findCompiledMigrationsDir(dir),
    ),
  };
}

/**
 * TypeORM exposes only a boolean for "are there pending migrations", so diff the
 * registered migration classes against the service's own migrations table to
 * name them. Each service owns its schema, so the table is schema-qualified.
 */
async function pendingFor(dataSource) {
  const schema = dataSource.options.schema || 'public';
  // dataSource.migrations holds instances, not classes, so `.name` is defined
  // only for migrations that declare it as a field — the rest reported blank.
  // This mirrors how TypeORM's own MigrationExecutor resolves the name.
  const registered = dataSource.migrations.map(
    (m) => m.name || m.constructor.name,
  );

  let applied = [];
  try {
    const rows = await dataSource.query(
      `SELECT name FROM "${schema}"."migrations"`,
    );
    applied = rows.map((r) => r.name);
  } catch (err) {
    // No migrations table yet means nothing has ever been applied here.
    if (!/does not exist/i.test(err.message)) throw err;
  }

  const appliedSet = new Set(applied);
  return {
    schema,
    appliedCount: applied.length,
    pending: registered.filter((name) => !appliedSet.has(name)),
  };
}

async function processService(serviceDir) {
  const name = serviceDir.replace(/^apps\//, '');
  const dsPath = findCompiledDataSource(serviceDir);
  if (!dsPath) return { name, skipped: 'no compiled data-source' };

  let dataSource;
  try {
    const mod = require(dsPath);
    dataSource =
      mod.AppDataSource || mod.default || mod.dataSource || mod.DataSource;
    if (!dataSource || typeof dataSource.initialize !== 'function') {
      return { name, skipped: 'no DataSource export' };
    }
  } catch (err) {
    return { name, error: `load failed: ${err.message}` };
  }

  try {
    if (!dataSource.isInitialized) await dataSource.initialize();
    const { schema, appliedCount, pending } = await pendingFor(dataSource);

    if (MODE === 'apply' && pending.length > 0) {
      const ran = await dataSource.runMigrations({ transaction: 'all' });
      return {
        name,
        schema,
        appliedCount,
        applied: ran.map((m) => m.name),
        pending: [],
      };
    }
    return { name, schema, appliedCount, pending };
  } catch (err) {
    return { name, error: err.message };
  } finally {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy().catch(() => {});
    }
  }
}

async function main() {
  const { services: all, orphanMigrations } = discoverServices();
  const targets =
    SELECTED.length === 1 && SELECTED[0] === 'all'
      ? all
      : all.filter((dir) => SELECTED.includes(dir.replace(/^apps\//, '')));

  if (targets.length === 0) {
    console.log('[migrations] no services matched; nothing to do');
    return 0;
  }

  console.log(`[migrations] mode=${MODE} services=${targets.length}`);

  let totalPending = 0;
  let failed = 0;

  // Collected before printing so the applied-count can be qualified: services
  // that share a schema also share its migrations table, which makes a bare
  // "N applied" read as if those rows were that service's own.
  const results = [];

  // Sequential on purpose: 29 concurrent pools would blow the container's
  // connection and memory budget.
  for (const dir of targets) {
    results.push(await processService(dir));
  }

  const perSchema = new Map();
  for (const r of results) {
    if (!r.schema) continue;
    perSchema.set(r.schema, (perSchema.get(r.schema) || 0) + 1);
  }
  const sharesSchema = (r) => r.schema && perSchema.get(r.schema) > 1;
  const appliedNote = (r) =>
    sharesSchema(r)
      ? `${r.appliedCount} applied in shared schema "${r.schema}"`
      : `${r.appliedCount} applied`;

  for (const r of results) {
    if (r.skipped) {
      console.log(`[migrations] ${r.name}: skipped (${r.skipped})`);
    } else if (r.error) {
      failed += 1;
      console.error(`[migrations] ${r.name}: ERROR ${r.error}`);
    } else if (r.applied) {
      console.log(
        `[migrations] ${r.name} (${r.schema}): applied ${r.applied.length} — ${r.applied.join(', ')}`,
      );
    } else if (r.pending.length > 0) {
      totalPending += r.pending.length;
      console.warn(
        `[migrations] ${r.name} (${r.schema}): ${r.pending.length} PENDING ` +
          `(${appliedNote(r)}) — ${r.pending.join(', ')}`,
      );
    } else {
      console.log(
        `[migrations] ${r.name} (${r.schema}): up to date (${appliedNote(r)})`,
      );
    }
  }

  const shared = [...perSchema.entries()].filter(([, count]) => count > 1);
  for (const [schema, count] of shared) {
    const names = results
      .filter((r) => r.schema === schema)
      .map((r) => r.name)
      .join(', ');
    console.warn(
      `[migrations] NOTE: ${count} services share schema "${schema}" and therefore share ` +
        `its single "${schema}".migrations table, so each one's applied-count includes the ` +
        `others' rows and its pending list is measured against them: ${names}. ` +
        'Resolve the shared bookkeeping before applying migrations for any of them.',
    );
  }

  // Reported after the per-service lines so it reads as a gap in the report
  // above rather than a service result. These never reach `targets`, so before
  // this they produced no output whatsoever — the failure mode that hid
  // identity-verification-service's missing schema for as long as it existed.
  if (orphanMigrations.length > 0) {
    const names = orphanMigrations
      .map((dir) => dir.replace(/^apps\//, ''))
      .join(', ');
    console.warn(
      `[migrations] NOTE: ${orphanMigrations.length} service(s) ship compiled migrations ` +
        `but expose no data-source, so nothing can apply them and they are absent from ` +
        `the report above: ${names}. Add a data-source (see any service's ` +
        'src/data-source.ts) to bring them under migration control.',
    );
  }

  if (MODE !== 'apply' && totalPending > 0) {
    console.warn(
      `[migrations] ${totalPending} pending migration(s) across ${targets.length} service(s). ` +
        'Schema drift is why entity fields can exist with no column behind them. ' +
        'Apply per service with MIGRATE_MODE=apply MIGRATE_SERVICES=<name>.',
    );
  }

  // Reporting must never break a boot; only an explicit apply may fail the run.
  return MODE === 'apply' && failed > 0 ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('[migrations] fatal:', err.message);
    process.exit(MODE === 'apply' ? 1 : 0);
  });
