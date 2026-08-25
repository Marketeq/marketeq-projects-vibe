// apps/payout-service/src/magic-link/magic-link.module.ts
// PS-14: Magic Link module — token generation, validation, resend, expiry cron
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MagicLinkService } from './magic-link.service';
import { MagicLinkToken } from '../entities/magic-link-token.entity';
import { MagicLinkVerification } from '../entities/magic-link-verification.entity';
import { PayoutRequest } from '../entities/payout-request.entity';
import { DepositMethod } from '../entities/deposit-method.entity';
import { PublishersModule } from '../publishers/publishers.module';
import { BrevoMailService } from '../notifications/brevo-mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MagicLinkToken, MagicLinkVerification, PayoutRequest, DepositMethod]),
    PublishersModule,
  ],
  providers: [MagicLinkService, BrevoMailService],
  exports: [MagicLinkService],
})
export class MagicLinkModule {}