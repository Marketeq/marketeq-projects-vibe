import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RelationalProjectPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

import { ImageValidator } from '../utils/validation';
import { PublishController } from './publish.controller';
import { PublishService } from './publish.service';
import { ProjectModerationService } from './project-moderation.service';
import { CloudflareStorageService } from './cloudflare-storage.service';

@Module({
  imports: [HttpModule, RelationalProjectPersistenceModule],
  controllers: [PublishController],
  providers: [
    PublishService,
    ProjectModerationService,
    CloudflareStorageService,
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
  exports: [PublishService, RelationalProjectPersistenceModule],
})
export class PublishModule {}
