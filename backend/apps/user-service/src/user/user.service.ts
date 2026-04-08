import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';

import { User } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { SyncUserDto } from './dtos/sync-user.dto';
import { UserRole } from './enums/user-role.enum';
import { UpdateAvailabilityDto } from './dtos/update-availability.dto';
import { AVAILABILITY } from '../talent/enum/availability.enum';
import {
  TimeZoneResolution,
  TimezoneResolutionService,
} from './timezone-resolution.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly timezoneResolutionService: TimezoneResolutionService,
  ) {}

  async createUser(dto: CreateUserDto): Promise<User> {
    // Build OR predicate without `{ username: undefined }`; otherwise TypeORM
    // matches every row where username IS NULL and the first username-less
    // user blocks all subsequent creates.
    const where: Array<Record<string, string>> = [{ email: dto.email }];
    if (dto.username) {
      where.push({ username: dto.username });
    }

    const existing = await this.userRepository.findOne({ where });

    if (existing) {
      throw new ConflictException('User already exists');
    }

    const user = this.userRepository.create(dto);
    return this.userRepository.save(user);
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getUserByClaims(claims: { sub?: string; id?: string; email?: string }): Promise<User> {
    const candidateId = claims.sub ?? claims.id;
    if (candidateId) {
      const byId = await this.userRepository.findOne({ where: { id: candidateId } });
      if (byId) {
        return byId;
      }
    }

    if (claims.email) {
      const byEmail = await this.userRepository.findOne({ where: { email: claims.email } });
      if (byEmail) {
        return byEmail;
      }
    }

    throw new NotFoundException('User not found');
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.getUserById(id);
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async updateAvailability(
    id: string,
    dto: UpdateAvailabilityDto,
  ): Promise<User> {
    return this.updateUser(id, {
      availability: dto.availability,
      customAvailability:
        dto.availability === AVAILABILITY.CUSTOM
          ? dto.customAvailability ?? null
          : null,
    });
  }

  async updateTimezone(id: string, timezone: string): Promise<User> {
    return this.updateUser(id, { timezone });
  }

  async refreshTimezone(
    claims: { sub?: string; id?: string; email?: string },
    req: Request,
    clientTimeZone?: string | null,
  ): Promise<TimeZoneResolution & { updated: boolean }> {
    const user = await this.getUserByClaims(claims);

    const resolution = this.timezoneResolutionService.resolve(
      req,
      clientTimeZone,
      user.timezone ?? null,
    );

    const updated = user.timezone !== resolution.timeZone;
    if (updated) {
      user.timezone = resolution.timeZone;
      await this.userRepository.save(user);
    }

    return {
      ...resolution,
      updated,
    };
  }

  async updateOverview(id: string, overview: string): Promise<User> {
    return this.updateUser(id, { overview });
  }

  async updateBio(id: string, bio: string): Promise<User> {
    return this.updateUser(id, { bio });
  }

  async updateRate(id: string, dto: { rateMin?: number; rateMax?: number }) {
    return this.updateUser(id, {
      rateMin: dto.rateMin,
      rateMax: dto.rateMax,
    });
  }

  async dismissOnboarding(id: string, role?: UserRole): Promise<User> {
    return this.updateUser(id, {
      onboardingDismissed: true,
      ...(role ? { role } : {}),
    });
  }

  async deactivateUser(id: string): Promise<void> {
    const user = await this.getUserById(id);
    user.isActive = false;
    await this.userRepository.save(user);
    return;
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.getUserById(id);
    await this.userRepository.remove(user);
  }
  async syncFromAuth(dto: SyncUserDto): Promise<User> {
    let normalizedIncomingUsername =
      typeof dto.username === 'string' ? dto.username.trim().toLowerCase() : undefined;
    // Treat empty/whitespace usernames as "unset" so we persist NULL/leave existing unchanged.
    if (normalizedIncomingUsername === '') normalizedIncomingUsername = undefined;
    const fallbackUsername = `user_${dto.id.replace(/-/g, '').slice(0, 12)}`;
    const resolvedRole = dto.role ?? UserRole.CLIENT;

    const existingById = await this.userRepository.findOne({
      where: { id: dto.id },
    });

    if (existingById) {
      Object.assign(existingById, {
        email: dto.email ?? existingById.email,
        role: resolvedRole ?? existingById.role,
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
      });
      if (normalizedIncomingUsername) {
        existingById.username = normalizedIncomingUsername;
      }
      return this.userRepository.save(existingById);
    }

    const existingByEmail = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingByEmail) {
      if (existingByEmail.id !== dto.id) {
        throw new ConflictException('User already exists with a different id');
      }
      Object.assign(existingByEmail, {
        role: resolvedRole ?? existingByEmail.role,
      });
      if (normalizedIncomingUsername) {
        existingByEmail.username = normalizedIncomingUsername;
      }
      return this.userRepository.save(existingByEmail);
    }

    const user = this.userRepository.create({
      id: dto.id,
      email: dto.email,
      username: normalizedIncomingUsername ?? fallbackUsername,
      role: resolvedRole,
      ...(dto.firstName && { firstName: dto.firstName }),
      ...(dto.lastName && { lastName: dto.lastName }),
    });

    return this.userRepository.save(user);
  }

  /* ── Aliases used by vibe controllers (me.controller, internal.controller) ── */

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    return this.getUserById(id);
  }

  async update(id: string, data: Record<string, any>): Promise<User> {
    return this.updateUser(id, data as any);
  }

  async create(data: Record<string, any>): Promise<User> {
    const user = this.userRepository.create(data as Partial<User>);
    return this.userRepository.save(user);
  }
}
