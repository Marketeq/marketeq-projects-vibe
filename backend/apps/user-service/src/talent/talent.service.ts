import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../user/entities/user.entity';
import { CreateTalentDto } from './dto/create-talent.dto';
import { R2Service } from '../storage/r2.service';
import { Skill } from '../skills/skills.entity';
import { Experience } from '../experience/experience.entity';

@Injectable()
export class TalentService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    @InjectRepository(Experience)
    private readonly experienceRepository: Repository<Experience>,
    private readonly r2Service: R2Service,
  ) {}

  async createTalent(
    userId: string,
    dto: CreateTalentDto,
    avatar?: Express.Multer.File,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

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
      const upload = await this.r2Service.uploadAvatar(userId, avatar);
      avatarUrl = upload.url ?? avatarUrl;
    }

    Object.assign(user, {
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

    const updated = await this.userRepository.save(user);

    return { user: updated };
  }

  async getUserByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) throw new NotFoundException('User not found');

    // Load related skills and experiences
    const [skills, experiences] = await Promise.all([
      this.skillRepository.find({ where: { userId: user.id } }),
      this.experienceRepository.find({
        where: { userId: user.id },
        order: { startDate: 'ASC' },
      }),
    ]);

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
