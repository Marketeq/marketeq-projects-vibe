import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import {
  CategoryPref,
  GlobalChannelPrefs,
  NotificationItemPref,
  ScopedChannelState,
  UserPreference,
} from '../entities/user-preference.entity';
import { AblyNotificationsService } from '../ably/ably-notifications.service';
import {
  DEFAULT_GLOBAL_CHANNELS,
  NOTIFICATION_CATALOG,
  NotificationCatalogCategory,
  buildDefaultCategoryMap,
  buildDefaultNotificationMap,
  getAllCategoryIds,
  getAllNotificationIds,
} from '../constants/notification-catalog';
import { UpdatePreferencesDto } from '../dtos/update-preferences.dto';
import { BrevoService } from '../brevo/brevo.service';
import {
  buildTeamInvitationEmail,
  SocialLink,
} from '../templates/team-invitation.template';
import { buildInvitationAcceptedEmail } from '../templates/invitation-accepted.template';

/** Public Marketeq profiles linked from the invitation email footer. These are
 * marketing destinations, not environment config. Every environment links to
 * the same accounts, so they default here and each one can still be
 * overridden (or blanked out) with the matching `SOCIAL_*_URL` env var. */
const DEFAULT_SOCIAL_URLS = {
  facebook: 'https://www.facebook.com/marketeqdigital',
  telegram: 'https://t.me/marketeqdigital',
  linkedin: 'https://www.linkedin.com/company/marketeq-digital',
  instagram: 'https://www.instagram.com/marketeqdigital',
} as const;

export interface NotificationPayload {
  recipientId: string;
  category: string;
  event: string;
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
  delivery?: { inApp?: boolean; email?: boolean; sms?: boolean };
  recipientEmail?: string;
  origin?: string;
}

export interface ResolvedPreferences {
  channels: GlobalChannelPrefs;
  categories: Record<string, CategoryPref>;
  notifications: Record<string, NotificationItemPref>;
}

function normalizePositiveInt(
  value: number | string | undefined,
  fallback: number,
  { min = 1, max = Number.MAX_SAFE_INTEGER } = {},
) {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
    @InjectRepository(UserPreference) private readonly prefRepo: Repository<UserPreference>,
    private readonly ablyService: AblyNotificationsService,
    private readonly brevoService: BrevoService,
  ) {}

  async dispatch(payload: NotificationPayload) {
    const prefs = await this.prefRepo.findOne({ where: { userId: payload.recipientId } });
    const resolved = this.resolvePreferences(prefs);

    const notification = this.notifRepo.create({
      userId: payload.recipientId,
      title: payload.title,
      body: payload.body,
      link: payload.link,
      category: payload.category,
      event: payload.event,
      metadata: payload.metadata,
      origin: payload.origin || 'system',
    });
    const saved = await this.notifRepo.save(notification);

    const itemId = payload.event;
    const item = resolved.notifications[itemId];
    const categoryPref = resolved.categories[payload.category];

    const categoryActive = categoryPref?.enabled ?? true;
    const itemActive = item?.enabled ?? true;
    const itemChannels: ScopedChannelState =
      item?.channels ??
      categoryPref?.channels ??
      { inApp: true, email: true, sms: false };

    const inAppAllowed =
      payload.delivery?.inApp !== false &&
      resolved.channels.inApp.enabled &&
      categoryActive &&
      itemActive &&
      itemChannels.inApp;

    const emailAllowed =
      payload.delivery?.email !== false &&
      resolved.channels.email.enabled &&
      categoryActive &&
      itemActive &&
      itemChannels.email;

    let ablyDelivered = false;

    if (inAppAllowed) {
      if (this.ablyService.isEnabled()) {
        try {
          await this.ablyService.sendInApp(payload.recipientId, {
            id: saved.id,
            title: saved.title,
            body: saved.body,
            link: saved.link,
            category: saved.category,
            event: saved.event,
            metadata: saved.metadata,
          });
          const unreadCount = await this.getUnreadCount(payload.recipientId);
          await this.ablyService.updateBadgeCount(payload.recipientId, unreadCount);
          ablyDelivered = true;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Ably delivery failed for user ${payload.recipientId}; falling back to SMTP. Error: ${errMsg}`,
          );
        }
      } else {
        this.logger.warn(
          `Ably is not configured; falling back to SMTP for user ${payload.recipientId}.`,
        );
      }
    }

    const fallbackToSmtp = inAppAllowed && !ablyDelivered;
    const recipientAddress =
      resolved.channels.email.address ?? payload.recipientEmail;
    const shouldSendEmail =
      (emailAllowed || fallbackToSmtp) && !!recipientAddress;

    if (shouldSendEmail && recipientAddress) {
      this.logger.log(
        `Dispatching email: to=${recipientAddress} event=${payload.event} category=${payload.category} subject="${payload.title}"`,
      );
      await this.sendEmailViaBrevo(
        recipientAddress,
        payload.title,
        payload.body,
        payload.link,
      );
    } else {
      this.logger.log(
        `Email skipped: shouldSendEmail=${shouldSendEmail} recipientEmail=${recipientAddress ?? 'none'} event=${payload.event}`,
      );
    }

    return saved;
  }

  async getPaginatedNotifications(userId: string, page = 1, limit = 20, category?: string, unread?: string) {
    const resolvedPage = normalizePositiveInt(page, 1);
    const resolvedLimit = normalizePositiveInt(limit, 20, { max: 100 });
    const where: any = { userId, isArchived: false };
    if (category) where.category = category;
    if (unread === 'true') where.isRead = false;

    const [data, total] = await this.notifRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (resolvedPage - 1) * resolvedLimit,
      take: resolvedLimit,
    });

    return {
      data,
      meta: { page: resolvedPage, limit: resolvedLimit, total },
    };
  }

  async markAsRead(userId: string, id: string) {
    await this.notifRepo.update({ id, userId }, { isRead: true, readAt: new Date() });
  }

  async markAllAsRead(userId: string) {
    await this.notifRepo.update({ userId, isRead: false }, { isRead: true, readAt: new Date() });
  }

  async getUnreadCount(userId: string): Promise<number> {
    // Must match the filter getPaginatedNotifications uses, otherwise an
    // archived-but-unread row inflates the bell badge over a list that can
    // never show it, and the count has no way back down to zero.
    return this.notifRepo.count({ where: { userId, isRead: false, isArchived: false } });
  }

  async archive(userId: string, id: string) {
    await this.notifRepo.update({ id, userId }, { isArchived: true });
  }

  async delete(userId: string, id: string) {
    await this.notifRepo.delete({ id, userId });
  }

  async getOrCreatePreferences(userId: string): Promise<UserPreference> {
    let prefs = await this.prefRepo.findOne({ where: { userId } });
    if (!prefs) {
      const fresh = this.prefRepo.create({
        userId,
        channels: this.cloneDefaultChannels(),
        categories: buildDefaultCategoryMap(),
        notifications: buildDefaultNotificationMap(),
      });
      try {
        prefs = await this.prefRepo.save(fresh);
      } catch (err: any) {
        if (err?.code === '23505') {
          prefs = await this.prefRepo.findOne({ where: { userId } });
          if (!prefs) throw err;
        } else {
          throw err;
        }
      }
      return prefs;
    }

    const wasIncomplete =
      !prefs.channels || !prefs.categories || !prefs.notifications;
    if (wasIncomplete) {
      prefs.channels = prefs.channels ?? this.cloneDefaultChannels();
      prefs.categories = prefs.categories ?? buildDefaultCategoryMap();
      prefs.notifications =
        prefs.notifications ?? buildDefaultNotificationMap();
      await this.prefRepo.save(prefs);
    }
    return prefs;
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<UserPreference> {
    const prefs = await this.getOrCreatePreferences(userId);
    const resolved = this.resolvePreferences(prefs);

    if (dto.channels) {
      const next: GlobalChannelPrefs = { ...resolved.channels };
      if (dto.channels.inApp) {
        next.inApp = { ...next.inApp, ...dto.channels.inApp };
      }
      if (dto.channels.email) {
        next.email = {
          ...next.email,
          ...dto.channels.email,
          address:
            dto.channels.email.address === undefined
              ? next.email.address
              : dto.channels.email.address,
        };
      }
      if (dto.channels.sms) {
        next.sms = {
          ...next.sms,
          ...dto.channels.sms,
          phone:
            dto.channels.sms.phone === undefined
              ? next.sms.phone
              : dto.channels.sms.phone,
        };
      }
      prefs.channels = next;
    }

    if (dto.categories) {
      const validIds = getAllCategoryIds();
      const nextCategories: Record<string, CategoryPref> = {
        ...resolved.categories,
      };
      for (const [id, value] of Object.entries(dto.categories)) {
        if (!validIds.has(id)) continue;
        nextCategories[id] = {
          enabled: value.enabled ?? nextCategories[id].enabled,
          channels: {
            ...nextCategories[id].channels,
            ...(value.channels ?? {}),
          },
        };
      }
      prefs.categories = nextCategories;
    }

    if (dto.notifications) {
      const validIds = getAllNotificationIds();
      const nextNotifications: Record<string, NotificationItemPref> = {
        ...resolved.notifications,
      };
      for (const [id, value] of Object.entries(dto.notifications)) {
        if (!validIds.has(id)) continue;
        nextNotifications[id] = {
          enabled: value.enabled ?? nextNotifications[id].enabled,
          channels: {
            ...nextNotifications[id].channels,
            ...(value.channels ?? {}),
          },
        };
      }
      prefs.notifications = nextNotifications;
    }

    prefs.inAppEnabled = prefs.channels?.inApp.enabled ?? prefs.inAppEnabled;
    prefs.emailEnabled = prefs.channels?.email.enabled ?? prefs.emailEnabled;
    prefs.smsEnabled = prefs.channels?.sms.enabled ?? prefs.smsEnabled;

    await this.prefRepo.save(prefs);
    return prefs;
  }

  async resetPreferences(userId: string): Promise<UserPreference> {
    const prefs = await this.getOrCreatePreferences(userId);
    prefs.channels = this.cloneDefaultChannels();
    prefs.categories = buildDefaultCategoryMap();
    prefs.notifications = buildDefaultNotificationMap();
    prefs.inAppEnabled = prefs.channels.inApp.enabled;
    prefs.emailEnabled = prefs.channels.email.enabled;
    prefs.smsEnabled = prefs.channels.sms.enabled;
    await this.prefRepo.save(prefs);
    return prefs;
  }

  getCatalog(): NotificationCatalogCategory[] {
    return NOTIFICATION_CATALOG;
  }

  private resolvePreferences(
    prefs: UserPreference | null,
  ): ResolvedPreferences {
    const channels: GlobalChannelPrefs = prefs?.channels
      ? this.mergeChannelDefaults(prefs.channels)
      : this.cloneDefaultChannels();

    const categories: Record<string, CategoryPref> = {
      ...buildDefaultCategoryMap(),
      ...(prefs?.categories ?? {}),
    };

    const notifications: Record<string, NotificationItemPref> = {
      ...buildDefaultNotificationMap(),
      ...(prefs?.notifications ?? {}),
    };

    return { channels, categories, notifications };
  }

  private mergeChannelDefaults(
    channels: GlobalChannelPrefs,
  ): GlobalChannelPrefs {
    const defaults = DEFAULT_GLOBAL_CHANNELS;
    return {
      inApp: { ...defaults.inApp, ...channels.inApp },
      email: { ...defaults.email, ...channels.email },
      sms: { ...defaults.sms, ...channels.sms },
    };
  }

  private cloneDefaultChannels(): GlobalChannelPrefs {
    return {
      inApp: { ...DEFAULT_GLOBAL_CHANNELS.inApp },
      email: { ...DEFAULT_GLOBAL_CHANNELS.email },
      sms: { ...DEFAULT_GLOBAL_CHANNELS.sms },
    };
  }

  private async sendEmailViaBrevo(to: string, title: string, body: string, link?: string): Promise<void> {
    const brevoKey = (process.env.BREVO_API_KEY ?? '').trim();

    if (!brevoKey) {
      this.logger.log(`[LOCAL DEV MOCK EMAIL] To: ${to} | Subject: "${title}" | Body: "${body}" | Link: ${link ?? 'none'}`);
      return;
    }

    this.logger.log(`Sending email via Brevo to=${to}`);
    await this.brevoService.sendNotificationEmail(to, title, body, link);
  }

  /** Pre-rendered branded HTML document instead of a title/body pair. */
  private async sendHtmlViaBrevo(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<void> {
    const brevoKey = (process.env.BREVO_API_KEY ?? '').trim();

    if (!brevoKey) {
      this.logger.log(`[LOCAL DEV MOCK EMAIL] To: ${to} | Subject: "${subject}" | Text: "${text}"`);
      return;
    }

    this.logger.log(`Sending HTML email via Brevo to=${to}`);
    await this.brevoService.sendHtmlEmail(to, subject, html, text);
  }

  /** Where the email image assets are served from: the wordmark at
   * /email/marketeq-logo.png and the footer glyphs under /email/social/.
   * Set `EMAIL_ASSET_BASE_URL` to any origin that mirrors the layout of
   * `frontend/public/email/`; without it the R2-hosted copies below are used.
   * Only https origins qualify. A localhost base would render as a broken
   * image in a real inbox. */
  private resolveEmailAssetBase(): string | undefined {
    const base = (process.env.EMAIL_ASSET_BASE_URL?.trim() || '').replace(
      /\/+$/,
      '',
    );
    if (!base) return undefined;
    try {
      return new URL(base).protocol === 'https:' ? base : undefined;
    } catch {
      return undefined;
    }
  }

  /** The Marketeq wordmark for the email header. This is the PNG rasterised from
   * frontend/components/icons/marketeq-logo.tsx, served by the frontend at
   * /email/marketeq-logo.png. `EMAIL_LOGO_URL` overrides it, then
   * `EMAIL_ASSET_BASE_URL`; otherwise the R2-hosted copy below, which is
   * what every environment uses today. */
  private resolveLogoUrl(): string | undefined {
    const override = process.env.EMAIL_LOGO_URL?.trim();
    if (override) return override;
    const assetBase = this.resolveEmailAssetBase();
    if (assetBase) return `${assetBase}/email/marketeq-logo.png`;
    return 'https://pub-e9542a644f314a638feeaf72485dca6e.r2.dev/marketeq-logo.png';
  }

  /** The rocket glyph on the company card's Launch button. Same hosting
   * story as the wordmark: `EMAIL_LAUNCH_ICON_URL` overrides, otherwise the
   * copy the frontend serves at /email/rocket.png. Without a usable asset
   * base the button renders label-only rather than a broken image. */
  private resolveLaunchIconUrl(): string | undefined {
    const override = process.env.EMAIL_LAUNCH_ICON_URL?.trim();
    if (override) return override;
    const assetBase = this.resolveEmailAssetBase();
    return assetBase ? `${assetBase}/email/rocket.png` : undefined;
  }

  /** The branded footer glyphs. These are the same PNGs the frontend ships in
   * `frontend/public/email/social/` (rasterised from the app's icon pack by
   * frontend/scripts/rasterize-email-social-icons.mjs), hosted on the R2
   * bucket that already serves the email wordmark so inboxes can reach them
   * without the frontend having to be public. Overridden per icon by
   * `SOCIAL_*_ICON_URL`, or wholesale by `EMAIL_ASSET_BASE_URL`. */
  private static readonly DEFAULT_SOCIAL_ICON_URLS: Record<string, string> = {
    facebook: 'https://pub-e9542a644f314a638feeaf72485dca6e.r2.dev/social/facebook.png',
    telegram: 'https://pub-e9542a644f314a638feeaf72485dca6e.r2.dev/social/telegram.png',
    instagram: 'https://pub-e9542a644f314a638feeaf72485dca6e.r2.dev/social/instagram.png',
    linkedin: 'https://pub-e9542a644f314a638feeaf72485dca6e.r2.dev/social/linkedin.png',
  };

  /** Social links shown in the email footer. URLs default to the public
   * Marketeq profiles and are overridable per environment via `SOCIAL_*_URL`;
   * setting one to an empty string drops that icon. The `*_ICON_URL` vars
   * point at hosted PNG glyphs (rendered at 12px); without them the icons
   * come from `EMAIL_ASSET_BASE_URL`, and failing that from the R2-hosted
   * `DEFAULT_SOCIAL_ICON_URLS` above. */
  private resolveSocialLinks(): SocialLink[] {
    const assetBase = this.resolveEmailAssetBase();
    const icon = (name: string, override?: string): string | undefined =>
      override?.trim() ||
      (assetBase
        ? `${assetBase}/email/social/${name}.png`
        : NotificationService.DEFAULT_SOCIAL_ICON_URLS[name]);
    const url = (override: string | undefined, fallback: string): string =>
      override === undefined ? fallback : override.trim();

    const configured: SocialLink[] = [
      {
        label: 'Facebook',
        short: 'f',
        url: url(process.env.SOCIAL_FACEBOOK_URL, DEFAULT_SOCIAL_URLS.facebook),
        iconUrl: icon('facebook', process.env.SOCIAL_FACEBOOK_ICON_URL),
      },
      {
        label: 'Telegram',
        short: 't',
        url: url(process.env.SOCIAL_TELEGRAM_URL, DEFAULT_SOCIAL_URLS.telegram),
        iconUrl: icon('telegram', process.env.SOCIAL_TELEGRAM_ICON_URL),
      },
      {
        label: 'LinkedIn',
        short: 'in',
        url: url(process.env.SOCIAL_LINKEDIN_URL, DEFAULT_SOCIAL_URLS.linkedin),
        iconUrl: icon('linkedin', process.env.SOCIAL_LINKEDIN_ICON_URL),
      },
      {
        label: 'Instagram',
        short: 'ig',
        url: url(
          process.env.SOCIAL_INSTAGRAM_URL,
          DEFAULT_SOCIAL_URLS.instagram,
        ),
        iconUrl: icon('instagram', process.env.SOCIAL_INSTAGRAM_ICON_URL),
      },
    ];

    return configured.filter((link) => Boolean(link.url));
  }

  async sendTeamInvitationEmail(payload: {
    to: string;
    teamName: string;
    role: string;
    acceptUrl: string;
    inviterEmail?: string;
    inviterName?: string;
    inviterAvatarUrl?: string;
    note?: string;
  }) {
    this.logger.log(
      `sendTeamInvitationEmail: to=${payload.to} teamName=${payload.teamName} role=${payload.role} inviter=${payload.inviterEmail ?? 'n/a'} acceptUrl=${payload.acceptUrl}`,
    );

    const { subject, html, text } = buildTeamInvitationEmail({
      companyName: payload.teamName,
      inviterName: payload.inviterName,
      inviterEmail: payload.inviterEmail,
      inviterAvatarUrl: payload.inviterAvatarUrl,
      note: payload.note,
      acceptUrl: payload.acceptUrl,
      logoUrl: this.resolveLogoUrl(),
      supportEmail:
        process.env.SUPPORT_EMAIL?.trim() || 'support@marketeqdigital.com',
      socialLinks: this.resolveSocialLinks(),
    });

    await this.sendHtmlViaBrevo(payload.to, subject, html, text);

    this.logger.log(`Team invitation email sent successfully: to=${payload.to}`);
    return { sent: true };
  }

  /** Sent when a user shares a project listing via email. Consumed from the
   * notification.email.project_shared event emitted by invitations-service. */
  async sendSharedProjectEmail(payload: {
    to: string;
    sharerName?: string;
    projectTitle?: string;
    projectUrl: string;
    note?: string;
  }) {
    this.logger.log(
      `sendSharedProjectEmail: to=${payload.to} project=${payload.projectTitle ?? 'n/a'}`,
    );

    await this.brevoService.sendShareProjectEmail(payload.to, {
      sharerName: payload.sharerName,
      projectTitle: payload.projectTitle,
      projectUrl: payload.projectUrl,
      note: payload.note,
    });

    this.logger.log(`Shared project email sent successfully: to=${payload.to}`);
    return { sent: true };
  }

  /** Sent to the inviter once someone accepts their invitation. This is the
   * counterpart to sendTeamInvitationEmail, which goes to the invitee. */
  async sendInvitationAcceptedEmail(payload: {
    to: string;
    companyName: string;
    companyLogoUrl?: string;
    memberCount?: number;
    inviteeName?: string;
    inviteeEmail: string;
    inviteMoreUrl: string;
    launchUrl: string;
  }) {
    this.logger.log(
      `sendInvitationAcceptedEmail: to=${payload.to} company=${payload.companyName} invitee=${payload.inviteeEmail}`,
    );

    const { subject, html, text } = buildInvitationAcceptedEmail({
      companyName: payload.companyName,
      companyLogoUrl: payload.companyLogoUrl,
      memberCount: payload.memberCount,
      inviteeName: payload.inviteeName,
      inviteeEmail: payload.inviteeEmail,
      inviteMoreUrl: payload.inviteMoreUrl,
      launchUrl: payload.launchUrl,
      launchIconUrl: this.resolveLaunchIconUrl(),
      logoUrl: this.resolveLogoUrl(),
      supportEmail:
        process.env.SUPPORT_EMAIL?.trim() || 'support@marketeqdigital.com',
      socialLinks: this.resolveSocialLinks(),
    });

    await this.sendHtmlViaBrevo(payload.to, subject, html, text);

    this.logger.log(`Invitation accepted email sent successfully: to=${payload.to}`);
    return { sent: true };
  }
}
