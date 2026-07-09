import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RelationalProjectPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

import { ImageValidator } from '../utils/validation';
import { PublishController } from './publish.controller';
import { PublishService } from './publish.service';
import { ProjectModerationService } from './project-moderation.service';
import { CloudflareStorageService } from './cloudflare-storage.service';
import { DELIVERABLES_ADAPTER } from '../project-sync/deliverables/deliverables.adapter';
import { DeliverablesAdapterHeuristic } from '../project-sync/deliverables/deliverables.adapter.heuristic';
import { DeliverablesAdapterHuggingFace } from '../project-sync/deliverables/deliverables.adapter.huggingface';
import { FAQ_ADAPTER } from './faq/faq.adapter';
import { FaqAdapterHeuristic } from './faq/faq.adapter.heuristic';
import { FaqAdapterHuggingFace } from './faq/faq.adapter.huggingface';

@Module({
  imports: [HttpModule, RelationalProjectPersistenceModule],
  controllers: [PublishController],
  providers: [
    PublishService,
    ProjectModerationService,
    CloudflareStorageService,
    DeliverablesAdapterHeuristic,
    DeliverablesAdapterHuggingFace,
    {
      provide: DELIVERABLES_ADAPTER,
      useExisting: DeliverablesAdapterHuggingFace,
    },
    FaqAdapterHeuristic,
    FaqAdapterHuggingFace,
    {
      provide: FAQ_ADAPTER,
      useExisting: FaqAdapterHuggingFace,
    },
    {
      provide: ImageValidator,
      useFactory: () => {
        const validationOptions = {
          maxSize: 5 * 1024 * 1024,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        };
        return new ImageValidator(validationOptions);
      },
    },
  ],
  exports: [PublishService, CloudflareStorageService, RelationalProjectPersistenceModule],
})
export class PublishModule {}
