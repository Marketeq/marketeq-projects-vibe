import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from './skills.entity';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../user/enums/user-role.enum';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(userId: string, dto: CreateSkillDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    const skill = this.skillRepository.create({
      ...dto,
      userId,
    });

    return this.skillRepository.save(skill);
  }

  async assertCanManageSkills(actorUserId: string, targetUserId: string) {
    if (actorUserId === targetUserId) {
      return;
    }

    const actor = await this.userRepository.findOne({
      where: { id: actorUserId },
      select: ['id', 'role'],
    });

    if (!actor) {
      throw new NotFoundException('User not found');
    }

    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You are not allowed to create skills for this user',
      );
    }
  }

  async findByUser(userId: string) {
    return this.skillRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async searchNames(search?: string, limit = 10): Promise<string[]> {
    const normalizedSearch = (search ?? '').trim().toLowerCase();
    const safeLimit = Math.max(1, Math.min(50, limit));

    const query = this.skillRepository
      .createQueryBuilder('skill')
      .select('DISTINCT skill.name', 'name')
      .orderBy('skill.name', 'ASC')
      .limit(safeLimit);

    if (normalizedSearch) {
      query.where('LOWER(skill.name) LIKE :search', {
        search: `%${normalizedSearch}%`,
      });
    }

    const rows = await query.getRawMany<{ name: string }>();

    const dedupedByCaseInsensitiveName = new Map<string, string>();
    for (const row of rows) {
      const name = row.name?.trim();
      if (!name) {
        continue;
      }

      const key = name.toLowerCase();
      if (!dedupedByCaseInsensitiveName.has(key)) {
        dedupedByCaseInsensitiveName.set(key, name);
      }
    }

    return Array.from(dedupedByCaseInsensitiveName.values()).slice(0, safeLimit);
  }

  async update(userId: string, id: string, dto: UpdateSkillDto) {
    // Scope to userId so users cannot modify other users' skills.
    const skill = await this.skillRepository.findOne({ where: { id, userId } });
    if (!skill) throw new NotFoundException('Skill not found');

    Object.assign(skill, dto);
    return this.skillRepository.save(skill);
  }

  async remove(userId: string, id: string) {
    const skill = await this.skillRepository.findOne({ where: { id, userId } });
    if (!skill) throw new NotFoundException('Skill not found');

    await this.skillRepository.remove(skill);
    return { message: 'Skill deleted' };
  }
}
