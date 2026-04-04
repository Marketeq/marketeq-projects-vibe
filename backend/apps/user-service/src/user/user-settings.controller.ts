import { Body, Controller, Delete, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UserService } from './user.service';
import { JwtUser } from '../auth/types/jwt-user.type';
import { UpdateAvailabilityDto } from './dtos/update-availability.dto';
import { UpdateBioDto } from './dtos/update-bio.dto';
import { UpdateOverviewDto } from './dtos/update-overview.dto';
import { UpdateRateDto } from './dtos/update-rate.dto';
import { UpdateTimezoneDto } from './dtos/update-timezone.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('User')
@Controller()
export class UserSettingsController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Update user availability' })
  @Put('availability')
  updateAvailability(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.userService.updateAvailability(user.sub, dto);
  }

  @ApiOperation({ summary: 'Update timezone' })
  @Put('timezone')
  updateTimezone(@CurrentUser() user: JwtUser, @Body() dto: UpdateTimezoneDto) {
    return this.userService.updateTimezone(user.sub, dto.timezone);
  }

  @ApiOperation({ summary: 'Update overview' })
  @Put('overview')
  updateOverview(@CurrentUser() user: JwtUser, @Body() dto: UpdateOverviewDto) {
    return this.userService.updateOverview(user.sub, dto.overview);
  }

  @ApiOperation({ summary: 'Update bio' })
  @Put('bio')
  updateBio(@CurrentUser() user: JwtUser, @Body() dto: UpdateBioDto) {
    return this.userService.updateBio(user.sub, dto.bio);
  }

  @ApiOperation({ summary: 'Update rate' })
  @Put('rate')
  updateRate(@CurrentUser() user: JwtUser, @Body() dto: UpdateRateDto) {
    return this.userService.updateRate(user.sub, dto);
  }

  @ApiOperation({ summary: 'Update job title' })
  @Put('job-title')
  updateJobTitle(
    @CurrentUser() user: JwtUser,
    @Body() dto: { recentJobTitle: string },
  ) {
    return this.userService.updateUser(user.sub, {
      recentJobTitle: dto.recentJobTitle,
    });
  }

  @ApiOperation({ summary: 'Update avatar URL' })
  @Put('avatar')
  updateAvatar(
    @CurrentUser() user: JwtUser,
    @Body() dto: { avatarUrl: string },
  ) {
    return this.userService.updateUser(user.sub, { avatarUrl: dto.avatarUrl });
  }

  @ApiOperation({ summary: 'Remove avatar' })
  @Delete('avatar')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAvatar(@CurrentUser() user: JwtUser) {
    return this.userService.updateUser(user.sub, { avatarUrl: undefined });
  }
}
