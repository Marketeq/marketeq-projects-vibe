import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, In, Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CompanyUser } from './entities/company-user.entity';
import { User } from '../user/entities/user.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { AddCompanyMemberDto } from './dto/add-company-member.dto';
import { UpdateCompanyMemberDto } from './dto/update-company-member.dto';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(CompanyUser)
    private readonly companyUserRepo: Repository<CompanyUser>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Throws ForbiddenException unless `userId` is already a member of the
   * company. Mirrors TeamsService.assertIsMember.
   */
  async assertIsMember(companyId: string, userId: string): Promise<CompanyUser> {
    const membership = await this.companyUserRepo.findOne({
      where: { companyId, userId },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this company');
    }
    return membership;
  }

  async assertIsAdmin(companyId: string, userId: string): Promise<CompanyUser> {
    const membership = await this.assertIsMember(companyId, userId);
    if (membership.role !== 'admin') {
      throw new ForbiddenException('Only company admins can perform this action');
    }
    return membership;
  }

  async create(dto: CreateCompanyDto, ownerUserId: string): Promise<Company> {
    return this.dataSource.transaction(async (manager) => {
      const company = await manager.save(
        manager.create(Company, {
          name: dto.name.trim(),
          domain: dto.domain?.trim() || undefined,
          logoUrl: dto.logoUrl,
          ownerUserId,
        }),
      );

      await manager.save(
        manager.create(CompanyUser, {
          companyId: company.id,
          userId: ownerUserId,
          role: 'admin',
          permissions: [],
        }),
      );

      return company;
    });
  }

  async findAllForUser(userId: string): Promise<Company[]> {
    const memberships = await this.companyUserRepo.find({ where: { userId } });
    if (memberships.length === 0) return [];
    const ids = memberships.map((m) => m.companyId);
    return this.companyRepo.find({ where: { id: In(ids) } });
  }

  async search(q?: string): Promise<Company[]> {
    const query = q?.trim();
    if (!query) return [];
    return this.companyRepo.find({
      where: { name: ILike(`%${query}%`) },
      take: 20,
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepo.findOne({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);
    if (dto.name !== undefined) company.name = dto.name.trim();
    // Trimmed to empty means "clear it", matching how create treats a blank
    // domain, rather than storing an empty string.
    if (dto.domain !== undefined)
      company.domain = dto.domain.trim() || undefined;
    if (dto.logoUrl !== undefined) company.logoUrl = dto.logoUrl;
    return this.companyRepo.save(company);
  }

  async getMembers(companyId: string) {
    await this.findOne(companyId);
    const memberships = await this.companyUserRepo.find({
      where: { companyId },
      order: { joinedAt: 'ASC' },
    });

    const userIds = Array.from(new Set(memberships.map((m) => m.userId)));
    const users = userIds.length
      ? await this.userRepo.find({ where: userIds.map((userId) => ({ id: userId })) })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));

    return memberships.map((membership) => {
      const u = byId.get(membership.userId);
      if (!u) {
        // The FK added in AddCompanyUsersUserFk makes this unreachable, but a
        // membership whose user cannot be resolved must never fail quietly:
        // callers that key off `email` (the invite suggestions list) drop such
        // a member from the UI, so the row would vanish with no trace.
        this.logger.warn(
          `Company ${companyId} has a membership for unknown user ${membership.userId}`,
        );
      }
      return {
        userId: membership.userId,
        email: u?.email,
        // Real name only. Callers that have neither name nor username show the
        // email alone rather than repeating one value on two lines.
        name: [u?.firstName, u?.lastName].filter(Boolean).join(' ') || undefined,
        username: this.readableUsername(u?.username),
        avatarUrl: u?.avatarUrl,
        role: membership.role,
        permissions: membership.permissions,
        joinedAt: membership.joinedAt,
      };
    });
  }

  /**
   * System-generated placeholder usernames (e.g. from dev-login or an
   * account with no chosen handle) look like `user_d7b1b7b5ec47`, never
   * fit to show as a person's name. Same pattern as
   * SYSTEM_GENERATED_USERNAME_REGEX in my-team/page.tsx; callers fall back
   * to email when this returns undefined.
   */
  private readableUsername(username?: string): string | undefined {
    if (!username) return undefined;
    return /^user_[a-f0-9]{8,}$/i.test(username) ? undefined : username;
  }

  async updateMember(
    companyId: string,
    userId: string,
    dto: UpdateCompanyMemberDto,
  ): Promise<CompanyUser> {
    const membership = await this.companyUserRepo.findOne({
      where: { companyId, userId },
    });
    if (!membership) throw new NotFoundException('Company member not found');
    if (dto.role !== undefined) membership.role = dto.role;
    if (dto.permissions !== undefined) membership.permissions = dto.permissions;
    return this.companyUserRepo.save(membership);
  }

  async removeMember(companyId: string, userId: string): Promise<{ message: string }> {
    const company = await this.findOne(companyId);
    if (company.ownerUserId === userId) {
      throw new ForbiddenException('Cannot remove the company owner');
    }
    await this.companyUserRepo.delete({ companyId, userId });
    return { message: 'Company member removed' };
  }

  // --- internal (service-to-service) helpers ---

  /**
   * Idempotent upsert used by invitations-service on accept. Never throws
   * on an existing membership. It updates role/permissions instead.
   */
  async addMemberInternal(
    companyId: string,
    dto: AddCompanyMemberDto,
  ): Promise<CompanyUser> {
    await this.findOne(companyId);
    const existing = await this.companyUserRepo.findOne({
      where: { companyId, userId: dto.userId },
    });
    if (existing) {
      if (dto.role !== undefined) existing.role = dto.role;
      if (dto.permissions !== undefined) existing.permissions = dto.permissions;
      return this.companyUserRepo.save(existing);
    }
    return this.companyUserRepo.save(
      this.companyUserRepo.create({
        companyId,
        userId: dto.userId,
        role: dto.role ?? 'viewer',
        permissions: dto.permissions ?? [],
      }),
    );
  }

  async getMemberByEmail(companyId: string, email: string): Promise<CompanyUser | null> {
    const normalized = email.trim().toLowerCase();
    const user = await this.userRepo.findOne({ where: { email: normalized } });
    if (!user) return null;
    return this.companyUserRepo.findOne({ where: { companyId, userId: user.id } });
  }

  /** Roster size, used by invitations-service for the company card in the
   * "invite accepted" email. Counts rows directly, because the caller only
   * needs the number, not the hydrated member list getMembers builds. */
  async countMembers(companyId: string): Promise<number> {
    return this.companyUserRepo.count({ where: { companyId } });
  }

  async checkMembership(companyId: string, userId: string): Promise<boolean> {
    const membership = await this.companyUserRepo.findOne({
      where: { companyId, userId },
    });
    return !!membership;
  }
}
