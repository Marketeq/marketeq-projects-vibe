import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { BearerGuard } from '../common/guards/bearer.guard';
import { DevicesService } from '../devices/devices.service';
import { RegisterDeviceDto } from '../devices/dto/register-device.dto';
import { DesktopLaunchService } from './desktop-launch.service';
import { AckLaunchDto } from './dto/ack-launch.dto';

// Mounted under time-tracking/ so the gateway's existing `time-tracking`
// prefix forwards it unchanged.
@Controller('time-tracking/desktop-launch')
@UseGuards(BearerGuard)
export class DesktopLaunchController {
  constructor(
    private readonly svc: DesktopLaunchService,
    private readonly devices: DevicesService,
  ) {}

  /** Desktop app: "I was opened by the link carrying this launch id." */
  @Post('ack')
  @HttpCode(204)
  ack(@Req() req: any, @Body() dto: AckLaunchDto): void {
    this.svc.ack(this.userId(req), dto.launchId);
  }

  /**
   * Desktop app, once signed in: "this user has the tracker installed here."
   * Lives under time-tracking/ because the gateway sends /devices/* to
   * user-service.
   */
  @Post('installed')
  @HttpCode(204)
  async installed(@Req() req: any, @Body() dto: RegisterDeviceDto): Promise<void> {
    await this.devices.register(this.userId(req), dto);
  }

  /**
   * Web app: has this user ever signed in to the desktop tracker? Lets Log
   * Time offer the installer straight away to users who don't have it, and
   * hold it back from users who do. Declared before `:launchId` so it isn't
   * parsed as a launch id.
   */
  @Get('has-device')
  async hasDevice(@Req() req: any): Promise<{ hasDevice: boolean }> {
    const devices = await this.devices.findByUser(this.userId(req));
    return { hasDevice: devices.length > 0 };
  }

  /** Web app: has the desktop app acknowledged this launch id yet? */
  @Get(':launchId')
  status(
    @Req() req: any,
    @Param('launchId', new ParseUUIDPipe()) launchId: string,
  ): { opened: boolean } {
    return { opened: this.svc.isAcknowledged(this.userId(req), launchId) };
  }

  private userId(req: any): string {
    const userId = req?.user?.sub;
    if (!userId) throw new UnauthorizedException('Missing user');
    return String(userId);
  }
}
