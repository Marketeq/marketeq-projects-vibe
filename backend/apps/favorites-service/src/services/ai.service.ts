import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { FavoriteGroup } from '../entities/favorite-group.entity';
import { FavoriteType } from '../entities/favorite.entity';

const TYPE_GROUP_NAMES: Record<FavoriteType, string> = {
  [FavoriteType.TALENT]: 'Saved Talent',
  [FavoriteType.PROJECT]: 'Saved Projects',
  [FavoriteType.SERVICE]: 'Saved Services',
  [FavoriteType.JOB]: 'Saved Jobs',
  [FavoriteType.TEAM]: 'Saved Teams',
};

@Injectable()
export class AiService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(FavoriteGroup)
    private readonly groupRepo: Repository<FavoriteGroup>,
  ) {}

  async assignGroup(userId: string, type: FavoriteType): Promise<FavoriteGroup> {
    const defaultName = TYPE_GROUP_NAMES[type];

    // Try to find existing group of same type
    const existing = await this.groupRepo.findOne({
      where: { userId, name: defaultName },
    });
    if (existing) return existing;

    // Use Hugging Face if configured, otherwise use heuristic default
    const hfKey = this.config.get<string>('HUGGINGFACE_API_KEY');
    const groupName = hfKey
      ? await this.getSemanticGroupName(type, hfKey)
      : defaultName;

    return this.groupRepo.save(this.groupRepo.create({ name: groupName, userId }));
  }

  private async getSemanticGroupName(type: FavoriteType, _apiKey: string): Promise<string> {
    // HuggingFace integration placeholder — returns heuristic name
    // In production: call sentence-transformers/all-MiniLM-L6-v2 and match to existing group embeddings
    return TYPE_GROUP_NAMES[type];
  }
}
