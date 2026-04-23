import { AppDataSource } from './apps/listings-service/src/data-source';

async function main() {
  console.log('Initializing DataSource...');
  await AppDataSource.initialize();
  console.log('DataSource initialized. Schema should be synchronized.');
  await AppDataSource.destroy();
}

main().catch(err => {
  console.error('Failed to initialize DataSource:', err);
  process.exit(1);
});
