import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule }       from '@nestjs/typeorm';
import { MethodsController }   from './methods.controller';
import { MethodsService }      from './methods.service';
import { BankValidationService } from './bank-validation.service';
import { BankEncryptionService } from './bank-encryption.service';
import { MicroDepositService } from './micro-deposit.service';
import { DepositMethod }       from '../entities/deposit-method.entity';
import { DepositMethodVerification } from '../entities/deposit-method-verification.entity';
import { MagicLinkToken }     from '../entities/magic-link-token.entity';
import { PayoutSchedule }      from '../entities/payout-schedule.entity';
import { PayoutAuditLog } from '../entities/payout-audit-log.entity';
import { PublishersModule }    from '../publishers/publishers.module';
import { ProvidersModule }     from '../providers/providers.module';
import { CryptoModule } from '../crypto/crypto.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DepositMethod, DepositMethodVerification, PayoutSchedule, PayoutAuditLog,MagicLinkToken]),
    PublishersModule,
    ProvidersModule,
    forwardRef(() => CryptoModule), 
  ],
  controllers: [MethodsController],
  providers: [MethodsService, BankValidationService, BankEncryptionService, MicroDepositService],
  exports: [MethodsService, BankValidationService, BankEncryptionService, MicroDepositService],
})
export class MethodsModule {}
