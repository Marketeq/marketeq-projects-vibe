import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { Experience } from './experience.entity';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../user/enums/user-role.enum';

@Injectable()
export class ExperienceService {
  constructor(
    @InjectRepository(Experience)
    private readonly experienceRepository: Repository<Experience>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(userId: string, dto: CreateExperienceDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const experience = this.experienceRepository.create(dto);
    experience.userId = userId;
    return this.experienceRepository.save(experience);
  }

  async assertCanManageExperience(actorUserId: string, targetUserId: string) {
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
        'You are not allowed to create experience for this user',
      );
    }
  }

  async findAll(userId: string) {
    const experiences = await this.experienceRepository.find({
      where: {
        userId,
      },
      order: { startDate: 'DESC' },
    });

    // Derive total years of experience from earliest start date
    let yearsOfExperience: number | undefined;
    const earliest = experiences.reduce<Date | undefined>((min, exp) => {
      const start = exp.startDate ? new Date(exp.startDate) : undefined;
      if (!start) return min;
      if (!min || start < min) return start;
      return min;
    }, undefined);

    if (earliest) {
      const diffMs = Date.now() - earliest.getTime();
      yearsOfExperience = Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 365));
      yearsOfExperience = Math.round(yearsOfExperience * 10) / 10; // one decimal
    }

    return { experiences, yearsOfExperience };
  }

  async searchTitles(search?: string, limit = 10): Promise<string[]> {
    const normalizedSearch = (search ?? '').trim().toLowerCase();
    const safeLimit = Math.max(1, Math.min(50, limit));

    const query = this.experienceRepository
      .createQueryBuilder('experience')
      .select('DISTINCT experience.title', 'title')
      .orderBy('experience.title', 'ASC')
      .limit(safeLimit);

    if (normalizedSearch) {
      query.where('LOWER(experience.title) LIKE :search', {
        search: `%${normalizedSearch}%`,
      });
    }

    const rows = await query.getRawMany<{ title: string }>();

    const dedupedByCaseInsensitiveTitle = new Map<string, string>();
    for (const row of rows) {
      const title = row.title?.trim();
      if (!title) {
        continue;
      }

      const key = title.toLowerCase();
      if (!dedupedByCaseInsensitiveTitle.has(key)) {
        dedupedByCaseInsensitiveTitle.set(key, title);
      }
    }

    return Array.from(dedupedByCaseInsensitiveTitle.values()).slice(
      0,
      safeLimit,
    );
  }

  async findOne(userId: string, id: string) {
    const experience = await this.experienceRepository.findOne({
      where: { id, userId },
      relations: [],
    });

    if (!experience) {
      throw new NotFoundException('Experience not found');
    }

    return experience;
  }

  async update(userId: string, id: string, dto: UpdateExperienceDto) {
    const experience = await this.experienceRepository.findOne({
      where: { id, userId },
    });

    if (!experience) {
      throw new NotFoundException('Experience not found');
    }

    Object.assign(experience, {
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : experience.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : experience.endDate,
    });

    return this.experienceRepository.save(experience);
  }

  async remove(userId: string, id: string) {
    const experience = await this.findOne(userId, id);
    await this.experienceRepository.remove(experience);
    return { message: 'Experience deleted' };
  }
}
