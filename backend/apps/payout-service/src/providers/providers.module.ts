import { Module }              from '@nestjs/common';
import { TypeOrmModule }       from '@nestjs/typeorm';
import { StripeProvider }      from './stripe.provider';
import { StripeWebhookController } from './stripe-webhook.controller';
import { WiseProvider }        from './wise.provider';
import { PayoneerProvider }    from './payoneer.provider';
import { CryptoPayoutProvider } from './crypto.provider';
import { TeqCoinProvider }    from './teq-coin.provider';
import { DepositMethod }      from '../entities/deposit-method.entity';
import { DepositMethodVerification } from '../entities/deposit-method-verification.entity';
import { PayoutRequest }      from '../entities/payout-request.entity';
import { PublishersModule }   from '../publishers/publishers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DepositMethod, DepositMethodVerification, PayoutRequest]),
    PublishersModule,
  ],
  controllers: [StripeWebhookController],
  providers: [StripeProvider, WiseProvider, PayoneerProvider, CryptoPayoutProvider, TeqCoinProvider],
  exports: [StripeProvider, WiseProvider, PayoneerProvider, CryptoPayoutProvider, TeqCoinProvider],
})
export class ProvidersModule {}
