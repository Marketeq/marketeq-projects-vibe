import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CheckoutSession } from './checkout/entities/checkout-session.entity';
import { Wallet } from './checkout/entities/wallet.entity';
import { GiftCard } from './checkout/entities/gift-card.entity';
import { WalletTransaction } from './checkout/entities/wallet-transaction.entity';
import { PaymentFailure } from './checkout/entities/payment-failure.entity';
import { InstallmentPayment } from './checkout/entities/installment-payment.entity';
import { SavedBankAccount } from './checkout/entities/saved-bank-account.entity';
import { WireTransfer } from './checkout/entities/wire-transfer.entity';
import { StripeMetadata } from './checkout/entities/stripe-metadata.entity';
import { CheckoutDraft } from './checkout/entities/checkout-draft.entity';
import { CheckoutService } from './checkout/checkout.service';
import { CheckoutDraftService } from './checkout/checkout-draft.service';
import { CheckoutController } from './checkout/checkout.controller';
import { UcheckoutUserviceController } from './checkout-service.controller';
import { UcheckoutUserviceService } from './checkout-service.service';
import { StripeService } from './stripe/stripe.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema: process.env.DATABASE_SCHEMA || 'checkout',
      entities: [
        CheckoutSession, Wallet, GiftCard,
        WalletTransaction, PaymentFailure, InstallmentPayment,
        SavedBankAccount, WireTransfer, StripeMetadata,
        CheckoutDraft,
      ],
      synchronize: false,
      migrationsRun: true,
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      ssl: (process.env.DATABASE_SSL_ENABLED ?? 'false').toLowerCase() === 'true' ? { rejectUnauthorized: false } : false,
    }),
    TypeOrmModule.forFeature([
      CheckoutSession, Wallet, GiftCard,
      WalletTransaction, PaymentFailure, InstallmentPayment,
      SavedBankAccount, WireTransfer, StripeMetadata,
      CheckoutDraft,
    ]),
    ...(process.env.RABBITMQ_URL
      ? [ClientsModule.register([
          {
            name: 'RABBITMQ_CLIENT',
            transport: Transport.RMQ,
            options: {
              urls: [process.env.RABBITMQ_URL],
              queue: 'checkout_events',
              queueOptions: { durable: true },
            },
          },
        ])]
      : []),
  ],
  controllers: [CheckoutController, UcheckoutUserviceController],
  providers: [CheckoutService, CheckoutDraftService, UcheckoutUserviceService, StripeService, JwtAuthGuard],
})
export class CheckoutServiceModule {}
