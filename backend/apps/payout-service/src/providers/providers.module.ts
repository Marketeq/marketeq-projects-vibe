import { Module }              from '@nestjs/common';
import { TypeOrmModule }       from '@nestjs/typeorm';
import { StripeProvider }      from './stripe.provider';
import { StripeWebhookController } from './stripe-webhook.controller';
import { WisePlatformWebhookController } from './wise-platform-webhook.controller';
import { WisePlatformWebhookService } from './wise-platform-webhook.service';
import { WiseProvider }        from './wise.provider';
import { PayoneerProvider }    from './payoneer.provider';
import { CryptoPayoutProvider } from './crypto.provider';
import { TeqCoinProvider }    from './teq-coin.provider';
import { WisePlatformService } from '../execution/wise-platform.service';
import { DepositMethod }      from '../entities/deposit-method.entity';
import { DepositMethodVerification } from '../entities/deposit-method-verification.entity';
import { PayoutRequest }      from '../entities/payout-request.entity';
import { PublishersModule }   from '../publishers/publishers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DepositMethod, DepositMethodVerification, PayoutRequest]),
    PublishersModule,
  ],
  controllers: [StripeWebhookController, WisePlatformWebhookController],
  // WisePlatformService is registered here too (also lives in
  // ExecutionModule) rather than importing ExecutionModule, which imports
  // this module already — ExecutionModule -> ProvidersModule -> ExecutionModule
  // would be circular. It's stateless (ConfigService only, no repository),
  // so a second instance here carries no state-sharing risk.
  providers: [StripeProvider, WiseProvider, PayoneerProvider, CryptoPayoutProvider, TeqCoinProvider, WisePlatformWebhookService, WisePlatformService],
  exports: [StripeProvider, WiseProvider, PayoneerProvider, CryptoPayoutProvider, TeqCoinProvider],
})
export class ProvidersModule {}
