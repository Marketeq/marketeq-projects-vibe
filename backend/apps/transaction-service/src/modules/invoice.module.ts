import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
 
import { Invoice } from '../entities/invoice.entity';
import { Contract } from '../entities/contract.entity';
 
// Populated in Doc 04
import { InvoiceController } from '../controllers/invoice.controller';
import { InvoiceService } from '../services/invoice.service';
 
@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Contract]),
    // HttpModule enables outbound HTTP calls to Stripe invoice API
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
