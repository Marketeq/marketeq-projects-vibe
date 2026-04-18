import amqp, { ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import type { Payload } from 'payload';

const QUEUE = 'contracts_events_queue';

interface ContractActivatedFields {
  contractId: string;
  groupId: string;
  clientId: string;
  talentId: string;
  startAtISO: string;
  // Optional fields contracts-service may add later — see CS-00 §727 pseudo-code.
  listingId?: string;
  orderType?: 'project' | 'service' | 'team' | 'talent' | 'job';
  amount?: number;
}

/**
 * NestJS `client.emit('contract.activated', payload)` lands on the queue
 * wrapped in two envelopes:
 *   - NestJS:                 { pattern, data }
 *   - events.service.ts:11:   { eventName, timestamp, data: <inner-fields> }
 * Unwrap both to get the actual `ContractActivatedFields`.
 */
function extractActivatedEvent(raw: unknown): ContractActivatedFields | null {
  if (!raw || typeof raw !== 'object') return null;
  const outer = raw as { pattern?: string; data?: unknown };
  if (outer.pattern !== 'contract.activated') return null;
  const inner = outer.data as { eventName?: string; data?: unknown } | null | undefined;
  const fields = (inner?.data ?? inner) as ContractActivatedFields | null | undefined;
  if (!fields || typeof fields !== 'object') return null;
  if (!fields.contractId || !fields.clientId) return null;
  return fields;
}

export class ContractsEventConsumer {
  private channelWrapper: ChannelWrapper | null = null;

  constructor(private readonly payload: Payload) {}

  async connect(url: string): Promise<void> {
    const connection = amqp.connect([url]);

    this.channelWrapper = connection.createChannel({
      json: true,
      setup: async (channel: ConfirmChannel) => {
        // The queue is owned/declared by contracts-service's NestJS RMQ
        // ClientProxy. assertQueue with the same args is a no-op when the
        // queue already exists; declaring here means the consumer can
        // start cleanly even if it boots before contracts-service.
        await channel.assertQueue(QUEUE, { durable: true });
        await channel.prefetch(1);
        await channel.consume(QUEUE, (msg) => this.handle(channel, msg));
      },
    });

    await this.channelWrapper.waitForConnect();
    this.payload.logger.info(`[ContractsEventConsumer] subscribed to ${QUEUE}`);
  }

  private async handle(channel: ConfirmChannel, msg: ConsumeMessage | null): Promise<void> {
    if (!msg) return;
    let raw: unknown;
    try {
      raw = JSON.parse(msg.content.toString('utf-8'));
    } catch (err) {
      this.payload.logger.warn({ err }, '[ContractsEventConsumer] non-JSON message — dropping');
      channel.ack(msg);
      return;
    }

    const event = extractActivatedEvent(raw);
    // Other contract.* patterns (ended, disputed, canceled, etc.) land on
    // the same queue — ack and skip until they have their own handlers.
    if (!event) {
      channel.ack(msg);
      return;
    }

    try {
      await this.upsertOrder(event);
      channel.ack(msg);
    } catch (err) {
      this.payload.logger.error(
        { err, contractId: event.contractId },
        '[ContractsEventConsumer] failed to project contract.activated → orders',
      );
      // requeue once; persistent failures will hit the DLX if configured upstream
      channel.nack(msg, false, true);
    }
  }

  /**
   * Project a `contract.activated` event into the Orders collection.
   *
   * Idempotent on `sourceId === contractId` so re-deliveries are safe.
   * Per CS-00 §lines 720-770: cms-service does not process orders or
   * payments — it records them for admin visibility only. Missing client
   * users are logged + skipped rather than blocking the message; admin
   * can backfill once the user-service sync lands.
   */
  private async upsertOrder(event: ContractActivatedFields): Promise<void> {
    // Idempotency check
    const existing = await this.payload.find({
      collection: 'orders',
      where: { sourceId: { equals: event.contractId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (existing.totalDocs > 0) {
      this.payload.logger.info(
        `[ContractsEventConsumer] order for contract ${event.contractId} already exists — skipping`,
      );
      return;
    }

    const clientUser = await this.findUserBySourceId(event.clientId);
    if (!clientUser) {
      this.payload.logger.warn(
        `[ContractsEventConsumer] client user with sourceId=${event.clientId} not found in CMS — skipping order create. Admin must backfill once user sync runs.`,
      );
      return;
    }
    const talentUser = event.talentId ? await this.findUserBySourceId(event.talentId) : null;

    await this.payload.create({
      collection: 'orders',
      overrideAccess: true,
      data: {
        orderNumber: `CONTRACT-${event.contractId}`,
        sourceId: event.contractId,
        client: clientUser.id,
        ...(talentUser ? { talent: talentUser.id } : {}),
        ...(event.orderType ? { orderType: event.orderType } : {}),
        ...(event.amount != null ? { totalAmount: event.amount } : {}),
        status: 'active',
        ...(event.startAtISO ? { startDate: event.startAtISO } : {}),
        notes: `Auto-created from contract.activated (groupId=${event.groupId})`,
      } as Record<string, unknown>,
    });

    this.payload.logger.info(
      `[ContractsEventConsumer] created order CONTRACT-${event.contractId} (client=${clientUser.id}${talentUser ? `, talent=${talentUser.id}` : ''})`,
    );
  }

  private async findUserBySourceId(sourceId: string): Promise<{ id: number | string } | null> {
    const res = await this.payload.find({
      collection: 'users',
      where: { sourceId: { equals: sourceId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    return (res.docs[0] as { id: number | string } | undefined) ?? null;
  }
}
