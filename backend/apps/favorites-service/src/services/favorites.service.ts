import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite, FavoriteType } from '../entities/favorite.entity';
import { FavoriteGroup } from '../entities/favorite-group.entity';
import { CreateFavoriteDto, CreateGroupDto, UpdateFavoriteDto } from '../dto/create-favorite.dto';
import { AiService } from './ai.service';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favRepo: Repository<Favorite>,
    @InjectRepository(FavoriteGroup)
    private readonly groupRepo: Repository<FavoriteGroup>,
    private readonly aiService: AiService,
  ) {}

  async createGroup(dto: CreateGroupDto, userId: string): Promise<FavoriteGroup> {
    return this.groupRepo.save(this.groupRepo.create({ name: dto.name, userId }));
  }

  async getGroups(userId: string): Promise<FavoriteGroup[]> {
    return this.groupRepo.find({
      where: { userId },
      relations: ['favorites'],
      order: { createdAt: 'ASC' },
    });
  }

  async deleteGroup(groupId: string, userId: string): Promise<void> {
    const group = await this.groupRepo.findOne({ where: { id: groupId, userId } });
    if (!group) throw new NotFoundException('Group not found');
    await this.groupRepo.remove(group);
  }

  async create(dto: CreateFavoriteDto, userId: string): Promise<Favorite> {
    let groupId = dto.groupId;

    if (!groupId) {
      const group = await this.aiService.assignGroup(userId, dto.type);
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

    return this.favRepo.save(
      this.favRepo.create({ userId, groupId, type: dto.type, itemId: dto.itemId }),
    );
  }

  async findAll(userId: string, type?: FavoriteType): Promise<Favorite[]> {
    const where: any = { userId };
    if (type) where.type = type;
    return this.favRepo.find({ where, order: { createdAt: 'DESC' } });
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
