// apps/notification-service/src/subscribers/offer-created.subscriber.ts
// BTB-364/D4: offer-service publishes offer.created (and every other offer
// event) onto its own topic exchange, already bound into
// marketeq.offers.notifications by offer-service's own RabbitMQPublisher —
// but nothing ever consumed that queue. NestJS's @EventPattern/Transport.RMQ
// mechanism can't either: notification-service's one RMQ microservice
// transport is wired to a completely different queue
// (notification_service_queue, delivery.constants.ts), and an @EventPattern
// handler only ever receives what's delivered to the ONE queue the
// transport is configured with. This is a second, independent AMQP
// connection, modeled on contracts-service's offer-accepted.subscriber.ts —
// the one other real consumer of this exchange anywhere in the backend.
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { NotificationService } from '../services/notification.service';
import { UserServiceClient } from '../clients/user-service.client';

// Topology is declared by offer-service (apps/offer-service/src/messaging/
// constants/rabbitmq.constants.ts + rabbitmq.publisher.ts): a durable queue
// bound to marketeq.offers for ALL offer.* events ('offer.#'), dead-lettering
// to marketeq.offers.dlx. The assertQueue arguments below must match
// offer-service's exactly or RabbitMQ rejects the declare with
// PRECONDITION_FAILED.
const OFFER_EXCHANGE = 'marketeq.offers';
const OFFER_DLX = 'marketeq.offers.dlx';
const QUEUE_NOTIFICATIONS = 'marketeq.offers.notifications';
const DLX_KEY_NOTIFICATIONS = 'marketeq.offers.notifications';
const BINDING_PATTERN = 'offer.#';
const RECONNECT_DELAY_MS = 5000;

// F3: marketeq.offers.notifications has had no consumer at all until this
// subscriber — on a real environment it may be holding every offer.created
// published since launch. Without this guard, the very first deploy would
// turn every one of those into a brand-new "New Offer" notification dated
// today. 7 days, not "since launch": an event genuinely a few hours or days
// old on a slow-draining queue is still real news to the talent; only truly
// stale backlog should be silently dropped.
const BACKLOG_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface OfferTermsPayload {
  rate: number;
  currencyCode: string;
  durationMonths: number;
  workSchedule: { type: string; hoursPerWeek?: number };
  startDate: string;
  message: string | null;
}

interface OfferCreatedPayload {
  eventType: string;
  // BTB-364/D4 follow-up (F3): set by offer-payload-builders.ts's base() on
  // every event, including offer.created — new Date().toISOString() at the
  // moment the outbox row was built. The one real "when did this happen"
  // field on the payload itself.
  occurredAt?: string;
  offerId: string;
  clientId: string;
  talentId: string;
  jobListingId: string | null;
  contractType: string;
  contractTitle: string;
  terms?: OfferTermsPayload;
  expiresAt?: string;
}

/**
 * BTB-364/D4: on offer.created, stores the recipient talent's "New Offer"
 * in-app notification row. Every OTHER offer.* event reaching this same
 * queue (accepted/declined/withdrawn/expired/countered/edited/resent/the
 * counter-offer family) is acked and skipped — out of scope for this pass,
 * not a malformed-message condition, so it must never be dead-lettered.
 */
@Injectable()
export class OfferCreatedSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OfferCreatedSubscriber.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shuttingDown = false;
  // F3: running total for this process's lifetime, logged with each skip so
  // "how big was the backlog" is visible from the logs alone, without a
  // dashboard query.
  private backlogSkippedCount = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly notifications: NotificationService,
    private readonly users: UserServiceClient,
  ) {}

  async onModuleInit(): Promise<void> {
    // Don't block boot on the broker — HTTP routes must come up even when
    // RabbitMQ is down; the consumer attaches once it's reachable.
    void this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  private async connect(): Promise<void> {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) {
      this.logger.warn('RABBITMQ_URL not set — offer.created consumer disabled');
      return;
    }
    try {
      const connection = await amqp.connect(url);
      connection.on('error', (err: Error) => this.logger.error(`RabbitMQ connection error: ${err.message}`));
      connection.on('close', () => this.scheduleReconnect());
      this.connection = connection;

      const channel = await connection.createChannel();
      // Same reasoning as contracts-service's subscriber: an unhandled
      // channel 'error' crashes the process, and with no 'close' handler the
      // consumer silently stops. Close the connection and let its own
      // 'close' handler drive reconnection.
      channel.on('error', (err: Error) => this.logger.error(`RabbitMQ channel error: ${err.message}`));
      channel.on('close', () => {
        if (this.shuttingDown) return;
        this.logger.warn('RabbitMQ channel closed — reconnecting');
        connection.close().catch(() => undefined);
      });
      await channel.assertExchange(OFFER_EXCHANGE, 'topic', { durable: true, autoDelete: false });
      await channel.assertExchange(OFFER_DLX, 'direct', { durable: true, autoDelete: false });
      await channel.assertQueue(QUEUE_NOTIFICATIONS, {
        durable: true,
        autoDelete: false,
        arguments: {
          'x-dead-letter-exchange': OFFER_DLX,
          'x-dead-letter-routing-key': DLX_KEY_NOTIFICATIONS,
        },
      });
      await channel.bindQueue(QUEUE_NOTIFICATIONS, OFFER_EXCHANGE, BINDING_PATTERN);
      await channel.prefetch(10);
      await channel.consume(QUEUE_NOTIFICATIONS, (msg) => void this.handle(channel, msg));
      this.channel = channel;
      this.logger.log(`Consuming ${QUEUE_NOTIFICATIONS} (acting on offer.created only)`);
    } catch (err) {
      this.logger.error(`Failed to start offer.created consumer: ${(err as Error).message}`);
      await this.connection?.close().catch(() => undefined);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    this.channel = null;
    this.connection = null;
    if (this.shuttingDown || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, RECONNECT_DELAY_MS);
  }

  // F3: payload.occurredAt first (the event's own, real timestamp); the
  // AMQP message's own `timestamp` property second (set by offer-service's
  // RabbitMQPublisher.publish() — Math.floor(Date.now()/1000), unix
  // seconds) as a fallback for an older/malformed payload that predates
  // occurredAt. `null` (not a guess) when neither resolves.
  private resolveEventTime(payload: OfferCreatedPayload, msg: amqp.ConsumeMessage): Date | null {
    if (payload.occurredAt) {
      const parsed = new Date(payload.occurredAt);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const amqpTimestamp = msg.properties?.timestamp;
    if (typeof amqpTimestamp === 'number' && Number.isFinite(amqpTimestamp) && amqpTimestamp > 0) {
      return new Date(amqpTimestamp * 1000);
    }
    return null;
  }

  private async handle(channel: amqp.Channel, msg: amqp.ConsumeMessage | null): Promise<void> {
    if (!msg) return;

    let payload: OfferCreatedPayload;
    try {
      payload = JSON.parse(msg.content.toString()) as OfferCreatedPayload;
    } catch {
      this.logger.error('Unparseable offer event — dead-lettering');
      channel.nack(msg, false, false);
      return;
    }

    const eventType = payload.eventType ?? msg.fields.routingKey;
    if (eventType !== 'offer.created') {
      // Out of scope for this pass (see the class comment) — a real,
      // well-formed event this consumer just doesn't act on yet, not a
      // failure. Ack so it is never redelivered or dead-lettered.
      channel.ack(msg);
      return;
    }

    if (!payload.offerId || !payload.clientId || !payload.talentId || !payload.terms) {
      this.logger.error(`Malformed offer.created for offer ${payload.offerId ?? '?'} — dead-lettering`);
      channel.nack(msg, false, false);
      return;
    }

    // F3: backlog guard — must run before anything else does real work
    // (the user lookup, the dispatch), so a stale backlog costs nothing
    // beyond the ack itself.
    const eventTime = this.resolveEventTime(payload, msg);
    if (eventTime === null) {
      // "Report it instead of guessing" (per the ticket) — this is NOT
      // treated as backlog, since that would be guessing it's old. It is
      // processed normally; only the age check is skipped.
      this.logger.error(
        `Could not determine occurredAt for offer.created ${payload.offerId} — no occurredAt on the payload and no AMQP message timestamp property. Processing without a backlog-age check.`,
      );
    } else if (Date.now() - eventTime.getTime() > BACKLOG_MAX_AGE_MS) {
      this.backlogSkippedCount += 1;
      const ageDays = Math.floor((Date.now() - eventTime.getTime()) / (24 * 60 * 60 * 1000));
      this.logger.log(
        `Skipping stale offer.created ${payload.offerId} (${ageDays}d old, occurredAt=${eventTime.toISOString()}) — backlog skipped so far this run: ${this.backlogSkippedCount}`,
      );
      channel.ack(msg);
      return;
    }

    const { terms } = payload;
    const offerRate = `${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: terms.currencyCode,
      maximumFractionDigits: 0,
    }).format(terms.rate)}/hr`;
    const scheduleLabel =
      terms.workSchedule.type === 'FULL_TIME'
        ? 'Full Time'
        : terms.workSchedule.type === 'PART_TIME'
          ? 'Part Time'
          : 'Custom';

    // F2: offer.created's own payload only ever carries clientId, never the
    // client's profile — resolve it via the one real precedent for this
    // (contracts-service's/invitations-service's own user-service.client.ts,
    // GET /internal/users/:id/summary). A lookup failure must not drop the
    // notification — the talent still needs to know an offer arrived — so
    // this degrades to a safe, honest fallback name instead of throwing.
    let senderDisplayName = 'A client';
    let senderUsername: string | undefined;
    let senderAvatarUrl: string | undefined;
    try {
      const summary = await this.users.getUserSummary(payload.clientId);
      const fullName = [summary.firstName, summary.lastName].filter(Boolean).join(' ').trim();
      senderDisplayName = fullName || summary.username || 'A client';
      senderUsername = summary.username ? `@${summary.username}` : undefined;
      senderAvatarUrl = summary.avatarUrl;
    } catch (err) {
      this.logger.warn(
        `Could not resolve client ${payload.clientId}'s profile for offer ${payload.offerId}'s notification — using the fallback name "A client". Error: ${(err as Error).message}`,
      );
    }

    try {
      // F3: NotificationPayload/NotificationService.dispatch() has no field
      // for overriding the stored row's createdAt (it's a plain
      // @CreateDateColumn, always "now" at insert) — confirmed by reading
      // notification.service.ts's deliver(). Not added here: that is a
      // shared type/method every other producer also calls, so widening it
      // is a separate, more central change than this one event's backlog
      // guard. Reported, not built: a non-stale-but-not-brand-new event
      // (e.g. 3 days old) still gets today's date on its notification row.
      await this.notifications.dispatch({
        recipientId: payload.talentId,
        category: 'offers',
        // BTB-364/D4 follow-up (F1): 'offer.received', not 'offer.created' —
        // the seeded notifications that render correctly in the inbox/bell
        // (backend/scripts/qa-seed-sakshi-offers.js, qa-seed-demo1-offers.js)
        // use 'offer.received' for a talent's new-offer notification. Both
        // are already handled identically everywhere that actually matters
        // for rendering (frontend/libs/notifications.ts's
        // OFFER_NOTIFICATION_TITLE/OFFER_NOTIFICATION_CTA/inferOfferEventFromTitle
        // and chats-comp.tsx's OFFER_EVENT_ACTION all list 'offer.received'
        // and 'offer.created' with identical values) — this just matches
        // the convention the one other place that's confirmed working
        // already uses, not a functional requirement.
        event: 'offer.received',
        title: 'New Offer',
        body: `${senderDisplayName} sent you a new offer at ${offerRate}.`,
        // getNotificationHref (frontend/libs/notifications.ts) ignores this
        // field entirely for any offer-category notification and computes
        // its own destination from `event` — /notifications for every offer
        // event except offer.accepted/offer.counter_accepted. This value is
        // never read for offer.received, set to match what the frontend
        // will actually navigate to, not left as a dead link.
        link: '/notifications',
        metadata: {
          offerId: payload.offerId,
          clientPerspective: false,
          actorId: payload.clientId,
          senderDisplayName,
          senderUsername,
          senderAvatarUrl,
          avatarUrl: senderAvatarUrl,
          jobListingId: payload.jobListingId,
          offerType: payload.contractType,
          contractType: payload.contractType,
          offerTitle: payload.contractTitle,
          contractTitle: payload.contractTitle,
          offerRate,
          duration: `${terms.durationMonths} Month${terms.durationMonths === 1 ? '' : 's'}`,
          schedule: scheduleLabel,
          scheduleLabel,
          startDate: terms.startDate,
          expiresAt: payload.expiresAt ?? null,
          contractId: null,
        },
        origin: 'system',
        // In-app only — no approved email copy for this event exists yet;
        // scoped tight per the ticket, not building one here.
        delivery: { inApp: true, email: false },
        // Idempotent on the offer id: a redelivered offer.created (broker
        // redelivery, a reconnect) must not create a second row.
        idempotencyKey: `offer.created:${payload.offerId}`,
      });
      channel.ack(msg);
    } catch (err) {
      this.logger.error(`Failed to store notification for offer ${payload.offerId}: ${(err as Error).message}`);
      channel.nack(msg, false, !msg.fields.redelivered);
    }
  }
}
