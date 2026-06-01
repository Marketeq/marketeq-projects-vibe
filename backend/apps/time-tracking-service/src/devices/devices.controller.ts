import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { BearerGuard } from '../common/guards/bearer.guard';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';

@Controller('devices')
@UseGuards(BearerGuard)
export class DevicesController {
  constructor(private readonly svc: DevicesService) {}
 
  @Post('register')
  async register(@Req() req: any, @Body() dto: RegisterDeviceDto) {
    const userId = req?.user?.sub ?? req?.headers?.['x-user-id'];
    return this.svc.register(String(userId), dto);
  }
 
  @Post('heartbeat')
  async heartbeat(@Body() dto: HeartbeatDto) {
    return this.svc.heartbeat(dto.deviceId);
  }
}