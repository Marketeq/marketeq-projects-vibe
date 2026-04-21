import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TalentProfile } from './entities/talent-profile.entity';
import { TalentProfileSyncService } from './talent-profile-sync.service';
import { TalentProfileSyncConsumer } from './talent-profile-sync.consumer';
import { TalentProfileController } from './talent-profile.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TalentProfile])],
  controllers: [TalentProfileController, TalentProfileSyncConsumer],
  providers: [TalentProfileSyncService],
  exports: [TalentProfileSyncService],
})
export class TalentProfileModule {}
