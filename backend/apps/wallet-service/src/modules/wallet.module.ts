import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'

import { GiftCard } from '../entities/giftcard.entity'
import { WalletTransaction } from '../entities/wallet-transaction.entity'
import { UserWallet } from '../entities/user-wallet.entity'

import { WalletService } from '../services/wallet.service'
import { WalletController } from '../controllers/wallet.controller'
import { WalletCheckoutController } from '../controllers/wallet-checkout.controller'
import { WalletWebhookController } from '../controllers/wallet-webhook.controller'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DATABASE_HOST'),
        port: Number(config.get('DATABASE_PORT') ?? 5432),
        username: config.get<string>('DATABASE_USERNAME'),
        password: config.get<string>('DATABASE_PASSWORD'),
        database: config.get<string>('DATABASE_NAME'),
        entities: [GiftCard, WalletTransaction, UserWallet],
        autoLoadEntities: true,
        synchronize: false,
        ssl: config.get('DATABASE_SSL_ENABLED') === 'true'
          ? { rejectUnauthorized: false }
          : false,
        logging: ['error', 'warn'],
      }),
    }),

    TypeOrmModule.forFeature([GiftCard, WalletTransaction, UserWallet]),
  ],

  controllers: [
    WalletController,
    WalletCheckoutController,
    WalletWebhookController,
  ],

  providers: [WalletService],
})
export class WalletModule {}
