import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite, FavoriteType } from '../entities/favorite.entity';
import { FavoriteGroup } from '../entities/favorite-group.entity';
import { CreateFavoriteDto, CreateGroupDto, UpdateFavoriteDto } from '../dto/create-favorite.dto';
import { AiService } from './ai.service';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(
    @InjectRepository(Favorite)
    private readonly favRepo: Repository<Favorite>,
    @InjectRepository(FavoriteGroup)
    private readonly groupRepo: Repository<FavoriteGroup>,
    private readonly aiService: AiService,
  ) {}

  // ── Groups ──────────────────────────────────────────────

  async createGroup(dto: CreateGroupDto, userId: string): Promise<FavoriteGroup> {
    const existing = await this.groupRepo.findOne({ where: { userId, name: dto.name } });
    if (existing) throw new BadRequestException('A group with this name already exists');
    return this.groupRepo.save(this.groupRepo.create({ name: dto.name, userId }));
  }

  async getGroups(userId: string): Promise<FavoriteGroup[]> {
    return this.groupRepo.find({
      where: { userId },
      relations: ['favorites'],
      order: { createdAt: 'ASC' },
    });
  }

  async renameGroup(groupId: string, name: string, userId: string): Promise<FavoriteGroup> {
    const group = await this.groupRepo.findOne({ where: { id: groupId, userId } });
    if (!group) throw new NotFoundException('Group not found');
    const duplicate = await this.groupRepo.findOne({ where: { userId, name } });
    if (duplicate && duplicate.id !== groupId) throw new BadRequestException('A group with this name already exists');
    group.name = name;
    return this.groupRepo.save(group);
  }

  async deleteGroup(groupId: string, userId: string): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id: groupId, userId } });
    if (!group) throw new NotFoundException('Group not found');
    await this.groupRepo.remove(group);
  }

  // ── Favorites ───────────────────────────────────────────

  async create(dto: CreateFavoriteDto, userId: string): Promise<Favorite> {
    let groupId = dto.groupId;

    if (!groupId) {
      const group = await this.aiService.assignGroup(userId, dto.type, dto.itemId);
      groupId = group.id;
    } else {
      const groupExists = await this.groupRepo.findOne({ where: { id: groupId, userId } });
      if (!groupExists) throw new BadRequestException('Invalid groupId');
    }

    // Deduplicate
    const existing = await this.favRepo.findOne({
      where: { userId, type: dto.type, itemId: dto.itemId },
    });
    if (existing) return existing;

    this.logger.debug(`Creating favorite for user ${userId}: ${dto.type}/${dto.itemId}`);
    return this.favRepo.save(
      this.favRepo.create({ userId, groupId, type: dto.type, itemId: dto.itemId }),
    );
  }

  /**
   * GET /favorites — returns groups with nested favorites (per Integration Guide).
   * Optional type filter narrows which favorites appear inside each group.
   */
  async findAll(userId: string, type?: FavoriteType | FavoriteType[]): Promise<FavoriteGroup[]> {
    const groups = await this.groupRepo.find({
      where: { userId },
      relations: ['favorites'],
      order: { createdAt: 'ASC' },
    });

    if (type) {
      // Normalize type (gateway may send duplicated query params as array)
      const filterType = Array.isArray(type) ? type[0] : type;
      // Filter favorites within each group by type, drop empty groups
      return groups
        .map((g) => ({
          ...g,
          favorites: g.favorites.filter((f) => f.type === filterType),
        }))
        .filter((g) => g.favorites.length > 0) as FavoriteGroup[];
    }

    return groups;
  }

  async move(id: string, dto: UpdateFavoriteDto, userId: string): Promise<Favorite> {
    const fav = await this.favRepo.findOne({ where: { id, userId } });
    if (!fav) throw new NotFoundException('Favorite not found');

    const newGroup = await this.groupRepo.findOne({ where: { id: dto.groupId, userId } });
    if (!newGroup) throw new BadRequestException('Invalid groupId');

    fav.groupId = dto.groupId;
    return this.favRepo.save(fav);
  }

  async remove(id: string, userId: string): Promise<void> {
    const fav = await this.favRepo.findOne({ where: { id, userId } });
    if (!fav) throw new NotFoundException('Favorite not found');
    await this.favRepo.remove(fav);
  }
}
