import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { SettingsService } from '../services/settings.service';
import { UpdateAdminSettingsDto, UpdateUserPreferencesDto } from '../dtos/update-settings.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** Admin: get settings for a scope (orgId or contractId) */
  @Get('admin/:scopeId')
  @UseGuards(RolesGuard('admin'))
  async getAdminSettings(@Param('scopeId') scopeId: string) {
    return this.settingsService.getAdminSettings(scopeId);
  }

  /** Admin: update settings for a scope */
  @Put('admin/:scopeId')
  @UseGuards(RolesGuard('admin'))
  async updateAdminSettings(
    @Param('scopeId') scopeId: string,
    @Body() dto: UpdateAdminSettingsDto,
  ) {
    return this.settingsService.updateAdminSettings(scopeId, dto);
  }

  /** User: get own time/date preferences */
  @Get('preferences')
  async getPreferences(@Req() req: any) {
    return this.settingsService.getUserPreferences(req.user.sub);
  }

  /** User: update own time/date preferences */
  @Put('preferences')
  async updatePreferences(@Req() req: any, @Body() dto: UpdateUserPreferencesDto) {
    return this.settingsService.updateUserPreferences(req.user.sub, dto);
  }
}
