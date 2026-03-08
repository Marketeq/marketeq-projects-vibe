import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminSettings } from '../entities/admin-settings.entity';
import { UserPreferences } from '../entities/user-preferences.entity';
import { UpdateAdminSettingsDto, UpdateUserPreferencesDto } from '../dtos/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AdminSettings)
    private readonly settingsRepo: Repository<AdminSettings>,
    @InjectRepository(UserPreferences)
    private readonly prefsRepo: Repository<UserPreferences>,
  ) {}

  async getAdminSettings(scopeId: string): Promise<AdminSettings> {
    let settings = await this.settingsRepo.findOneBy({ scopeId });
    if (!settings) {
      settings = this.settingsRepo.create({ scopeId });
      await this.settingsRepo.save(settings);
    }
    return settings;
  }

  async updateAdminSettings(scopeId: string, dto: UpdateAdminSettingsDto): Promise<AdminSettings> {
    let settings = await this.settingsRepo.findOneBy({ scopeId });
    if (!settings) {
      settings = this.settingsRepo.create({ scopeId, ...dto });
    } else {
      Object.assign(settings, dto);
    }
    return this.settingsRepo.save(settings);
  }

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    let prefs = await this.prefsRepo.findOneBy({ userId });
    if (!prefs) {
      prefs = this.prefsRepo.create({ userId });
      await this.prefsRepo.save(prefs);
    }
    return prefs;
  }

  async updateUserPreferences(userId: string, dto: UpdateUserPreferencesDto): Promise<UserPreferences> {
    let prefs = await this.prefsRepo.findOneBy({ userId });
    if (!prefs) {
      prefs = this.prefsRepo.create({ userId, ...dto });
    } else {
      Object.assign(prefs, dto);
    }
    return this.prefsRepo.save(prefs);
  }
}
