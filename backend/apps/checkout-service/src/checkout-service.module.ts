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
import { CheckoutDraftPhaseEntity } from './checkout/entities/checkout-draft-phase.entity';
import { CheckoutDraftTaskEntity } from './checkout/entities/checkout-draft-task.entity';
import { CheckoutService } from './checkout/checkout.service';
import { CheckoutDraftService } from './checkout/checkout-draft.service';
import { CheckoutSummaryService } from './checkout/checkout-summary.service';
import { CheckoutDraftCodeService } from './checkout/checkout-draft-code.service';
import { CheckoutDraftPricingService } from './checkout/pricing/checkout-draft-pricing.service';
import { PromoAdjustment } from './checkout/pricing/promo.adjustment';
import { GiftCardAdjustment } from './checkout/pricing/gift-card.adjustment';
import { DRAFT_PRICING_ADJUSTMENTS } from './checkout/pricing/pricing.types';
import { LISTINGS_RPC, PRICING_RPC, USER_RPC } from './checkout/rpc-clients';
import { CheckoutController } from './checkout/checkout.controller';
import { UcheckoutUserviceController } from './checkout-service.controller';
import { UcheckoutUserviceService } from './checkout-service.service';
import { StripeService } from './stripe/stripe.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { InternalTokenGuard } from './guards/internal-token.guard';

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
        CheckoutDraft, CheckoutDraftPhaseEntity, CheckoutDraftTaskEntity,
      ],
      synchronize: false,
      extra: {
        connectionTimeoutMillis: 10000,
        options: '-c idle_in_transaction_session_timeout=30000',
      },
      migrationsRun: true,
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      ssl: (process.env.DATABASE_SSL_ENABLED ?? 'false').toLowerCase() === 'true' ? { rejectUnauthorized: false } : false,
    }),
    TypeOrmModule.forFeature([
      CheckoutSession, Wallet, GiftCard,
      WalletTransaction, PaymentFailure, InstallmentPayment,
      SavedBankAccount, WireTransfer, StripeMetadata,
      CheckoutDraft, CheckoutDraftPhaseEntity, CheckoutDraftTaskEntity,
    ]),
    ClientsModule.register(
      [
        { name: LISTINGS_RPC, queue: 'listings_service_queue' },
        { name: PRICING_RPC, queue: 'pricing_service_queue' },
        { name: USER_RPC, queue: 'user_service_queue' },
      ].map(({ name, queue }) => ({
        name,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
          queue,
          queueOptions: { durable: true },
        },
      })),
    ),
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
  providers: [CheckoutService, CheckoutDraftService, CheckoutDraftCodeService, CheckoutDraftPricingService, PromoAdjustment, GiftCardAdjustment, {
      provide: DRAFT_PRICING_ADJUSTMENTS,
      useFactory: (promo: PromoAdjustment, giftCards: GiftCardAdjustment) => [promo, giftCards],
      inject: [PromoAdjustment, GiftCardAdjustment],
    }, CheckoutSummaryService, UcheckoutUserviceService, StripeService, JwtAuthGuard, InternalTokenGuard],
})
export class CheckoutServiceModule {}
