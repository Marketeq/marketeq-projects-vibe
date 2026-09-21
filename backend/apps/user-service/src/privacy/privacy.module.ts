import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivacySettings } from './entities/privacy-settings.entity';
import { PrivacyService } from './privacy.service';
import { PrivacyController } from './privacy.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PrivacySettings])],
  providers: [PrivacyService],
  controllers: [PrivacyController],
  exports: [PrivacyService],
})
export class PrivacyModule {}
