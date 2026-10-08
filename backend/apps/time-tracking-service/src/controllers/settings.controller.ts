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
import { SettingsService } from '../services/settings.service';
import { UpdateAdminSettingsDto, UpdateUserPreferencesDto } from '../dtos/update-settings.dto';
import { ContractAccessService, actorOf } from '../contracts/contract-access.service';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly access: ContractAccessService,
  ) {}

  /**
   * Screenshot permission settings for a contract. Both sides read them —
   * the talent's UI hides actions the client has turned off.
   */
  @Get('admin/:scopeId')
  async getAdminSettings(@Param('scopeId') scopeId: string, @Req() req: any) {
    await this.access.assertPartyOf(actorOf(req), scopeId);
    return this.settingsService.getAdminSettings(scopeId);
  }

  /** Only the contract's client (or a platform admin) changes them. */
  @Put('admin/:scopeId')
  async updateAdminSettings(
    @Param('scopeId') scopeId: string,
    @Req() req: any,
    @Body() dto: UpdateAdminSettingsDto,
  ) {
    await this.access.assertClientOf(actorOf(req), scopeId);
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
