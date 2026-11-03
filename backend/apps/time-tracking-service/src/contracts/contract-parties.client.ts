import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as amqp from 'amqplib';

// Answered by contracts-service (subscribers/contract-parties.responder.ts).
// The queue name must match on both sides.
const CONTRACT_PARTIES_QUEUE = 'contracts.parties.rpc';
const REPLY_QUEUE = 'amq.rabbitmq.reply-to';
const REQUEST_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 60_000;
const RECONNECT_DELAY_MS = 5000;

export interface ContractParties {
  id: string;
  clientId: string;
  talentId: string;
  status: string;
  // PMCM-829: weekly time cap from the contract. Null = no cap.
  weeklyCapHours?: number | null;
}

interface PartiesRequest {
  contractIds?: string[];
  clientId?: string;
  talentId?: string;
}

interface Pending {
  resolve: (rows: ContractParties[]) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

/**
 * Who is the client and who is the talent on a contract. time-tracking-service
 * does not own contracts, so it asks contracts-service over RabbitMQ
 * (request/reply with direct reply-to) and caches answers briefly.
 */
@Injectable()
export class ContractPartiesClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContractPartiesClient.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private connecting: Promise<void> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shuttingDown = false;
  private readonly pending = new Map<string, Pending>();
  private readonly byContract = new Map<string, { value: ContractParties | null; expires: number }>();
  private readonly byClient = new Map<string, { value: string[]; expires: number }>();

  async onModuleInit(): Promise<void> {
    void this.ensureConnected().catch(() => undefined);
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error('shutting down'));
    }
    this.pending.clear();
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  /** Parties for each requested contract. Unknown contracts are absent from the map. */
  async getParties(contractIds: string[]): Promise<Map<string, ContractParties>> {
    const now = Date.now();
    const result = new Map<string, ContractParties>();
    const missing: string[] = [];
    for (const id of new Set(contractIds.filter(Boolean))) {
      const hit = this.byContract.get(id);
      if (hit && hit.expires > now) {
        if (hit.value) result.set(id, hit.value);
      } else {
        missing.push(id);
      }
    }
    if (missing.length) {
      const rows = await this.request({ contractIds: missing });
      const found = new Map(rows.map((r) => [r.id, r]));
      for (const id of missing) {
        const row = found.get(id) ?? null;
        this.byContract.set(id, { value: row, expires: now + CACHE_TTL_MS });
        if (row) result.set(id, row);
      }
    }
    return result;
  }

  /** Ids of every contract where this user is the client. */
  async contractIdsForClient(clientId: string): Promise<string[]> {
    const now = Date.now();
    const hit = this.byClient.get(clientId);
    if (hit && hit.expires > now) return hit.value;
    const rows = await this.request({ clientId });
    for (const r of rows) this.byContract.set(r.id, { value: r, expires: now + CACHE_TTL_MS });
    const ids = rows.map((r) => r.id);
    this.byClient.set(clientId, { value: ids, expires: now + CACHE_TTL_MS });
    return ids;
  }

  private async request(body: PartiesRequest): Promise<ContractParties[]> {
    try {
      await this.ensureConnected();
    } catch {
      throw new ServiceUnavailableException('Contract lookup is unavailable. Try again shortly');
    }
    const channel = this.channel;
    if (!channel) throw new ServiceUnavailableException('Contract lookup is unavailable. Try again shortly');

    const correlationId = randomUUID();
    return new Promise<ContractParties[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(correlationId);
        reject(new ServiceUnavailableException('Contract lookup timed out. Try again shortly'));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(correlationId, { resolve, reject, timer });
      channel.sendToQueue(CONTRACT_PARTIES_QUEUE, Buffer.from(JSON.stringify(body)), {
        correlationId,
        replyTo: REPLY_QUEUE,
        contentType: 'application/json',
      });
    });
  }

  private onReply(msg: amqp.ConsumeMessage | null): void {
    if (!msg) return;
    const p = this.pending.get(msg.properties.correlationId);
    if (!p) return;
    this.pending.delete(msg.properties.correlationId);
    clearTimeout(p.timer);
    try {
      const reply = JSON.parse(msg.content.toString()) as { contracts?: ContractParties[]; error?: string };
      if (reply.error || !Array.isArray(reply.contracts)) {
        p.reject(new ServiceUnavailableException('Contract lookup failed. Try again shortly'));
        return;
      }
      p.resolve(reply.contracts);
    } catch {
      p.reject(new ServiceUnavailableException('Contract lookup failed. Try again shortly'));
    }
  }

  private ensureConnected(): Promise<void> {
    if (this.channel) return Promise.resolve();
    if (!this.connecting) {
      this.connecting = this.connect().finally(() => {
        this.connecting = null;
      });
    }
    return this.connecting;
  }

  private async connect(): Promise<void> {
    const url = process.env.RABBITMQ_URL ?? process.env.RABBITMQ_URI;
    if (!url) {
      this.logger.warn('RABBITMQ_URL not set — contract lookups disabled');
      throw new ServiceUnavailableException('RABBITMQ_URL not set');
    }
    try {
      const connection = await amqp.connect(url);
      connection.on('error', (err: Error) => this.logger.error(`RabbitMQ connection error: ${err.message}`));
      connection.on('close', () => this.scheduleReconnect());
      const channel = await connection.createChannel();
      // Direct reply-to: consume before publishing, with noAck as RabbitMQ requires.
      await channel.consume(REPLY_QUEUE, (msg) => this.onReply(msg), { noAck: true });
      this.connection = connection;
      this.channel = channel;
      this.logger.log('Contract parties client connected');
    } catch (err) {
      this.logger.error(`Contract parties client failed to connect: ${(err as Error).message}`);
      this.scheduleReconnect();
      throw err;
    }
  }

  private scheduleReconnect(): void {
    this.channel = null;
    this.connection = null;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new ServiceUnavailableException('Contract lookup is unavailable. Try again shortly'));
    }
    this.pending.clear();
    if (this.shuttingDown || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.ensureConnected().catch(() => undefined);
    }, RECONNECT_DELAY_MS);
  }
}
