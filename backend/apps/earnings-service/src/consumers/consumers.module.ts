import { Module }                      from '@nestjs/common';
import { TypeOrmModule }               from '@nestjs/typeorm';
import { ConfigModule }                from '@nestjs/config';
import { PublishersModule }            from '../publishers/publishers.module';
import { CacheModule }                 from '../cache/cache.module';
import { TransactionCreatedConsumer }  from './transaction-created.consumer';
import { TransactionReversedConsumer } from './transaction-reversed.consumer';
import { PayoutCompletedConsumer }     from './payout-completed.consumer';
import { PayoutFailedConsumer }        from './payout-failed.consumer';
import { ContractActivatedConsumer }   from './contract-activated.consumer';
import { ScreenshotConfirmedConsumer } from './screenshot-confirmed.consumer';
import { ManualTimeConfirmedConsumer } from './manual-time-confirmed.consumer';
import { InternalModule }              from '../internal/internal.module';
import { EarningsCache }               from '../entities/earnings-cache.entity';
import { BalanceSnapshot }             from '../entities/balance-snapshot.entity';
import { ContractLabelCache }          from '../entities/contract-label-cache.entity';

@Module({
  imports: [
    ConfigModule, PublishersModule, CacheModule, InternalModule,
    TypeOrmModule.forFeature([EarningsCache, BalanceSnapshot, ContractLabelCache]),
  ],
  // These are @Controller() classes, not @Injectable() providers — NestJS's
  // microservices layer only scans a module's `controllers` array for
  // @MessagePattern/@EventPattern handlers (see
  // MicroservicesModule.setupListeners, which destructures `controllers`
  // off each module and ignores `providers` entirely). Registered as
  // providers, none of these ever received a single RabbitMQ message —
  // confirmed live: every publish attempt came back "unsupported message/
  // event, Pattern: ..." regardless of what the producer side did.
  controllers: [
    TransactionCreatedConsumer, TransactionReversedConsumer,
    PayoutCompletedConsumer, PayoutFailedConsumer, ContractActivatedConsumer,
    ScreenshotConfirmedConsumer, ManualTimeConfirmedConsumer,
  ],
})
export class ConsumersModule {}
