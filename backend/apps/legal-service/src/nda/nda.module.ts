import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { NdaController } from './controllers/nda.controller';
import { NdaService } from './services/nda.service';
import { NdaGenerationService } from './services/nda-generation.service';
import { NdaSigningService } from './services/nda-signing.service';
import { NdaAuditService } from './services/nda-audit.service';
import { NdaEventsPublisher } from './services/nda-events.publisher';
import { NdaDocument } from './entities/nda-document.entity';
import { NdaSigningEvent } from './entities/nda-signing-event.entity';
import { NdaSettings } from './entities/nda-settings.entity';
import { LegalDocumentRecord } from '../legal-documents/entities/legal-document-record.entity';
import { OutboxEvent } from '../outbox/entities/outbox-event.entity';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        timeout: 10_000,
        maxRedirects: 3,
        baseURL: config.get<string>('USER_SERVICE_URL'),
      }),
    }),
    TypeOrmModule.forFeature([
      NdaDocument,
      NdaSigningEvent,
      NdaSettings,
      LegalDocumentRecord, // NdaSigningService writes LegalDocumentRecord in the signing transaction
      OutboxEvent,         // NdaSigningService + NdaService write OutboxEvents in transactions
    ]),
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URL')!],
            queue: 'legal_queue',
            exchange: 'marketeq.legal',
            exchangeType: 'topic',
            queueOptions: { durable: true },
            noAck: true,
          },
        }),
      },
    ]),
  ],
  controllers: [NdaController],
  providers: [
    NdaService,
    NdaGenerationService,
    NdaSigningService,
    NdaAuditService,
    NdaEventsPublisher,
  ],
  exports: [NdaService, NdaGenerationService, NdaEventsPublisher],
})
export class NdaModule {}
