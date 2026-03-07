import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CheckoutSession } from './checkout/entities/checkout-session.entity';
import { Wallet } from './checkout/entities/wallet.entity';
import { GiftCard } from './checkout/entities/gift-card.entity';
import { CheckoutService } from './checkout/checkout.service';
import { CheckoutController } from './checkout/checkout.controller';
import { StripeService } from './stripe/stripe.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema: process.env.DATABASE_SCHEMA || 'checkout',
      entities: [CheckoutSession, Wallet, GiftCard],
      synchronize: process.env.NODE_ENV !== 'production',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }),
    TypeOrmModule.forFeature([CheckoutSession, Wallet, GiftCard]),
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService, StripeService],
})
export class CheckoutServiceModule {}
