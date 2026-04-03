import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'
import { ConfigModule, ConfigService } from '@nestjs/config'

import { WireMatchCandidate } from '../entities/wire-match-candidate.entity'
import { SyncLog } from '../entities/sync-log.entity'
import { Invoice } from '../entities/invoice.entity'
import { QuickBooksCustomerMap } from '../entities/quickbooks-customer-map.entity'
import { WireTransfer } from '../entities/wire-transfer.entity'

import { AdminReviewController } from '../controllers/admin-review.controller'
import { QuickBooksWebhookController } from '../controllers/quickbooks-webhook.controller'
import { WireTransferController } from '../controllers/wire-transfer.controller'

import { AirtableSyncService } from '../services/airtable-sync.service'
import { AirtableUpdateService } from '../services/airtable-update.service'
import { MatchingScoreService } from '../services/matching-score.service'
import { QuickBooksWebhookService } from '../services/quickbooks-webhook.service'
import { QuickBooksService } from '../services/quickbooks.service'
import { InvoiceService } from '../services/invoice.service'
import { WireTransferService } from '../services/wire-transfer.service'
import { MercuryApiService } from '../services/mercury-api.service'
import { AirtableSyncJob } from '../jobs/airtable-sync.job'
import { PollMercuryTransactionsJob } from '../jobs/poll-mercury-transactions.job'
import { UnmatchedWireAuditJob } from '../jobs/unmatched-wire-audit.job'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DATABASE_HOST'),
        port: Number(config.get('DATABASE_PORT') ?? 5432),
        username: config.get<string>('DATABASE_USERNAME'),
        password: config.get<string>('DATABASE_PASSWORD'),
        database: config.get<string>('DATABASE_NAME'),
        entities: [Invoice, WireTransfer, QuickBooksCustomerMap, SyncLog, WireMatchCandidate],
        autoLoadEntities: true,
        synchronize: false,
        ssl: config.get('DATABASE_SSL_ENABLED') === 'true'
          ? { rejectUnauthorized: false }
          : false,
        logging: ['error', 'warn'],
      }),
    }),

    TypeOrmModule.forFeature([
      WireMatchCandidate,
      SyncLog,
      Invoice,
      QuickBooksCustomerMap,
      WireTransfer,
    ]),
  ],
  controllers: [
    AdminReviewController,
    QuickBooksWebhookController,
    WireTransferController,
  ],
  providers: [
    AirtableSyncService,
    AirtableUpdateService,
    MatchingScoreService,
    QuickBooksWebhookService,
    QuickBooksService,
    InvoiceService,
    WireTransferService,
    AirtableSyncJob,
    MercuryApiService,
    PollMercuryTransactionsJob,
    UnmatchedWireAuditJob,
  ],
})
export class WireReviewModule {}
