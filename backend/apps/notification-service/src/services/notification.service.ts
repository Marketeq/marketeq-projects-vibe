import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { NotificationIdempotency } from '../entities/notification-idempotency.entity';
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
  resolveCategoryId,
} from '../constants/notification-catalog';
import { UpdatePreferencesDto } from '../dtos/update-preferences.dto';
import { BrevoService } from '../brevo/brevo.service';
import {
  buildTeamInvitationEmail,
  SocialLink,
} from '../templates/team-invitation.template';
import { buildInvitationAcceptedEmail } from '../templates/invitation-accepted.template';
import {
  buildWithdrawalEmail,
  buildWithdrawalPush,
  normalizeFailureReason,
  WithdrawalKind,
} from '../templates/withdrawal.template';

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
  /**
   * Optional. A publisher that can emit the same notification more than once (retry,
   * redelivery, concurrent workers) sets a key that is stable for that one notification;
   * it is delivered once and every repeat is dropped.
   */
  idempotencyKey?: string;
}

/** PMCM-806: emitted by payout-service (WithdrawalNotifier) on
 * `notification.payout.withdrawal`. Amounts are 2dp USD strings. */
export interface WithdrawalNotificationPayload {
  kind: WithdrawalKind;
  recipientId: string;
  recipientEmail?: string | null;
  firstName?: string | null;
  payoutRequestId: string;
  depositMethodId?: string | null;
  amountUsd: string;
  feeUsd: string;
  netAmountUsd: string;
  methodLabel: string;
  estimatedArrivalAt?: string | null;
  arrivalWindow?: string | null;
  completedAt?: string | null;
  failureReason?: string | null;
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

/** How long one worker may hold a keyed notification before another may take it over. */
export const CLAIM_LEASE_MS = 60_000;

/**
 * The key is being delivered by another worker right now. Not a failure of the notification:
 * the delivery service retries it after its normal delay, by which time the other worker has
 * finished (the repeat is then dropped) or died (its lease has expired and this delivery takes over).
 */
export class NotificationInProgressException extends ServiceUnavailableException {
  constructor(key: string) {
    super(`Notification ${key} is being delivered by another worker`);
  }
}

/** A stable UUID for the in-app row of a key, so the same key can only ever be one stored row. */
export function notificationIdForKey(key: string): string {
  const h = createHash('sha256').update(`notification:${key}`).digest('hex');
  const variant = ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

/** What an earlier delivery of a keyed notification already did. */
interface ChannelProgress {
  key: string;
  notificationId: string | null;
  ablyDone: boolean;
  emailDone: boolean;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
    @InjectRepository(UserPreference) private readonly prefRepo: Repository<UserPreference>,
    @InjectRepository(NotificationIdempotency) private readonly idempotencyRepo: Repository<NotificationIdempotency>,
    private readonly ablyService: AblyNotificationsService,
    private readonly brevoService: BrevoService,
  ) {}

  /**
   * Returns the stored notification, or null when the recipient's preferences
   * mean there is nothing to store.
   */
  async dispatch(payload: NotificationPayload): Promise<Notification | null> {
    const key = payload.idempotencyKey?.trim();
    // No key: exactly the original single-shot behaviour. Nothing is claimed or recorded, and the
    // caller does not retry it (a retry could repeat a channel that already went out).
    if (!key) return this.deliver(payload, null);

    const progress = await this.acquire(key);
    if (!progress) {
      this.logger.log(`Duplicate notification dropped (idempotency key ${key}, event ${payload.event}).`);
      return null;
    }
    try {
      const stored = await this.deliver(payload, progress);
      await this.idempotencyRepo.update({ key }, { completedAt: new Date(), lockedUntil: null });
      return stored;
    } catch (err) {
      // Keep what was delivered (the progress columns) and hand the key back at once, so the
      // retry resumes at the unfinished channel instead of being mistaken for a repeat of a
      // delivered notification - or repeating one that already went out.
      await this.idempotencyRepo.update({ key }, { lockedUntil: new Date() }).catch(() => undefined);
      throw err;
    }
  }

  /**
   * Takes the key, or reports that it is finished / held by someone else.
   *   - new key: this worker owns it (INSERT conflicts for everyone else);
   *   - completed: returns null - a duplicate, drop it;
   *   - held by a live lease: throws NotificationInProgressException;
   *   - free or lease expired (the holder failed or died): this worker takes it over atomically
   *     and resumes from the recorded progress.
   */
  private async acquire(key: string): Promise<ChannelProgress | null> {
    for (let pass = 0; pass < 2; pass++) {
      const now = new Date();
      const lease = new Date(now.getTime() + CLAIM_LEASE_MS);
      const claimed = await this.idempotencyRepo
        .createQueryBuilder()
        .insert()
        .values({ key, lockedUntil: lease })
        .orIgnore()
        .returning('key')
        .execute();
      if (claimed.raw?.length) return { key, notificationId: null, ablyDone: false, emailDone: false };

      const row = await this.idempotencyRepo.findOne({ where: { key } });
      if (!row) continue; // removed between the two statements: claim it afresh
      if (row.completedAt) return null;
      if (row.lockedUntil && row.lockedUntil.getTime() > now.getTime()) throw new NotificationInProgressException(key);

      // Free or expired: one UPDATE wins (the database serialises them and re-checks the lease).
      const base = { key, completedAt: IsNull() };
      for (const free of [IsNull(), LessThanOrEqual(now)]) {
        const taken = await this.idempotencyRepo.update({ ...base, lockedUntil: free }, { lockedUntil: lease });
        if (taken.affected) {
          return { key, notificationId: row.notificationId, ablyDone: row.ablyDone, emailDone: row.emailDone };
        }
      }
      throw new NotificationInProgressException(key);
    }
    throw new NotificationInProgressException(key);
  }

  private async deliver(payload: NotificationPayload, progress: ChannelProgress | null): Promise<Notification | null> {
    const prefs = await this.prefRepo.findOne({ where: { userId: payload.recipientId } });
    const resolved = this.resolvePreferences(prefs);

    const itemId = payload.event;
    const item = resolved.notifications[itemId];

    // The name a publisher emits is not always the id the preference screen
    // stores against, so resolve before looking the preference up. The stored
    // row keeps `payload.category` untouched — that value is what the
    // notification list filters on.
    const categoryId = resolveCategoryId(payload.category);
    if (!categoryId) {
      this.logger.warn(
        `Category "${payload.category}" (event ${payload.event}) matches no catalog id or alias; ` +
          `this notification ignores the recipient's category preferences. ` +
          `Add it to CATEGORY_ALIASES or emit a catalog id.`,
      );
    }
    const categoryPref = categoryId
      ? resolved.categories[categoryId]
      : undefined;

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

    // The row IS the in-app notification — the bell panel and the unread count
    // read this table and nothing else. It used to be written before any of the
    // checks above, so a recipient who had switched a category off, or
    // everything off, still accumulated rows and an unread badge for it. The
    // publisher's own suppression had the same hole: invitations-service
    // documents having to skip the emit entirely because `delivery.inApp:false`
    // still listed the notification and still counted it unread.
    //
    // Deliberately not stored-but-hidden. Hiding needs a column, a filter on
    // every read, and a rule for what un-hides it; "In App off" has one honest
    // meaning, which is that it does not go in the panel. Nothing is lost that
    // the recipient asked to receive — email below is decided separately.
    if (!inAppAllowed) {
      this.logger.log(
        `In-app suppressed for user ${payload.recipientId} (event ${payload.event}, ` +
          `category ${payload.category}); not stored.`,
      );
    }

    // A keyed notification's row has a deterministic id, so the same key can only ever be one
    // stored row; if an earlier attempt already stored it, it is read back, not stored again.
    let saved: Notification | null = null;
    if (inAppAllowed) {
      if (progress?.notificationId) {
        saved = await this.notifRepo.findOne({ where: { id: progress.notificationId } });
      }
      if (!saved) {
        saved = await this.notifRepo.save(
          this.notifRepo.create({
            ...(progress ? { id: notificationIdForKey(progress.key) } : {}),
            userId: payload.recipientId,
            title: payload.title,
            body: payload.body,
            link: payload.link,
            category: payload.category,
            event: payload.event,
            metadata: payload.metadata,
            origin: payload.origin || 'system',
          }),
        );
        if (progress) {
          await this.idempotencyRepo.update({ key: progress.key }, { notificationId: saved.id });
          progress.notificationId = saved.id;
        }
      }
    }

    // Channels are independent. Each one that succeeds is recorded at once, and a keyed retry
    // skips the ones already done; a channel that fails is thrown at the end so it is retried.
    const failures: unknown[] = [];

    if (saved && !(progress?.ablyDone)) {
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
          if (progress) {
            await this.idempotencyRepo.update({ key: progress.key }, { ablyDone: true });
            progress.ablyDone = true;
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          if (progress) {
            // Keyed: the row is stored, and the realtime push is retried on its own.
            this.logger.warn(`Ably realtime delivery failed for user ${payload.recipientId}; it will be retried. Error: ${errMsg}`);
            failures.push(err);
          } else {
            this.logger.warn(
              `Ably realtime delivery failed for user ${payload.recipientId}; ` +
                `the notification is stored and will appear in the panel. Error: ${errMsg}`,
            );
          }
        }
      } else {
        this.logger.warn(
          `Ably is not configured; user ${payload.recipientId} will see this in the ` +
            `panel on next load rather than in real time.`,
        );
      }
    }

    // Email is decided by the Email switch alone. It used to also fire whenever
    // realtime in-app delivery had not succeeded — including when Ably was
    // simply not configured — which meant a recipient who had switched Email
    // off got emailed anyway, and the settings screen was lying to them.
    //
    // Nothing is silently dropped by removing that: the notification is stored
    // above whenever in-app is allowed, so a failed realtime push degrades to
    // "appears in the panel on next load" rather than to nothing. Both branches
    // of the Ably attempt already log which of those happened, so the flag that
    // used to drive the fallback has gone with it.
    const recipientAddress =
      resolved.channels.email.address ?? payload.recipientEmail;
    const shouldSendEmail = emailAllowed && !!recipientAddress;

    if (shouldSendEmail && recipientAddress && !(progress?.emailDone)) {
      this.logger.log(
        `Dispatching email: to=${recipientAddress} event=${payload.event} category=${payload.category} subject="${payload.title}"`,
      );
      try {
        await this.sendEmailViaBrevo(
          recipientAddress,
          payload.title,
          payload.body,
          payload.link,
        );
        if (progress) {
          await this.idempotencyRepo.update({ key: progress.key }, { emailDone: true });
          progress.emailDone = true;
        }
      } catch (err) {
        // Keyed: retried on its own, without storing or pushing again. Unkeyed: as before.
        if (!progress) throw err;
        this.logger.warn(`Email for key ${progress.key} failed and will be retried: ${err instanceof Error ? err.message : String(err)}`);
        failures.push(err);
      }
    } else if (progress?.emailDone) {
      this.logger.log(`Email already sent for key ${progress.key}; not repeated.`);
    } else {
      this.logger.log(
        `Email skipped: shouldSendEmail=${shouldSendEmail} recipientEmail=${recipientAddress ?? 'none'} event=${payload.event}`,
      );
    }

    if (failures.length) {
      const first = failures[0];
      throw first instanceof Error ? first : new ServiceUnavailableException(String(first));
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
    let pendingRequest: string | null = null;

    if (dto.channels) {
      const next: GlobalChannelPrefs = { ...resolved.channels };
      if (dto.channels.inApp) {
        next.inApp = { ...next.inApp, ...dto.channels.inApp };
      }
      if (dto.channels.email) {
        const requested = dto.channels.email.address;
        // Everything except the address applies straight away.
        next.email = {
          ...next.email,
          ...dto.channels.email,
          address: next.email.address,
        };

        if (requested !== undefined) {
          // Clearing the override, or setting it back to the address they
          // already sign in with, needs no proof — they have already proven
          // that one. Anything else goes to the waiting room instead of taking
          // effect, so a redirect cannot be completed by whoever asked for it.
          const normalised = requested?.trim().toLowerCase() || null;
          if (normalised === null) {
            next.email.address = null;
            prefs.pendingEmail = null;
            prefs.pendingEmailTokenHash = null;
            prefs.pendingEmailExpiresAt = null;
          } else if (normalised !== next.email.address?.toLowerCase()) {
            pendingRequest = normalised;
          }
        }
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

    if (pendingRequest) {
      await this.startEmailVerification(prefs, pendingRequest);
    }

    prefs.inAppEnabled = prefs.channels?.inApp.enabled ?? prefs.inAppEnabled;
    prefs.emailEnabled = prefs.channels?.email.enabled ?? prefs.emailEnabled;
    prefs.smsEnabled = prefs.channels?.sms.enabled ?? prefs.smsEnabled;

    await this.prefRepo.save(prefs);
    return prefs;
  }

  /**
   * The client's view of a preference row.
   *
   * An address waiting on confirmation is shown in the usual `address` field so
   * the settings dialog reflects what was just typed — otherwise saving would
   * look like it had failed. `addressPending` says which of the two it is:
   * true means notifications are still going to the previous address until the
   * link is clicked. Nothing in the UI reads that flag yet; it exists so a
   * pending state can be designed without another backend change.
   *
   * Only the presentation is swapped. `prefs.channels.email.address` on disk
   * stays the verified value, which is the one dispatch reads.
   */
  presentPreferences(prefs: UserPreference): UserPreference & {
    addressPending?: boolean;
  } {
    if (!prefs.pendingEmail) return prefs;

    const channels = prefs.channels ?? this.cloneDefaultChannels();
    return {
      ...prefs,
      channels: {
        ...channels,
        email: { ...channels.email, address: prefs.pendingEmail },
      },
      addressPending: true,
    } as UserPreference & { addressPending?: boolean };
  }

  /** How long a confirmation link stays good for. */
  private static readonly EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Records the requested address and emails it a confirmation link. Mutates
   * `prefs` rather than saving — the caller is mid-update and saves once.
   */
  private async startEmailVerification(
    prefs: UserPreference,
    address: string,
  ): Promise<void> {
    const token = randomBytes(32).toString('hex');
    prefs.pendingEmail = address;
    prefs.pendingEmailTokenHash = this.hashToken(token);
    prefs.pendingEmailExpiresAt = new Date(
      Date.now() + NotificationService.EMAIL_TOKEN_TTL_MS,
    );

    const base = (process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
    const link = `${base}/v1/notifications/preferences/email/verify?token=${token}`;

    // Sent to the requested address, never to the current one — the point is to
    // prove whoever asked can read the new inbox.
    await this.sendEmailViaBrevo(
      address,
      'Confirm your notification email address',
      'Confirm this address to start receiving Marketeq notifications here. ' +
        'Until you do, notifications keep going to your current address. ' +
        'If you did not request this, ignore this message and nothing changes.',
      link,
    );

    this.logger.log(
      `Notification email change requested for user ${prefs.userId}; confirmation sent to ${address}.`,
    );
  }

  /**
   * Completes a change. Promotes the pending address into `channels.email`,
   * which is the only field dispatch reads, and clears the waiting room.
   */
  async verifyPendingEmail(token: string): Promise<{ address: string }> {
    if (!token?.trim()) throw new BadRequestException('Token is required');

    const prefs = await this.prefRepo.findOne({
      where: { pendingEmailTokenHash: this.hashToken(token.trim()) },
    });
    if (!prefs || !prefs.pendingEmail) {
      throw new NotFoundException(
        'That confirmation link is not valid. It may already have been used.',
      );
    }
    if (
      prefs.pendingEmailExpiresAt &&
      prefs.pendingEmailExpiresAt.getTime() < Date.now()
    ) {
      // Cleared on expiry so a stale row cannot be retried indefinitely.
      prefs.pendingEmail = null;
      prefs.pendingEmailTokenHash = null;
      prefs.pendingEmailExpiresAt = null;
      await this.prefRepo.save(prefs);
      throw new BadRequestException(
        'That confirmation link has expired. Request the change again.',
      );
    }

    const address = prefs.pendingEmail;
    const channels = prefs.channels ?? this.cloneDefaultChannels();
    channels.email = { ...channels.email, address };
    prefs.channels = channels;
    prefs.pendingEmail = null;
    prefs.pendingEmailTokenHash = null;
    prefs.pendingEmailExpiresAt = null;
    await this.prefRepo.save(prefs);

    this.logger.log(
      `Notification email confirmed for user ${prefs.userId}; now delivering to ${address}.`,
    );
    return { address };
  }

  async resetPreferences(userId: string): Promise<UserPreference> {
    const prefs = await this.getOrCreatePreferences(userId);
    prefs.channels = this.cloneDefaultChannels();
    // A reset drops the override, so an unconfirmed change must go with it —
    // otherwise a later click would apply an address the user has since
    // reset away.
    prefs.pendingEmail = null;
    prefs.pendingEmailTokenHash = null;
    prefs.pendingEmailExpiresAt = null;
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

  /**
   * PMCM-806: withdrawal submitted / completed / failed / cancelled. Each is a push (the
   * in-app notification, delivered live over Ably) and an email.
   *
   * The push goes through dispatch(), so the recipient's in-app switches
   * apply. `payouts` resolves to the General category (CATEGORY_ALIASES).
   *
   * The email is transactional and is sent whatever the email preferences say,
   * like the invitation emails above. Every catalog category defaults email
   * to off, so under dispatch()'s rules this email would almost never be
   * delivered. A contractor told nothing about where their money went is the
   * gap this ticket closes. It still goes to the notification address the
   * recipient confirmed, when they set one.
   *
   * No quiet hours or batching exist in this service, so N-03 is delivered
   * immediately (AC-07) without any special casing.
   */
  async sendWithdrawalNotification(payload: WithdrawalNotificationPayload) {
    const kind = payload.kind;
    if (kind !== 'submitted' && kind !== 'completed' && kind !== 'failed' && kind !== 'cancelled') {
      this.logger.warn(`Withdrawal notification with unknown kind "${String(kind)}" ignored`);
      return { sent: false };
    }
    const methodLabel = payload.methodLabel?.trim() || 'your payout method';
    const failureReason =
      kind === 'failed' ? normalizeFailureReason(payload.failureReason) : null;

    // AC-05: every push and the Track/View receipt CTAs open this payout's
    // detail view (PMCM-280), the Payout Details dialog on the Payouts tab,
    // which PayoutsTab opens from `?payout=<id>`. Deposit methods and the
    // Withdraw action both live on the Earnings Overview tab.
    const detailPath = `/earnings?tab=payouts&payout=${encodeURIComponent(payload.payoutRequestId)}`;
    const overviewPath = '/earnings?tab=overview';

    const push = buildWithdrawalPush({
      kind,
      amountUsd: payload.amountUsd,
      netAmountUsd: payload.netAmountUsd,
      methodLabel,
      estimatedArrivalAt: payload.estimatedArrivalAt,
    });

    try {
      await this.dispatch({
        recipientId: payload.recipientId,
        category: 'payouts',
        event: `payout.withdrawal.${kind}`,
        title: push.title,
        body: push.body,
        link: detailPath,
        metadata: {
          payoutRequestId: payload.payoutRequestId,
          depositMethodId: payload.depositMethodId ?? null,
          amountUsd: payload.amountUsd,
          netAmountUsd: payload.netAmountUsd,
          ...(failureReason ? { failureReason } : {}),
        },
        delivery: { inApp: true, email: false },
        origin: 'payout-service',
      });
    } catch (err) {
      // The email below must still go out if the in-app write fails.
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Withdrawal ${kind} in-app notification failed for ${payload.payoutRequestId}: ${message}`,
      );
    }

    const prefs = await this.prefRepo.findOne({ where: { userId: payload.recipientId } });
    const to = prefs?.channels?.email?.address || payload.recipientEmail || null;
    if (!to) {
      this.logger.warn(
        `Withdrawal ${kind} email skipped for ${payload.payoutRequestId}: no address for user ${payload.recipientId}`,
      );
      return { sent: false };
    }

    const appBase = this.resolveAppBaseUrl();
    const { subject, html, text } = buildWithdrawalEmail({
      kind,
      firstName: payload.firstName,
      amountUsd: payload.amountUsd,
      feeUsd: payload.feeUsd,
      netAmountUsd: payload.netAmountUsd,
      methodLabel,
      estimatedArrivalAt: payload.estimatedArrivalAt,
      arrivalWindow: payload.arrivalWindow,
      completedAt: payload.completedAt,
      failureReason,
      reference: payload.payoutRequestId,
      transactionUrl: `${appBase}${detailPath}`,
      reviewMethodUrl: `${appBase}${overviewPath}`,
      tryAgainUrl: `${appBase}${overviewPath}`,
      logoUrl: this.resolveLogoUrl(),
      supportEmail: process.env.SUPPORT_EMAIL?.trim() || 'support@marketeqdigital.com',
      socialLinks: this.resolveSocialLinks(),
    });

    await this.sendHtmlViaBrevo(to, subject, html, text);
    // Without BREVO_API_KEY sendHtmlViaBrevo only logs a mock email, so don't claim delivery.
    if (!(process.env.BREVO_API_KEY ?? '').trim()) {
      this.logger.log(`Withdrawal ${kind} email NOT delivered (no BREVO_API_KEY, mock logged) for ${payload.payoutRequestId}: to=${to}`);
      return { sent: false };
    }
    this.logger.log(`Withdrawal ${kind} email sent for ${payload.payoutRequestId}: to=${to}`);
    return { sent: true };
  }

  /** The web app's origin for email links. FRONTEND_URL can be a
   * comma-separated list of trusted origins (see the env templates); the
   * first one is the canonical app URL. */
  private resolveAppBaseUrl(): string {
    const first = (process.env.FRONTEND_URL ?? '').split(',')[0]?.trim();
    return (first || 'http://localhost:3000').replace(/\/+$/, '');
  }
}
