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

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
    @InjectRepository(UserPreference) private readonly prefRepo: Repository<UserPreference>,
    private readonly ablyService: AblyNotificationsService,
    // private readonly sendgridService: SendgridService,
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
        `Dispatching email via Brevo: to=${recipientAddress} event=${payload.event} category=${payload.category} subject="${payload.title}"`,
      );
      await this.brevoService.sendNotificationEmail(
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
    const where: any = { userId, isArchived: false };
    if (category) where.category = category;
    if (unread === 'true') where.isRead = false;

    const [data, total] = await this.notifRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, meta: { page, limit, total } };
  }

  async markAsRead(userId: string, id: string) {
    await this.notifRepo.update({ id, userId }, { isRead: true, readAt: new Date() });
  }

  async markAllAsRead(userId: string) {
    await this.notifRepo.update({ userId, isRead: false }, { isRead: true, readAt: new Date() });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notifRepo.count({ where: { userId, isRead: false } });
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

  async sendTeamInvitationEmail(payload: {
    to: string;
    teamName: string;
    role: string;
    acceptUrl: string;
    inviterEmail?: string;
    note?: string;
  }) {
    this.logger.log(
      `sendTeamInvitationEmail: to=${payload.to} teamName=${payload.teamName} role=${payload.role} inviter=${payload.inviterEmail ?? 'n/a'} acceptUrl=${payload.acceptUrl}`,
    );

    const title = `You're invited to join ${payload.teamName}`;
    const inviterLine = payload.inviterEmail ? ` by ${payload.inviterEmail}` : '';
    const note = payload.note?.trim();
    const noteLine = note ? `\n\nNote from inviter: ${note}` : '';
    const body = `You were invited${inviterLine} as ${payload.role}.${noteLine}`;

    // --- SendGrid logic (commented out) ---
    // await this.sendgridService.sendNotificationEmail(
    //   payload.to,
    //   title,
    //   body,
    //   payload.acceptUrl,
    // );

    // --- Brevo logic ---
    this.logger.log(`Sending team invitation via Brevo: to=${payload.to} subject="${title}"`);
    await this.brevoService.sendNotificationEmail(
      payload.to,
      title,
      body,
      payload.acceptUrl,
    );

    this.logger.log(`Team invitation email sent successfully: to=${payload.to}`);
    return { sent: true };
  }
}
