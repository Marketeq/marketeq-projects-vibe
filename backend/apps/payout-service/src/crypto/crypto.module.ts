// apps/payout-service/src/crypto/crypto.module.ts
// PS-10 + PS-11: Crypto wallet module
import { Module }                    from '@nestjs/common';
import { TypeOrmModule }             from '@nestjs/typeorm';
import { CryptoConnectionService }   from './crypto-connection.service';
import { AddressValidatorService }   from './address-validator.service';
import { ConversionService }         from './conversion.service';
import { ProviderValidationService } from './provider-validation.service';
import { CryptoController }          from './crypto.controller';
import { RampWebhookController }     from './ramp-webhook.controller';
import { DepositMethod }             from '../entities/deposit-method.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DepositMethod])],
  controllers: [CryptoController, RampWebhookController],
  providers: [
    CryptoConnectionService,
    AddressValidatorService,
    ConversionService,
    ProviderValidationService,
  ],
  exports: [
    CryptoConnectionService,
    AddressValidatorService,
    ConversionService,
    ProviderValidationService,
  ],
})
export class CryptoModule {}