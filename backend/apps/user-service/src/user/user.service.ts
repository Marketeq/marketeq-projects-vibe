import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
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
    const existing = await this.userRepository.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });

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

  async getInternalSummary(id: string): Promise<{
    id: string;
    email: string;
    role: UserRole;
    onboardingDismissed: boolean;
    hasCompletedOnboarding: boolean;
    hasPassword: boolean;
    isActive: boolean;
  }> {
    const user = await this.getUserById(id);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      onboardingDismissed: user.onboardingDismissed,
      hasCompletedOnboarding: user.onboardingDismissed,
      hasPassword: user.hasPassword,
      isActive: user.isActive,
    };
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

  async updateRate(id: string, dto: { rate_min?: number; rate_max?: number }) {
    return this.updateUser(id, {
      rate_min: dto.rate_min,
      rate_max: dto.rate_max,
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

    const existingById = await this.userRepository.findOne({
      where: { id: dto.id },
    });

    if (existingById) {
      Object.assign(existingById, {
        email: dto.email ?? existingById.email,
        role: dto.role ?? existingById.role,
        provider: dto.provider ?? existingById.provider,
        hasPassword:
          typeof dto.hasPassword === 'boolean'
            ? dto.hasPassword
            : existingById.hasPassword,
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
        role: dto.role ?? existingByEmail.role,
        provider: dto.provider ?? existingByEmail.provider,
        hasPassword:
          typeof dto.hasPassword === 'boolean'
            ? dto.hasPassword
            : existingByEmail.hasPassword,
      });
      if (normalizedIncomingUsername) {
        existingByEmail.username = normalizedIncomingUsername;
      }
      return this.userRepository.save(existingByEmail);
    }

    const user = this.userRepository.create({
      id: dto.id,
      email: dto.email,
      // Username is allowed to be unset; only persist it when provided and non-empty.
      username: normalizedIncomingUsername ?? null,
      password: randomBytes(24).toString('hex'),
      role: dto.role,
      provider: dto.provider ?? 'EMAIL',
      hasPassword: dto.hasPassword ?? false,
    });

    return this.userRepository.save(user);
  }
}
