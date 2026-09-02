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

  @ApiOperation({ summary: 'Get preferred display currency (ES-06, internal)' })
  @Get(':id/currency-profile')
  async getCurrencyProfile(
    @Headers('x-internal-token') token: string | undefined,
    @Param('id') id: string,
  ) {
    this.validateInternalToken(token);
    const preferredCurrency = await this.userService.getPreferredCurrency(id);
    return { preferredCurrency };
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

  @ApiOperation({ summary: 'Sync user from CMS' })
  @Post(':id/cms-sync')
  syncFromCms(
    @Headers('x-internal-token') token: string | undefined,
    @Param('id') id: string,
    @Body() dto: any, // Using any for flexibility or CmsSyncUserDto if imported
  ) {
    this.validateInternalToken(token);
    const fs = require('fs');
    const logPath = '/Users/manu042k/Documents/Marketeq/marketeq-projects-vibe/backend/apps/user-service/sync.log';
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Received sync for user ${id}: ${JSON.stringify(dto)}\n`);
    
    // Map userType to role if needed, or just pass the data
    const updateData: any = { ...dto };
    if (dto.userType) {
      updateData.role = dto.userType;
      delete updateData.userType;
    }
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Final updateData: ${JSON.stringify(updateData)}\n`);
    return this.userService.update(id, updateData);
  }
}
