import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  InviteAccessLevel,
  InviteSettings,
  LinkExpirationPreset,
} from '../entities/invite-settings.entity';
import {
  PublicInviteSettings,
  UpdateInviteSettingsDto,
} from '../dto/invite-settings.dto';
import { UserServiceClient } from './user-service.client';

const DAY_MS = 24 * 60 * 60 * 1000;

const PRESET_DAYS: Record<
  Exclude<LinkExpirationPreset, LinkExpirationPreset.CUSTOM>,
  number
> = {
  [LinkExpirationPreset.DAYS_15]: 15,
  [LinkExpirationPreset.DAYS_30]: 30,
  [LinkExpirationPreset.DAYS_90]: 90,
};

/**
 * The permission role that "manages invite settings" in the design's roles
 * frame. Coordinator is explicitly excluded there ("cannot change ... invite
 * settings"), and R3-12 pins WD-05 to that frame.
 */
export const INVITE_SETTINGS_MANAGER_PERMISSION = 'administrator';

@Injectable()
export class InviteSettingsService {
  private readonly logger = new Logger(InviteSettingsService.name);

  constructor(
    @InjectRepository(InviteSettings)
    private readonly repo: Repository<InviteSettings>,
    private readonly userService: UserServiceClient,
  ) {}

  /**
   * The settings for an account, falling back to defaults when no row exists.
   *
   * Returns an unsaved instance rather than creating one: reading settings is
   * not a change, and the vast majority of accounts never open the panel.
   */
  async get(accountId: string): Promise<InviteSettings> {
    const found = await this.repo.findOne({ where: { accountId } });
    if (found) return found;
    return this.repo.create({
      accountId,
      userTracking: false,
      guestSharing: false,
      accessRestricted: false,
      accessLevel: InviteAccessLevel.ANYONE,
      linkExpirationEnabled: true,
      linkExpirationPreset: LinkExpirationPreset.DAYS_30,
      linkExpiresAt: null,
      passwordEnabled: false,
      passwordHash: null,
      notificationAlerts: true,
      embedCode: false,
    });
  }

  /**
   * Applies one or more changed controls and saves immediately (R3-14).
   *
   * The caller has already been authorised by `assertCanManage`. Fields absent
   * from the DTO are left untouched, so the panel can send a single switch.
   */
  async update(
    accountId: string,
    dto: UpdateInviteSettingsDto,
  ): Promise<InviteSettings> {
    const settings = await this.get(accountId);

    if (dto.userTracking !== undefined) settings.userTracking = dto.userTracking;
    if (dto.guestSharing !== undefined) settings.guestSharing = dto.guestSharing;
    if (dto.accessRestricted !== undefined) {
      settings.accessRestricted = dto.accessRestricted;
    }
    if (dto.accessLevel !== undefined) settings.accessLevel = dto.accessLevel;
    if (dto.linkExpirationEnabled !== undefined) {
      settings.linkExpirationEnabled = dto.linkExpirationEnabled;
    }
    if (dto.linkExpirationPreset !== undefined) {
      settings.linkExpirationPreset = dto.linkExpirationPreset;
    }
    if (dto.linkExpiresAt !== undefined) {
      settings.linkExpiresAt = new Date(dto.linkExpiresAt);
    }
    if (dto.notificationAlerts !== undefined) {
      settings.notificationAlerts = dto.notificationAlerts;
    }
    if (dto.embedCode !== undefined) settings.embedCode = dto.embedCode;

    if (dto.password !== undefined) {
      settings.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.passwordEnabled !== undefined) {
      settings.passwordEnabled = dto.passwordEnabled;
      // Turning the control off discards the stored hash rather than leaving
      // it dormant: a password nobody can see and nothing enforces is just a
      // secret sitting in a table.
      if (!dto.passwordEnabled) settings.passwordHash = null;
    }

    // A custom expiry with no date cannot be enforced, and the table refuses
    // it. Fall back to the preset the panel's own dropdown offers rather than
    // failing the whole save for a half-filled control.
    if (
      settings.linkExpirationEnabled &&
      settings.linkExpirationPreset === LinkExpirationPreset.CUSTOM &&
      !settings.linkExpiresAt
    ) {
      this.logger.warn(
        `invite settings ${accountId}: custom expiry with no date; keeping the 30-day preset`,
      );
      settings.linkExpirationPreset = LinkExpirationPreset.DAYS_30;
    }

    return this.repo.save(settings);
  }

  /**
   * Who may change an account's invite settings.
   *
   * The account owner always can. Anyone else has to be acting through a
   * company that account owns and hold the `administrator` permission in it,
   * which is the roles frame's wording and what R3-12 aligns WD-05 to.
   */
  async assertCanManage(
    accountId: string,
    actorId: string,
    companyId?: string,
  ): Promise<void> {
    if (accountId === actorId) return;

    if (companyId) {
      const [company, membership] = await Promise.all([
        this.userService.getCompany(companyId).catch(() => null),
        this.userService.getCompanyMembership(companyId, actorId).catch(() => null),
      ]);
      const ownedByAccount = company?.ownerUserId === accountId;
      const isAdministrator = (membership?.permissions ?? []).includes(
        INVITE_SETTINGS_MANAGER_PERMISSION,
      );
      if (ownedByAccount && isAdministrator) return;
    }

    throw new ForbiddenException(
      'Only an administrator can change this account\'s invite settings',
    );
  }

  /**
   * Who may read an account's invite settings.
   *
   * The account owner, or anyone acting through a company that account owns
   * and holding any membership in it. Without this, any signed-in user could
   * read any account's link settings by passing its id.
   */
  async assertCanRead(
    accountId: string,
    actorId: string,
    companyId?: string,
  ): Promise<void> {
    if (accountId === actorId) return;

    if (companyId) {
      const [company, membership] = await Promise.all([
        this.userService.getCompany(companyId).catch(() => null),
        this.userService.getCompanyMembership(companyId, actorId).catch(() => null),
      ]);
      if (company?.ownerUserId === accountId && membership) return;
    }

    throw new ForbiddenException(
      'You do not have access to this account\'s invite settings',
    );
  }

  /**
   * When a link issued at `issuedAtMs` stops working, or null for "never".
   *
   * Read live at accept time rather than baked into the token, so a change
   * made in the panel takes effect on links already copied — which is what
   * "saves immediately" has to mean for a setting whose whole job is to
   * govern a link somebody is holding.
   */
  resolveLinkDeadline(
    settings: InviteSettings,
    issuedAtMs: number,
  ): number | null {
    if (!settings.linkExpirationEnabled) return null;
    if (settings.linkExpirationPreset === LinkExpirationPreset.CUSTOM) {
      return settings.linkExpiresAt
        ? new Date(settings.linkExpiresAt).getTime()
        : null;
    }
    const days = PRESET_DAYS[settings.linkExpirationPreset];
    return days ? issuedAtMs + days * DAY_MS : null;
  }

  /** Whether the link is password-gated *and* a password was actually set. */
  isPasswordRequired(settings: InviteSettings): boolean {
    return settings.passwordEnabled && !!settings.passwordHash;
  }

  async verifyPassword(
    settings: InviteSettings,
    candidate: string | undefined,
  ): Promise<boolean> {
    if (!settings.passwordHash) return true;
    if (!candidate) return false;
    return bcrypt.compare(candidate, settings.passwordHash);
  }

  /** The effective access rule, collapsing the switch and the dropdown. */
  effectiveAccessLevel(settings: InviteSettings): InviteAccessLevel {
    return settings.accessRestricted
      ? settings.accessLevel
      : InviteAccessLevel.ANYONE;
  }

  toPublic(settings: InviteSettings): PublicInviteSettings {
    return {
      accountId: settings.accountId,
      userTracking: settings.userTracking,
      guestSharing: settings.guestSharing,
      accessRestricted: settings.accessRestricted,
      accessLevel: settings.accessLevel,
      linkExpirationEnabled: settings.linkExpirationEnabled,
      linkExpirationPreset: settings.linkExpirationPreset,
      linkExpiresAt: settings.linkExpiresAt
        ? new Date(settings.linkExpiresAt).toISOString()
        : null,
      passwordEnabled: settings.passwordEnabled,
      passwordSet: !!settings.passwordHash,
      notificationAlerts: settings.notificationAlerts,
      embedCode: settings.embedCode,
    };
  }
}
