import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserService } from './user.service';
import { JwtUser } from '../auth/types/jwt-user.type';
import { OnboardingDismissedDto } from './dtos/onboarding-dismissed.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { RefreshTimezoneDto } from './dtos/refresh-timezone.dto';

@ApiTags('User')
@Controller('user')
export class UserSelfController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Get current user' })
  @Get('me')
  getMe(@CurrentUser() user: JwtUser) {
    return this.userService.getUserByClaims(user);
  }

  @ApiOperation({ summary: 'Dismiss onboarding after first login' })
  @Patch('onboarding-dismissed')
  dismissOnboarding(
    @CurrentUser() user: JwtUser,
    @Body() dto: OnboardingDismissedDto,
  ) {
    return this.userService
      .getUserByClaims(user)
      .then((resolved) => this.userService.dismissOnboarding(resolved.id, dto.role));
  }

  @ApiOperation({ summary: 'Refresh user timezone from client timezone or request IP' })
  @Patch('refresh-timezone')
  refreshTimezone(
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
    @Body() dto: RefreshTimezoneDto,
  ) {
    return this.userService.refreshTimezone(user, req, dto.clientTimeZone);
  }
}
