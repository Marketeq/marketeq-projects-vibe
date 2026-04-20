import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { UserPreference } from '../entities/user-preference.entity';
import { AblyNotificationsService } from '../ably/ably-notifications.service';
// import { SendgridService } from '../sendgrid/sendgrid.service';
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

    const inApp = payload.delivery?.inApp !== false && (prefs?.inAppEnabled ?? true);
    const email = payload.delivery?.email !== false && (prefs?.emailEnabled ?? true);
    const categoryDisabled = prefs?.disabledCategories?.includes(payload.category);

    if (!categoryDisabled) {
      let ablyDelivered = false;

      if (inApp) {
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

      const fallbackToSmtp = inApp && !ablyDelivered;
      const shouldSendEmail = (email || fallbackToSmtp) && !!payload.recipientEmail;

      // --- SendGrid logic (commented out) ---
      // if (shouldSendEmail && payload.recipientEmail) {
      //   await this.sendgridService.sendNotificationEmail(
      //     payload.recipientEmail,
      //     payload.title,
      //     payload.body,
      //     payload.link,
      //   );
      // }

      // --- Brevo logic ---
      if (shouldSendEmail && payload.recipientEmail) {
        this.logger.log(
          `Dispatching email via Brevo: to=${payload.recipientEmail} event=${payload.event} category=${payload.category} subject="${payload.title}"`,
        );
        await this.brevoService.sendNotificationEmail(
          payload.recipientEmail,
          payload.title,
          payload.body,
          payload.link,
        );
      } else {
        this.logger.log(
          `Email skipped: shouldSendEmail=${shouldSendEmail} recipientEmail=${payload.recipientEmail ?? 'none'} event=${payload.event}`,
        );
      }
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
      prefs = this.prefRepo.create({ userId });
      await this.prefRepo.save(prefs);
    }
    return prefs;
  }

  async updatePreferences(userId: string, dto: Partial<UserPreference>) {
    await this.prefRepo.upsert({ userId, ...dto }, ['userId']);
    return this.prefRepo.findOne({ where: { userId } });
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
