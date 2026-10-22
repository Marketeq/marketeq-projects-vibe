import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { DesktopLaunchController } from './desktop-launch.controller';
import { DesktopLaunchService } from './desktop-launch.service';

@Module({
  imports: [DevicesModule],
  controllers: [DesktopLaunchController],
  providers: [DesktopLaunchService],
})
export class DesktopLaunchModule {}
