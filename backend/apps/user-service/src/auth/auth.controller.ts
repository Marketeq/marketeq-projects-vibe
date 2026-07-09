import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ApiOperation } from '@nestjs/swagger';
import { UserService } from '../user/user.service';
import { OnboardingDismissedDto } from '../user/dtos/onboarding-dismissed.dto';
import { RefreshTimezoneDto } from '../user/dtos/refresh-timezone.dto';
import { JwtUser } from './types/jwt-user.type';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Get current user' })
  @Get('me')
  getProfile(@CurrentUser() user: JwtUser) {
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
