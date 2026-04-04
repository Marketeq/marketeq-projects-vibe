import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../decorators/public.decorator';
import { UserService } from './user.service';
import { SyncUserDto } from './dtos/sync-user.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('User')
@Public()
@Controller('internal/users')
export class UserSyncController {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({ summary: 'Sync user' })
  @Post()
  syncUser(
    @Headers('x-internal-token') token: string | undefined,
    @Body() dto: SyncUserDto,
  ) {
    const expected = this.configService.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!expected || token !== expected) {
      throw new ForbiddenException('Invalid internal token');
    }

    return this.userService.syncFromAuth(dto);
  }
}
