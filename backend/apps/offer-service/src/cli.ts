// apps/offer-service/src/cli.ts
// OS-37: CLI entry point for TypeORM migrations.
// Used by K8s migration job and npm run migration:* scripts.
// Usage: node dist/cli.js migration:run
import { DataSource } from 'typeorm';

// Build data source options from environment
const dataSourceOptions: any = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  schema: 'offer_service',
  entities: [],
  migrations: ['dist/apps/offer-service/migrations/*.js'],
  migrationsTableName: 'migrations',
  logging: true,
};

async function main() {
  const command = process.argv[2];

  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();

  switch (command) {
    case 'migration:run':
      await ds.runMigrations({ transaction: 'each' });
      console.log('Migrations complete.');
      break;

    case 'migration:revert':
      await ds.undoLastMigration();
      console.log('Last migration reverted.');
      break;

    case 'migration:show':
      const pending = await ds.showMigrations();
      console.log('Pending migrations:', pending);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Available: migration:run, migration:revert, migration:show');
      await ds.destroy();
      process.exit(1);
  }

  await ds.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});