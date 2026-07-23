// apps/payout-service/src/payout/payout.module.ts
// PS-02 + PS-19: Payout module with rate limiting
import { Module }          from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { BullModule }      from '@nestjs/bull';
import { PayoutController } from './payout.controller';
import { PayoutService }   from './payout.service';
import { WithdrawalRateLimitService } from './withdrawal-rate-limit.service';
import { PayoutRequest }   from '../entities/payout-request.entity';
import { DepositMethod }   from '../entities/deposit-method.entity';
import { MagicLinkToken }  from '../entities/magic-link-token.entity';
import { PayoutSchedule }  from '../entities/payout-schedule.entity';
import { CommonModule }    from '../common/common.module';
import { MagicLinkModule } from '../magic-link/magic-link.module';
import { KycModule }       from '../kyc/kyc.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayoutRequest, DepositMethod, MagicLinkToken, PayoutSchedule]),
    BullModule.registerQueue({ name: 'payout-processing' }),
    CommonModule,
    MagicLinkModule,
    KycModule,
  ],
  controllers: [PayoutController],
  providers: [PayoutService, WithdrawalRateLimitService],
  exports: [PayoutService, WithdrawalRateLimitService],
})
export class PayoutModule {}