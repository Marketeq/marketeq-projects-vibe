import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Transaction }       from '../entities/transaction.entity';
import { TransactionDetail } from '../entities/transaction-detail.entity';
import { Contract }          from '../entities/contract.entity';
import { PaymentMethod }     from '../entities/payment-method.entity';
import { Invoice }           from '../entities/invoice.entity';

import { TransactionController } from '../controllers/transaction.controller';
import { TransactionService }    from '../services/transaction.service';
import { CacheService }          from '../services/cache.service';
import { AblyService }           from '../services/ably.service';
import { EventPublisherService } from '../services/event-publisher.service';
import { StructuredLogger }      from '../services/logger.service';

import { BillingConsumer }      from '../consumers/billing.consumer';
import { TimeTrackingConsumer } from '../consumers/timetracking.consumer';
import { PayoutConsumer }       from '../consumers/payout.consumer';

import { HealthModule }          from './health.module';
import { ExportModule }          from './export.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      TransactionDetail,
      Contract,
      PaymentMethod,
      Invoice,
    ]),
    HealthModule,
    forwardRef(() => ExportModule),
  ],
  controllers: [TransactionController],
  providers: [
    TransactionService,
    CacheService,
    AblyService,
    EventPublisherService,
    StructuredLogger,
    BillingConsumer,
    TimeTrackingConsumer,
    PayoutConsumer,
  ],
  exports: [TransactionService, CacheService, AblyService, StructuredLogger],
})
export class TransactionModule {}