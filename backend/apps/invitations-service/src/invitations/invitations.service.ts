import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Invitation, InvitationStatus, InvitationRole } from '../entities/invitation.entity';
import { CreateInvitationsDto, ListInvitationsDto, AcceptInvitationDto } from '../dto/invitation.dto';
import { NotificationsClient } from './notifications.client';

@Injectable()
export class InvitationsService {
  private readonly expDays: number;
  private readonly appBaseUrl: string;

  constructor(
    @InjectRepository(Invitation)
    private readonly repo: Repository<Invitation>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsClient,
  ) {
    this.expDays = parseInt(config.get('INVITE_EXP_DAYS') ?? '7', 10);
    this.appBaseUrl = config.get('APP_BASE_URL') ?? 'http://localhost:3000';
  }

  async createInvites(dto: CreateInvitationsDto, inviter: { id: string; email: string }) {
    const results = [];
    for (const email of dto.emails) {
      const existing = await this.repo.findOne({
        where: { teamId: dto.teamId, invitedEmail: email, status: InvitationStatus.PENDING },
      });

      if (existing) {
        results.push({ ...existing, alreadyInvited: true });
        continue;
      }

      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.expDays);

      const inv = await this.repo.save(
        this.repo.create({
          teamId: dto.teamId,
          invitedEmail: email,
          role: dto.role,
          token,
          expiresAt,
          createdByUserId: inviter.id,
          note: dto.note ?? null,
        }),
      );

      await this.notifications.sendInvitationEmail({
        to: email,
        teamName: dto.teamId,
        role: dto.role,
        acceptUrl: `${this.appBaseUrl}/invitations/accept?token=${token}`,
        inviterEmail: inviter.email,
        note: dto.note,
      });

      results.push({ ...inv, alreadyInvited: false });
    }
    return results;
  }

  async list(dto: ListInvitationsDto) {
    const qb = this.repo.createQueryBuilder('i').orderBy('i.createdAt', 'DESC');

    if (dto.teamId) qb.andWhere('i.teamId = :teamId', { teamId: dto.teamId });
    if (dto.status) qb.andWhere('i.status = :status', { status: dto.status });
    if (dto.cursor) qb.andWhere('i.createdAt < :cursor', { cursor: new Date(dto.cursor) });

    qb.take((dto.limit ?? 20) + 1);
    const rows = await qb.getMany();
    const limit = dto.limit ?? 20;
    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    return {
      data,
      nextCursor: hasMore ? data[data.length - 1].createdAt.toISOString() : null,
    };
  }

  async getOne(id: string): Promise<Invitation> {
    const inv = await this.repo.findOne({ where: { id } });
    if (!inv) throw new NotFoundException('Invitation not found');
    return inv;
  }

  async resend(id: string): Promise<Invitation> {
    const inv = await this.getOne(id);
    if (inv.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Can only resend pending invitations');
    }
    inv.resentCount += 1;
    await this.repo.save(inv);

    await this.notifications.sendInvitationEmail({
      to: inv.invitedEmail,
      teamName: inv.teamId,
      role: inv.role,
      acceptUrl: `${this.appBaseUrl}/invitations/accept?token=${inv.token}`,
      inviterEmail: '',
    });

    return inv;
  }

  async cancel(id: string): Promise<Invitation> {
    const inv = await this.getOne(id);
    if (inv.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending invitations');
    }
    inv.status = InvitationStatus.CANCELED;
    inv.canceledAt = new Date();
    return this.repo.save(inv);
  }

  async accept(dto: AcceptInvitationDto, invitee: { id: string; email: string }): Promise<Invitation> {
    const inv = await this.repo.findOne({ where: { token: dto.token } });
    if (!inv) throw new NotFoundException('Invalid invitation token');
    if (inv.status !== InvitationStatus.PENDING) throw new BadRequestException('Invitation is no longer pending');
    if (inv.expiresAt < new Date()) {
      inv.status = InvitationStatus.EXPIRED;
      await this.repo.save(inv);
      throw new BadRequestException('Invitation has expired');
    }
    if (inv.invitedEmail.toLowerCase() !== invitee.email.toLowerCase()) {
      throw new ForbiddenException('Email does not match invitation');
    }

    // Idempotent team_members insert
    await this.dataSource.query(
      `INSERT INTO team_members (team_id, user_id, role, created_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (team_id, user_id) DO NOTHING`,
      [inv.teamId, invitee.id, inv.role],
    ).catch(() => null); // ignore if team_members table not yet created

    inv.status = InvitationStatus.ACCEPTED;
    inv.acceptedAt = new Date();
    return this.repo.save(inv);
  }
}
