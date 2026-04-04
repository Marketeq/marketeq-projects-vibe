import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Transaction }       from '../entities/transaction.entity';
import { TransactionDetail } from '../entities/transaction-detail.entity';
import { Invoice }           from '../entities/invoice.entity';
import { Contract }          from '../entities/contract.entity';
import { PaymentMethod }     from '../entities/payment-method.entity';

import { ExportController } from '../controllers/export.controller';
import { ExportService }    from '../services/export.service';

import { TransactionModule } from './transaction.module';
import { InvoiceModule }     from './invoice.module';
import { AuditModule }       from './audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      TransactionDetail,
      Invoice,
      Contract,
      PaymentMethod,
    ]),
    forwardRef(() => TransactionModule),
    forwardRef(() => InvoiceModule),
    AuditModule,
  ],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}