import { Module } from '@nestjs/common';
import { DataRetentionWorker } from './data-retention.worker';

/**
 * Registers the DataRetentionWorker which enforces the 7-year IP address
 * purge policy defined in LS-06 §7.7.
 * DataSource is provided globally by TypeOrmModule — no extra registration needed.
 */
@Module({
  providers: [DataRetentionWorker],
})
export class DataRetentionModule {}
