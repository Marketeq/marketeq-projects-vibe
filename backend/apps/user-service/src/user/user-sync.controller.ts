import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
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

  private validateInternalToken(token: string | undefined) {
    const expected = this.configService.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!expected || token !== expected) {
      throw new ForbiddenException('Invalid internal token');
    }
  }

  @ApiOperation({ summary: 'Sync user' })
  @Post()
  syncUser(
    @Headers('x-internal-token') token: string | undefined,
    @Body() dto: SyncUserDto,
  ) {
    this.validateInternalToken(token);
    return this.userService.syncFromAuth(dto);
  }

  @ApiOperation({ summary: 'Get internal user summary' })
  @Get(':id/summary')
  getUserSummary(
    @Headers('x-internal-token') token: string | undefined,
    @Param('id') id: string,
  ) {
    this.validateInternalToken(token);
    return this.userService.getInternalSummary(id);
  }

  @ApiOperation({ summary: 'Get internal user summary by email' })
  @Get('summary-by-email')
  getUserSummaryByEmail(
    @Headers('x-internal-token') token: string | undefined,
    @Query('email') email: string,
  ) {
    this.validateInternalToken(token);
    return this.userService.getInternalSummaryByEmail(email);
  }

  @ApiOperation({ summary: 'Dismiss onboarding for a user (internal)' })
  @Patch(':id/onboarding-dismissed')
  dismissOnboarding(
    @Headers('x-internal-token') token: string | undefined,
    @Param('id') id: string,
  ) {
    this.validateInternalToken(token);
    return this.userService.dismissOnboarding(id);
  }
}
