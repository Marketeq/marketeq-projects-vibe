// apps/payout-service/src/magic-link/magic-link.module.ts
// PS-14: Magic Link module — token generation, validation, resend, expiry cron
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MagicLinkService } from './magic-link.service';
import { MagicLinkVerification } from '../entities/magic-link-verification.entity';
import { PayoutRequest } from '../entities/payout-request.entity';
import { DepositMethod } from '../entities/deposit-method.entity';
import { PublishersModule } from '../publishers/publishers.module';
import { BrevoMailService } from '../notifications/brevo-mail.service';

import { IdentityGateModule } from '../identity-gate/identity-gate.module';

@Module({
  imports: [
    // MagicLinkToken (PS-01's original table) is intentionally not
    // registered here — MagicLinkService only ever uses MagicLinkVerification
    // (PS-14 §9). MagicLinkToken is still real, used elsewhere by
    // PayoutService.verifyMagicLink()/micro-deposit.service.ts, each
    // registering it in their own module.
    TypeOrmModule.forFeature([MagicLinkVerification, PayoutRequest, DepositMethod]),
    PublishersModule,
    IdentityGateModule, // G9 PayoutExecutionGate
  ],
  providers: [MagicLinkService, BrevoMailService],
  exports: [MagicLinkService],
})
export class MagicLinkModule {}