import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';

import { User } from '../user/entities/user.entity';
import { CreateTalentDto } from './dto/create-talent.dto';
import { R2Service } from '../storage/r2.service';
import { Skill } from '../skills/skills.entity';
import { Experience } from '../experience/experience.entity';
import { Education } from '../education/education.entity';
import { Certification } from '../certifications/certifications.entity';
import { Industry } from '../industries/industries.entity';
import { Language } from '../languages/languages.entity';
import { UserService } from '../user/user.service';
import { Portfolio } from '../portfolio/portfolio.entity';
import { TalentProfile } from '../talent-profile/entities/talent-profile.entity';
import { TalentGateStateService, openTalentSql } from '../identity-gate/talent-gate-state.service';

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
    @InjectRepository(Education)
    private readonly educationRepository: Repository<Education>,
    @InjectRepository(Certification)
    private readonly certificationRepository: Repository<Certification>,
    @InjectRepository(Industry)
    private readonly industryRepository: Repository<Industry>,
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    @InjectRepository(TalentProfile)
    private readonly talentProfileRepository: Repository<TalentProfile>,
    private readonly r2Service: R2Service,
    private readonly userService: UserService,
    private readonly gateState: TalentGateStateService,
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
    // G1: only talent whose gate is open reach the marketplace browse list. The gate is part of
    // the query itself (a semi-join on the locally kept last-known gate state), so it is applied
    // BEFORE the limit: the first `limit` rows are already the first `limit` visible talent,
    // however many hidden accounts come first, in the original order, in ONE query. No talent is
    // loaded just to be tested, and identity-verification-service is not called. An account whose
    // state was never received has no row and is not listed. A viewer's own verification state
    // plays no part here. If the state table cannot be read, nobody is listed (never everybody).
    let visibleIds: string[] = [];
    try {
      const rows = await this.userRepository
        .createQueryBuilder('u')
        .select(['u.id'])
        .where('u.userType = :userType', { userType: 'talent' })
        .andWhere(openTalentSql('u.id'))
        .orderBy('u.onboardedAt', 'DESC')
        .addOrderBy('u.id', 'ASC')
        .take(limit)
        .getMany();
      visibleIds = rows.map((u) => u.id);
    } catch (err) {
      if (!this.gateState.isUnreadable(err)) throw err;
      this.gateState.warnUnreadable('the talent browse list', err);
      return [];
    }
    const loaded = visibleIds.length
      ? await this.userRepository.find({ where: { id: In(visibleIds) } })
      : [];
    const byId = new Map(loaded.map((u) => [u.id, u]));
    const users = visibleIds.map((id) => byId.get(id)).filter((u): u is User => Boolean(u));

    if (users.length === 0) return [];

    const ids = users.map((u) => u.id);
    const usernames = users.map((u) => u.username).filter(Boolean) as string[];

    const [allSkills, allExperiences, allPortfolios, allProfiles] = await Promise.all([
      this.skillRepository.find({
        where: ids.map((id) => ({ userId: id })),
        select: { id: true, name: true, userId: true } as any,
      }),
      this.experienceRepository.find({
        where: ids.map((id) => ({ userId: id })),
      }),
      this.portfolioRepository.find({
        where: ids.map((id) => ({ userId: id })),
        select: { id: true, userId: true } as any,
      }),
      usernames.length > 0
        ? this.talentProfileRepository.find({
            where: usernames.map((username) => ({ username })),
          })
        : Promise.resolve([]),
    ]).catch((err) => {
      this.logger.warn(`Bulk fetch failed: ${err.message}`);
      return [[], [], [], []] as any;
    });

    const skillsByUser = new Map<string, string[]>();
    for (const s of allSkills) {
      if (!s.name) continue;
      const list = skillsByUser.get(s.userId) ?? [];
      list.push(s.name);
      skillsByUser.set(s.userId, list);
    }

    const experiencesByUser = new Map<string, Experience[]>();
    for (const exp of allExperiences) {
      const list = experiencesByUser.get(exp.userId) ?? [];
      list.push(exp);
      experiencesByUser.set(exp.userId, list);
    }

    const portfoliosByUser = new Map<string, number>();
    for (const p of allPortfolios) {
      const count = portfoliosByUser.get(p.userId) ?? 0;
      portfoliosByUser.set(p.userId, count + 1);
    }

    const profilesByUsername = new Map<string, TalentProfile>();
    for (const prof of allProfiles) {
      profilesByUsername.set(prof.username, prof);
    }

    return users.map((u) => {
      const userExps = experiencesByUser.get(u.id) ?? [];
      const portfolioCount = portfoliosByUser.get(u.id) ?? 0;
      const profile = u.username ? profilesByUsername.get(u.username) : null;

      // Use profile-based project count if available, otherwise fallback to max of experiences/portfolios
      const projects =
        profile?.totalProjectsCompleted ??
        Math.max(userExps.length, portfolioCount);

      let yearsOfExperience: number | undefined;

      // Calculate years of experience from standalone experience table OR profile JSONB
      const combinedExps = [...userExps];
      if (profile?.workExperience) {
        for (const we of profile.workExperience) {
          if (we.startDate) {
            combinedExps.push({ startDate: new Date(we.startDate) } as any);
          }
        }
      }

      const sortedExps = combinedExps
        .filter((e) => e.startDate)
        .sort((a, b) => {
          const d1 = a.startDate ? new Date(a.startDate).getTime() : 0;
          const d2 = b.startDate ? new Date(b.startDate).getTime() : 0;
          return d1 - d2;
        });

      const firstStart = sortedExps[0]?.startDate;

      if (firstStart) {
        const now = new Date();
        const diffMs = now.getTime() - new Date(firstStart).getTime();
        yearsOfExperience = Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 365));
        yearsOfExperience = Math.round(yearsOfExperience * 10) / 10;
      }

      return {
        id: u.id,
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        avatarUrl: u.avatarUrl,
        userType: u.userType,
        location: profile?.location || u.location,
        rate: profile?.rate || u.rate,
        availability: profile?.availability || u.availability,
        jobTitles: u.jobTitles,
        recentJobTitle: u.recentJobTitle,
        headline: (profile?.jobTitles as any[])?.[0]?.jobTitle ?? null,
        timezone: profile?.timezone,
        rating: profile?.rating || 4.7, // fallback to 4.7 if no rating yet
        skills: (() => {
          // Prefer standalone skill table; fall back to profile JSONB skills
          const tableSkills = skillsByUser.get(u.id) ?? [];
          if (tableSkills.length > 0) {
            return tableSkills.map((name) => ({ name }));
          }
          // profile.skills may be { name: string }[] or string[] depending on how the CMS stored it
          const profileSkills = profile?.skills ?? [];
          return profileSkills.map((s: any) =>
            typeof s === 'string' ? { name: s } : { name: s.name ?? String(s) },
          );
        })(),
        projects,
        yearsOfExperience,
      };
    });
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

    const portfolioItems = await this.portfolioRepository
      .find({
        where: { userId: user.id },
      })
      .catch((err) => {
        this.logger.warn(
          `portfolio fetch failed for user ${user.id}: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
        return [] as any[];
      });

    const educations = await this.educationRepository
      .find({
        where: { userId: user.id },
        order: { startYear: 'ASC' },
      })
      .catch((err) => {
        this.logger.warn(
          `educations fetch failed for user ${user.id}: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
        return [] as any[];
      });

    const certifications = await this.certificationRepository
      .find({
        where: { userId: user.id },
        order: { createdAt: 'DESC' },
      })
      .catch((err) => {
        this.logger.warn(
          `certifications fetch failed for user ${user.id}: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
        return [] as any[];
      });

    const industries = await this.industryRepository
      .find({
        where: { userId: user.id },
      })
      .catch((err) => {
        this.logger.warn(
          `industries fetch failed for user ${user.id}: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
        return [] as any[];
      });

    const languages = await this.languageRepository
      .find({
        where: { userId: user.id },
      })
      .catch((err) => {
        this.logger.warn(
          `languages fetch failed for user ${user.id}: ${
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
    const projects = Math.max(experiences.length, portfolioItems.length);
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
      experience: experiences,
      education: educations,
      certifications,
      industries,
      languages,
      portfolio: portfolioItems,
      projects,
      yearsOfExperience,
    } as unknown as User;
  }
}
