import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { LegalDocumentsController } from './controllers/legal-documents.controller';
import { LegalDocumentsService } from './services/legal-documents.service';
import { LegalDocumentRecord } from './entities/legal-document-record.entity';
import { NdaModule } from '../nda/nda.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([LegalDocumentRecord]),
    NdaModule, // provides NdaGenerationService (for presigned URLs)
  ],
  controllers: [LegalDocumentsController],
  providers: [LegalDocumentsService],
})
export class LegalDocumentsModule {}
