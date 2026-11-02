import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { AcceptedOfferInput, GroupsService } from '../services/groups.service';

// Topology is declared by offer-service (apps/offer-service/src/messaging/
// constants/rabbitmq.constants.ts): a durable queue bound to
// marketeq.offers for offer.accepted + offer.counter_accepted, dead-lettering
// to marketeq.offers.dlx. The assertQueue arguments below must match
// offer-service's exactly or RabbitMQ rejects the declare with
// PRECONDITION_FAILED.
const OFFER_EXCHANGE = 'marketeq.offers';
const OFFER_DLX = 'marketeq.offers.dlx';
const QUEUE_CONTRACTS = 'marketeq.offers.contracts';
const DLX_KEY_CONTRACTS = 'marketeq.offers.contracts';
const ROUTING_KEYS = ['offer.accepted', 'offer.counter_accepted'] as const;
const RECONNECT_DELAY_MS = 5000;

interface TermsPayload {
  rate: number;
  durationMonths: number;
  workSchedule: { type: string; hoursPerWeek?: number };
  currencyCode?: string;
}

interface OfferEventPayload {
  eventType: string;
  offerId: string;
  clientId: string;
  talentId: string;
  jobListingId: string | null;
  contractType: string;
  contractTitle: string | null;
  terms?: TermsPayload;
  counterOfferTerms?: TermsPayload;
}

/**
 * OS-07 (CR-01): contracts-service creates a contract ONLY after an offer
 * is accepted. offer-service publishes offer.accepted (talent accepts the
 * original offer) and offer.counter_accepted (either side accepts a
 * counter) — both mean agreed terms, so both create the contract, using
 * the terms that were actually agreed.
 */
@Injectable()
export class OfferAcceptedSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OfferAcceptedSubscriber.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shuttingDown = false;

  constructor(
    private readonly config: ConfigService,
    private readonly groups: GroupsService,
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
      this.logger.warn('RABBITMQ_URL not set — offer.accepted consumer disabled');
      return;
    }
    try {
      const connection = await amqp.connect(url);
      connection.on('error', (err: Error) => this.logger.error(`RabbitMQ connection error: ${err.message}`));
      connection.on('close', () => this.scheduleReconnect());
      this.connection = connection;

      const channel = await connection.createChannel();
      // The broker can close just this channel (PRECONDITION_FAILED on a
      // topology mismatch, an ack of an unknown delivery tag) while the
      // connection stays up. amqplib then emits 'error' on the channel, which
      // with no listener is an unhandled 'error' event that crashes the
      // process, and without a 'close' handler the consumer would silently
      // stop. Closing the connection hands recovery to its 'close' handler.
      channel.on('error', (err: Error) => this.logger.error(`RabbitMQ channel error: ${err.message}`));
      channel.on('close', () => {
        if (this.shuttingDown) return;
        this.logger.warn('RabbitMQ channel closed — reconnecting');
        connection.close().catch(() => undefined);
      });
      await channel.assertExchange(OFFER_EXCHANGE, 'topic', { durable: true, autoDelete: false });
      await channel.assertExchange(OFFER_DLX, 'direct', { durable: true, autoDelete: false });
      await channel.assertQueue(QUEUE_CONTRACTS, {
        durable: true,
        autoDelete: false,
        arguments: {
          'x-dead-letter-exchange': OFFER_DLX,
          'x-dead-letter-routing-key': DLX_KEY_CONTRACTS,
        },
      });
      for (const key of ROUTING_KEYS) {
        await channel.bindQueue(QUEUE_CONTRACTS, OFFER_EXCHANGE, key);
      }
      await channel.prefetch(10);
      await channel.consume(QUEUE_CONTRACTS, (msg) => void this.handle(channel, msg));
      this.channel = channel;
      this.logger.log(`Consuming ${QUEUE_CONTRACTS} (${ROUTING_KEYS.join(', ')})`);
    } catch (err) {
      this.logger.error(`Failed to start offer.accepted consumer: ${(err as Error).message}`);
      // A failure after connecting (createChannel, a declare) leaves the
      // connection open; close it so each retry doesn't leak one.
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

  private async handle(channel: amqp.Channel, msg: amqp.ConsumeMessage | null): Promise<void> {
    if (!msg) return;

    let payload: OfferEventPayload;
    try {
      payload = JSON.parse(msg.content.toString()) as OfferEventPayload;
    } catch {
      this.logger.error('Unparseable offer event — dead-lettering');
      channel.nack(msg, false, false);
      return;
    }

    const eventType = payload.eventType ?? msg.fields.routingKey;
    const terms = eventType === 'offer.counter_accepted' ? payload.counterOfferTerms : payload.terms;
    if (!payload.offerId || !payload.clientId || !payload.talentId || !terms) {
      this.logger.error(`Malformed ${eventType} for offer ${payload.offerId ?? '?'} — dead-lettering`);
      channel.nack(msg, false, false);
      return;
    }

    const input: AcceptedOfferInput = {
      offerId: payload.offerId,
      clientId: payload.clientId,
      talentId: payload.talentId,
      jobListingId: payload.jobListingId ?? null,
      contractType: payload.contractType,
      contractTitle: payload.contractTitle ?? null,
      terms,
    };

    try {
      const { contract, created } = await this.groups.createFromAcceptedOffer(input);
      this.logger.log(
        created
          ? `Created contract ${contract.id} (PENDING) from ${eventType} ${payload.offerId}`
          : `Contract ${contract.id} already exists for offer ${payload.offerId} — skipped`,
      );
      channel.ack(msg);
    } catch (err) {
      // A DB outage shouldn't lose the offer: requeue once, then let the
      // DLQ hold it for inspection instead of hot-looping.
      this.logger.error(`Failed to create contract for offer ${payload.offerId}: ${(err as Error).message}`);
      channel.nack(msg, false, !msg.fields.redelivered);
    }
  }
}
