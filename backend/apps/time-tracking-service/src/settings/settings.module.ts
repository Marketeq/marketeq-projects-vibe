import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSettings } from '../entities/admin-settings.entity';
import { UserPreferences } from '../entities/user-preferences.entity';
import { SettingsService } from '../services/settings.service';
import { SettingsController } from '../controllers/settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AdminSettings, UserPreferences])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
