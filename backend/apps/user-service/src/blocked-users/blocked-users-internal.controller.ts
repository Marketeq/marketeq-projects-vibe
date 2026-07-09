import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { BlockedUsersService } from './blocked-users.service';

@ApiTags('blocked-users-internal')
@Public()
@Controller('internal/users')
export class BlockedUsersInternalController {
  constructor(
    private readonly blockedUsersService: BlockedUsersService,
    private readonly configService: ConfigService,
  ) {}

  private assertInternalToken(token: string | undefined) {
    const expected = this.configService.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!expected || token !== expected) {
      throw new ForbiddenException('Invalid internal token');
    }
  }

  @ApiOperation({ summary: 'Get pair-wise block status between two users' })
  @Get(':id/block-status')
  @HttpCode(HttpStatus.OK)
  async getPairStatus(
    @Headers('x-internal-token') token: string | undefined,
    @Param('id') id: string,
    @Query('with') otherId: string,
  ) {
    this.assertInternalToken(token);
    return this.blockedUsersService.getPairStatus(id, otherId);
  }

  @ApiOperation({ summary: 'List blocked user IDs for a given user' })
  @Get(':id/blocked-ids')
  @HttpCode(HttpStatus.OK)
  async listBlockedIds(
    @Headers('x-internal-token') token: string | undefined,
    @Param('id') id: string,
  ) {
    this.assertInternalToken(token);
    const ids = await this.blockedUsersService.listBlockedIds(id);
    return { blockedIds: ids };
  }
}
