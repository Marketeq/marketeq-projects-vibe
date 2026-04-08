import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { UserKeysService } from './user-keys.service';
import { RegisterDeviceDto } from './dtos/register-device.dto';

@Controller('devices')
export class DevicesController {
  constructor(private readonly userKeysService: UserKeysService) {}

  @Post()
  registerDevice(
    @CurrentUser() user: JwtUser,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.userKeysService.registerDevice(user.sub, dto);
  }
}
