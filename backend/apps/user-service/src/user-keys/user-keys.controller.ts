import { Controller, Get } from '@nestjs/common';
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
}
