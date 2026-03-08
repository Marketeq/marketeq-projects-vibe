import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PassportModule } from '@nestjs/passport'
import { JwtModule } from '@nestjs/jwt'

import { Transaction } from './entities/transaction.entity'
import { Invoice } from './entities/invoice.entity'
import { Contract } from './entities/contract.entity'
import { PaymentMethod } from './entities/payment-method.entity'
import { AuditLog } from './entities/audit-log.entity'

import { TransactionService } from './services/transaction.service'
import { InvoiceService } from './services/invoice.service'
import { ExportService } from './services/export.service'

import { TransactionController } from './controllers/transaction.controller'
import { InvoiceController } from './controllers/invoice.controller'
import { ExportController } from './controllers/export.controller'

import { BillingConsumer } from './consumers/billing.consumer'
import { TimeTrackingConsumer } from './consumers/timetracking.consumer'
import { PayoutConsumer } from './consumers/payout.consumer'

import { JwtStrategy } from './guards/jwt-auth.guard'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        schema: 'transaction_service',
        entities: [Transaction, Invoice, Contract, PaymentMethod, AuditLog],
        synchronize: config.get('NODE_ENV') !== 'production',
        ssl: config.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
    TypeOrmModule.forFeature([Transaction, Invoice, Contract, PaymentMethod, AuditLog]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [TransactionService, InvoiceService, ExportService, JwtStrategy],
  controllers: [
    TransactionController, InvoiceController, ExportController,
    BillingConsumer, TimeTrackingConsumer, PayoutConsumer,
  ],
})
export class TransactionServiceModule {}
