import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { AcceptanceController } from './controllers/acceptance.controller';
import { AcceptanceService } from './services/acceptance.service';
import { AcceptanceRecord } from './entities/acceptance-record.entity';
import { LegalDocumentRecord } from '../legal-documents/entities/legal-document-record.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      AcceptanceRecord,
      LegalDocumentRecord, // needed by AcceptanceService (immutable audit record)
    ]),
  ],
  controllers: [AcceptanceController],
  providers: [AcceptanceService],
  exports: [AcceptanceService],
})
export class AcceptanceModule {}
