import { Controller, Get, Put, Body } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { UserKeysService } from './user-keys.service';

@Controller('user-keys')
export class UserKeysController {
  constructor(private readonly userKeysService: UserKeysService) {}

  @Get()
  getUserKeys(@CurrentUser() user: JwtUser) {
    return this.userKeysService.getUserKeys(user.sub);
  }

  @Get('private-key')
  getEncryptedPrivateKey(@CurrentUser() user: JwtUser) {
    return this.userKeysService.getEncryptedPrivateKey(user.sub);
  }

  @Put('private-key')
  storeEncryptedPrivateKey(
    @CurrentUser() user: JwtUser,
    @Body() body: { encryptedPrivateKey: string; publicKey?: string },
  ) {
    return this.userKeysService.storeEncryptedPrivateKey(user.sub, body.encryptedPrivateKey, body.publicKey);
  }
}
