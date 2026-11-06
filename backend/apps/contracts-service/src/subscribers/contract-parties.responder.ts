import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as amqp from 'amqplib';
import { Contract } from '../entities/contract.entity';

// Request/reply over RabbitMQ: other services (time-tracking-service) ask who
// the client and talent on a contract are, instead of reading this service's
// tables. The caller sets replyTo + correlationId; we answer on replyTo.
export const CONTRACT_PARTIES_QUEUE = 'contracts.parties.rpc';
const RECONNECT_DELAY_MS = 5000;
const MAX_IDS_PER_REQUEST = 500;

interface PartiesRequest {
  contractIds?: string[];
  clientId?: string;
  talentId?: string;
}

interface PartyRow {
  id: string;
  clientId: string;
  talentId: string;
  status: string;
  weeklyCapHours: number | null;
}

@Injectable()
export class ContractPartiesResponder implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContractPartiesResponder.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shuttingDown = false;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Contract) private readonly contracts: Repository<Contract>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Don't block boot on the broker, same as OfferAcceptedSubscriber.
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
      this.logger.warn('RABBITMQ_URL not set — contract parties responder disabled');
      return;
    }
    try {
      const connection = await amqp.connect(url);
      connection.on('error', (err: Error) => this.logger.error(`RabbitMQ connection error: ${err.message}`));
      connection.on('close', () => this.scheduleReconnect());
      this.connection = connection;

      const channel = await connection.createChannel();
      await channel.assertQueue(CONTRACT_PARTIES_QUEUE, { durable: true, autoDelete: false });
      await channel.prefetch(20);
      await channel.consume(CONTRACT_PARTIES_QUEUE, (msg) => void this.handle(channel, msg));
      this.channel = channel;
      this.logger.log(`Answering ${CONTRACT_PARTIES_QUEUE}`);
    } catch (err) {
      this.logger.error(`Failed to start contract parties responder: ${(err as Error).message}`);
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
    const { replyTo, correlationId } = msg.properties;

    let reply: { contracts: PartyRow[] } | { error: string };
    try {
      const req = JSON.parse(msg.content.toString()) as PartiesRequest;
      reply = { contracts: await this.lookup(req) };
    } catch (err) {
      this.logger.error(`Contract parties lookup failed: ${(err as Error).message}`);
      reply = { error: 'lookup_failed' };
    }

    if (replyTo) {
      channel.sendToQueue(replyTo, Buffer.from(JSON.stringify(reply)), {
        correlationId,
        contentType: 'application/json',
      });
    }
    channel.ack(msg);
  }

  private async lookup(req: PartiesRequest): Promise<PartyRow[]> {
    const select = { id: true, clientId: true, talentId: true, status: true, weeklyCapHours: true } as const;
    if (req.contractIds?.length) {
      const ids = req.contractIds.slice(0, MAX_IDS_PER_REQUEST);
      const rows = await this.contracts.find({ select, where: { id: In(ids) } });
      return rows.map((r) => this.toRow(r));
    }
    if (req.clientId) {
      const rows = await this.contracts.find({ select, where: { clientId: req.clientId } });
      return rows.map((r) => this.toRow(r));
    }
    if (req.talentId) {
      const rows = await this.contracts.find({ select, where: { talentId: req.talentId } });
      return rows.map((r) => this.toRow(r));
    }
    return [];
  }

  private toRow(c: Contract): PartyRow {
    return {
      id: c.id,
      clientId: c.clientId,
      talentId: c.talentId,
      status: String(c.status),
      weeklyCapHours: c.weeklyCapHours ?? null,
    };
  }
}
