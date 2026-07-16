require('dotenv').config();
require('ts-node').register({ transpileOnly: true });
require('tsconfig-paths').register({ baseUrl: __dirname, paths: {} });

const { AppDataSource } = require('./apps/user-service/src/data-source');

const SKIP_ERRORS = ['already exists', 'does not exist', 'duplicate column', 'duplicate key'];

function isSkippable(err) {
  const msg = (err.message || '') + (err.driverError?.message || '');
  return SKIP_ERRORS.some(s => msg.includes(s));
}

async function run() {
  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();

  // Ensure migrations table exists
  await qr.query(`
    CREATE TABLE IF NOT EXISTS user_service.migrations (
      id SERIAL PRIMARY KEY,
      timestamp BIGINT NOT NULL,
      name VARCHAR NOT NULL
    )
  `);

  const executed = await qr.query(`SELECT name FROM user_service.migrations`);
  const executedNames = new Set(executed.map(r => r.name));

  const allMigrations = AppDataSource.migrations
    .map(m => new m())
    .sort((a, b) => Number(a.name.match(/\d+/)?.[0] ?? 0) - Number(b.name.match(/\d+/)?.[0] ?? 0));

  const pending = allMigrations.filter(m => !executedNames.has(m.name));
  console.log(`${pending.length} pending migrations`);

  for (const migration of pending) {
    process.stdout.write(`  ${migration.name} ... `);
    try {
      await qr.startTransaction();
      await migration.up(qr);
      await qr.query(
        `INSERT INTO user_service.migrations(timestamp, name) VALUES ($1, $2)`,
        [Number(migration.name.match(/(\d+)/)?.[1] ?? 0), migration.name]
      );
      await qr.commitTransaction();
      console.log('OK');
    } catch (err) {
      await qr.rollbackTransaction();
      if (isSkippable(err)) {
        const shortMsg = (err.driverError?.message || err.message || '').split('\n')[0];
        console.log(`SKIP (${shortMsg})`);
        try {
          await qr.query(
            `INSERT INTO user_service.migrations(timestamp, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [Number(migration.name.match(/(\d+)/)?.[1] ?? 0), migration.name]
          );
        } catch (_) {}
      } else {
        console.error(`FAIL: ${err.message}`);
      }
    }
  }

  await qr.release();
  await AppDataSource.destroy();
  console.log('Done.');
}

run().catch(e => { console.error(e); process.exit(1); });
