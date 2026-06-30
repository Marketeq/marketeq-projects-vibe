// Standalone DataSource for TypeORM CLI.
// Usage: npx typeorm migration:run -d apps/earnings-service/src/data-source.ts
import { AppDataSource } from './database/database.module';
export default AppDataSource;
