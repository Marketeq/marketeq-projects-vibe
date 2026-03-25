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
import { CheckoutService } from './checkout/checkout.service';
import { CheckoutController } from './checkout/checkout.controller';
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
      ],
      synchronize: process.env.NODE_ENV !== 'production',
      migrationsRun: true,
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }),
    TypeOrmModule.forFeature([
      CheckoutSession, Wallet, GiftCard,
      WalletTransaction, PaymentFailure, InstallmentPayment,
      SavedBankAccount, WireTransfer, StripeMetadata,
    ]),
    ClientsModule.register([
      {
        name: 'RABBITMQ_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
          queue: 'checkout_events',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService, StripeService, JwtAuthGuard],
})
export class CheckoutServiceModule {}
