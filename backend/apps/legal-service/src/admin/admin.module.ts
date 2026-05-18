import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NdaModule } from '../nda/nda.module';
import { NdaSigningEvent } from '../nda/entities/nda-signing-event.entity';
import { NdaDocument } from '../nda/entities/nda-document.entity';
import { NdaSettings } from '../nda/entities/nda-settings.entity';
import { AdminController } from './controllers/admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([NdaSigningEvent, NdaDocument, NdaSettings]),
    NdaModule, // provides NdaGenerationService + NdaEventsPublisher
  ],
  controllers: [AdminController],
})
export class AdminModule {}
