import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteGroup } from '../entities/favorite-group.entity';
import { Favorite } from '../entities/favorite.entity';
import { CreateGroupDto } from '../dtos/create-group.dto';
import { UpdateGroupDto } from '../dtos/update-group.dto';
import { GroupResponseDto } from '../dtos/group-response.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(FavoriteGroup)
    private readonly groupRepo: Repository<FavoriteGroup>,
  ) {}

  async findAllByUser(
    userId: string,
    order: 'ASC' | 'DESC' = 'ASC',
    search?: string,
  ): Promise<GroupResponseDto[]> {
    const qb = this.groupRepo
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.favorites', 'favorite')
      .where('group.userId = :userId', { userId })
      .orderBy('group.createdAt', order);

    if (search && search.trim().length > 0) {
      qb.andWhere('group.name ILIKE :search', {
        search: `%${search.trim()}%`,
      });
    }

    const groups = await qb.getMany();
    return groups.map((g) => this.toGroupResponse(g));
  }

  async findOne(id: string, userId: string): Promise<GroupResponseDto> {
    const group = await this.findEntityOrFail(id, userId);
    return this.toGroupResponse(group);
  }

  async create(userId: string, dto: CreateGroupDto): Promise<GroupResponseDto> {
    const group = this.groupRepo.create({
      userId,
      name: dto.name,
      defaultType: dto.type,
    });
    const saved = await this.groupRepo.save(group);
    return this.toGroupResponse({ ...saved, favorites: [] } as FavoriteGroup);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateGroupDto,
  ): Promise<GroupResponseDto> {
    const group = await this.findEntityOrFail(id, userId);
    group.name = dto.name;
    const saved = await this.groupRepo.save(group);
    return this.toGroupResponse(saved);
  }

  async remove(id: string, userId: string): Promise<void> {
    const group = await this.findEntityOrFail(id, userId);
    await this.groupRepo.remove(group);
  }

  toGroupResponse(group: FavoriteGroup & { favorites?: Favorite[] }): GroupResponseDto {
    return {
      id: group.id,
      userId: group.userId,
      name: group.name,
      type: group.defaultType as any,
      createdAt: group.createdAt,
    };
  }

  private async findEntityOrFail(id: string, userId: string): Promise<FavoriteGroup> {
    const group = await this.groupRepo.findOne({
      where: { id, userId },
      relations: ['favorites'],
    });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    return group;
  }
}
