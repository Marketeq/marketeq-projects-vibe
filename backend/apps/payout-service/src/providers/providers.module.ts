import { Module }              from '@nestjs/common';
import { TypeOrmModule }       from '@nestjs/typeorm';
import { StripeProvider }      from './stripe.provider';
import { StripeWebhookController } from './stripe-webhook.controller';
import { PaypalProvider }      from './paypal.provider';
import { WiseProvider }        from './wise.provider';
import { PayoneerProvider }    from './payoneer.provider';
import { CryptoPayoutProvider } from './crypto.provider';
import { TeqCoinProvider }    from './teq-coin.provider';
import { DepositMethod }      from '../entities/deposit-method.entity';
import { DepositMethodVerification } from '../entities/deposit-method-verification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DepositMethod, DepositMethodVerification])],
  controllers: [StripeWebhookController],
  providers: [StripeProvider, PaypalProvider, WiseProvider, PayoneerProvider, CryptoPayoutProvider, TeqCoinProvider],
  exports: [StripeProvider, PaypalProvider, WiseProvider, PayoneerProvider, CryptoPayoutProvider, TeqCoinProvider],
})
export class ProvidersModule {}
