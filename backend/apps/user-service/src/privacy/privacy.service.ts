import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrivacySettings } from './entities/privacy-settings.entity';
import { UpdatePrivacyDto } from './dtos/update-privacy.dto';

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    @InjectRepository(PrivacySettings)
    private readonly repo: Repository<PrivacySettings>,
  ) {}

  async getByUserId(userId: string): Promise<PrivacySettings> {
    let settings = await this.repo.findOne({ where: { userId } });
    if (!settings) {
      settings = this.repo.create({ userId, talent: null, client: null });
      settings = await this.repo.save(settings);
    }
    return settings;
  }

  async update(
    userId: string,
    dto: UpdatePrivacyDto,
  ): Promise<PrivacySettings> {
    let settings = await this.getByUserId(userId);

    if (dto.talent) {
      settings.talent = { ...(settings.talent ?? {}), ...dto.talent };
    }
    if (dto.client) {
      settings.client = { ...(settings.client ?? {}), ...dto.client };
    }

    settings = await this.repo.save(settings);
    this.logger.log(`Privacy settings updated for user ${userId}`);
    return settings;
  }

  async reset(userId: string): Promise<PrivacySettings> {
    let settings = await this.getByUserId(userId);
    settings.talent = null;
    settings.client = null;
    settings = await this.repo.save(settings);
    this.logger.log(`Privacy settings reset to defaults for user ${userId}`);
    return settings;
  }
}
