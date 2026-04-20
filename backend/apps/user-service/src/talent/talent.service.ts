import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { User } from '../user/entities/user.entity';
import { CreateTalentDto } from './dto/create-talent.dto';
import { R2Service } from '../storage/r2.service';
import { Skill } from '../skills/skills.entity';
import { Experience } from '../experience/experience.entity';
import { UserService } from '../user/user.service';

@Injectable()
export class TalentService {
  private readonly logger = new Logger(TalentService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    @InjectRepository(Experience)
    private readonly experienceRepository: Repository<Experience>,
    private readonly r2Service: R2Service,
    private readonly userService: UserService,
  ) {}

  async createTalent(
    userClaims: { id: string; email?: string },
    dto: CreateTalentDto,
    avatar?: Express.Multer.File,
  ) {
    // Resolve the user row using the same fallback strategy as ClientService:
    // first by id, then by email (handles legacy rows where the auth-service
    // user id was regenerated), and finally by syncing from auth-service for
    // brand-new users who have authenticated but never hit a user-service
    // endpoint yet. This prevents a spurious NotFoundException for users who
    // exist in auth-service but not here.
    let user = await this.userRepository.findOne({
      where: { id: userClaims.id },
    });
    if (!user && userClaims.email) {
      user = await this.userRepository.findOne({
        where: { email: userClaims.email },
      });
    }
    if (!user && userClaims.id && userClaims.email) {
      await this.userService.syncFromAuth({
        id: userClaims.id,
        email: userClaims.email,
      });
      user = await this.userRepository.findOne({
        where: { id: userClaims.id },
      });
    }
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const userId = user.id;

    const existingUsername = dto.username
      ? await this.userRepository.findOne({
          where: { username: dto.username },
        })
      : null;

    if (existingUsername && existingUsername.id !== userId) {
      throw new ConflictException('Username already exists');
    }

    let avatarUrl = user.avatarUrl;
    if (avatar) {
      try {
        const upload = await this.r2Service.uploadAvatar(userId, avatar);
        avatarUrl = upload.url ?? avatarUrl;
      } catch (error) {
        // Keep profile creation non-blocking when object storage is down/misconfigured.
        this.logger.warn(
          `Avatar upload failed for user ${userId}; continuing without avatar update: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }

    Object.assign(user, {
      userType: 'talent',
      avatarUrl,
      ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
      ...(dto.username !== undefined ? { username: dto.username } : {}),
      ...(dto.location !== undefined ? { location: dto.location } : {}),
      ...(dto.language !== undefined ? { language: dto.language } : {}),
      ...(dto.recentJobTitle !== undefined
        ? { recentJobTitle: dto.recentJobTitle }
        : {}),
      ...(dto.industriesWorkedIn !== undefined
        ? { industriesWorkedIn: dto.industriesWorkedIn }
        : {}),
      ...(dto.lookingToWorkWith !== undefined
        ? { lookingToWorkWith: dto.lookingToWorkWith }
        : {}),
      ...(dto.projectTypes !== undefined ? { projectTypes: dto.projectTypes } : {}),
      ...(dto.isStudent !== undefined ? { isStudent: dto.isStudent } : {}),
      ...(dto.availability !== undefined ? { availability: dto.availability } : {}),
      ...(dto.customAvailability !== undefined
        ? { customAvailability: dto.customAvailability }
        : {}),
    });

    let updated: User;
    try {
      updated = await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const driverError = error.driverError as {
          code?: string;
          detail?: string;
          constraint?: string;
        };

        if (
          driverError?.code === '23505' ||
          `${driverError?.constraint ?? ''}`.includes('username')
        ) {
          throw new ConflictException('Username already exists');
        }
      }

      throw error;
    }

    return { user: updated };
  }

  /**
   * Public listing of talent users for browse pages (homepage, /talent,
   * /c/<category>). Returns the minimal projection the talent card needs:
   * basic profile + first skills (so the card can render its skill row
   * without N+1 queries from the frontend). Excludes users with no avatar
   * so cards never fall back to the placeholder.
   */
  async listTalentUsers(limit = 24): Promise<any[]> {
    const users = await this.userRepository.find({
      where: { userType: 'talent' },
      take: limit,
      order: { onboardedAt: 'DESC' },
    });

    if (users.length === 0) return [];

    const ids = users.map((u) => u.id);
    const allSkills = await this.skillRepository.find({
      where: ids.map((id) => ({ userId: id })),
      select: { id: true, name: true, userId: true } as any,
    });

    const skillsByUser = new Map<string, string[]>();
    for (const s of allSkills) {
      if (!s.name) continue;
      const list = skillsByUser.get(s.userId) ?? [];
      list.push(s.name);
      skillsByUser.set(s.userId, list);
    }

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      avatarUrl: u.avatarUrl,
      userType: u.userType,
      location: u.location,
      rateMin: u.rateMin,
      rateMax: u.rateMax,
      jobTitles: u.jobTitles,
      recentJobTitle: u.recentJobTitle,
      skills: (skillsByUser.get(u.id) ?? []).map((name) => ({ name })),
    }));
  }

  async getUserByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    // Load related skills and experiences. Both tables have historically
    // drifted from the entity definitions in this schema (missing
    // createdAt/updatedAt columns on skills; experiences table not yet
    // migrated), so tolerate those failures and return what we have
    // instead of 500-ing the entire profile fetch.
    const skills = await this.skillRepository
      .find({
        where: { userId: user.id },
        select: { id: true, name: true, proficiency: true, userId: true } as any,
      })
      .catch((err) => {
        this.logger.warn(
          `skills fetch failed for user ${user.id}: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
        return [] as any[];
      });
    const experiences = await this.experienceRepository
      .find({
        where: { userId: user.id },
        order: { startDate: 'ASC' },
      })
      .catch((err) => {
        this.logger.warn(
          `experiences fetch failed for user ${user.id}: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
        return [] as any[];
      });

    // Flatten skills to simple string names for the frontend card
    const skillNames = skills
      .map((s) => s.name)
      .filter((name) => typeof name === 'string' && name.length > 0);

    // Derive simple aggregates for the talent card
    const projects = experiences.length;
    let yearsOfExperience: number | undefined;
    const firstStart = experiences.find((exp) => exp.startDate)?.startDate;
    if (firstStart) {
      const now = new Date();
      const diffMs = now.getTime() - new Date(firstStart).getTime();
      yearsOfExperience = Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 365));
      yearsOfExperience = Math.round(yearsOfExperience * 10) / 10; // one decimal
    }
    // Always include the field so the UI can render it (0 if no start date but has experiences)
    if (yearsOfExperience === undefined && experiences.length > 0) {
      yearsOfExperience = 0;
    }

    return {
      ...user,
      skills: skillNames,
      experiences,
      projects,
      yearsOfExperience,
    } as unknown as User;
  }
}
