import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

import { Transaction } from '../entities/transaction.entity';
import { Invoice } from '../entities/invoice.entity';
import { TransactionDetail } from '../entities/transaction-detail.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { Contract } from '../entities/contract.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { InitialSchema1678886400000 } from '../migrations/1678886400000-InitialSchema';

// Load environment variables
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  schema: process.env.SUPABASE_SCHEMA ?? 'transaction_service',

  entities: [
    Transaction,
    Invoice,
    TransactionDetail,
    PaymentMethod,
    Contract,
    AuditLog,
  ],

  migrations: [InitialSchema1678886400000],
  migrationsTableName: 'migrations',

  synchronize: false,

  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});