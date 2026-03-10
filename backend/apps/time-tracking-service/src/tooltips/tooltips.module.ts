import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tooltip } from './tooltip.entity';
import { TooltipsService } from './tooltips.service';
import { TooltipsController } from './tooltips.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tooltip]), SettingsModule],
  controllers: [TooltipsController],
  providers: [TooltipsService],
  exports: [TooltipsService],
})
export class TooltipsModule {}
