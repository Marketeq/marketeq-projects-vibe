import {
  Injectable,
  Inject,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';

import { OutboxEvent } from './entities/outbox-event.entity';

/**
 * Background worker that guarantees at-least-once RabbitMQ delivery for all
 * NDA lifecycle events (nda.generated, nda.signed, nda.voided).
 *
 * How it works:
 *  1. NdaService / NdaSigningService write an OutboxEvent row in the same DB
 *     transaction as the primary business record.
 *  2. This worker polls `ls_outbox_events` every 5 seconds for pending rows.
 *  3. On success: marks the row as 'published'.
 *  4. On failure: increments attemptCount, applies exponential backoff via
 *     scheduledAt, and marks as 'failed' after 5 attempts.
 *
 * This decouples DB writes from broker availability — if RabbitMQ is temporarily
 * down when someone signs, the signing still succeeds and the event is retried.
 */
@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorker.name);
  private timer!: NodeJS.Timeout;
  private readonly POLL_INTERVAL_MS = 5_000;
  private readonly MAX_ATTEMPTS = 5;
  private readonly BATCH_SIZE = 20;

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly repo: Repository<OutboxEvent>,
    @Inject('RABBITMQ_CLIENT')
    private readonly client: ClientProxy,
  ) {}

  onModuleInit(): void {
    // A rejection escaping this timer is unhandled and exits the whole
    // process (Node's default), so a dropped DB connection during one poll
    // would take legal-service down. Log it instead: rows stay 'pending' and
    // the next tick retries them.
    this.timer = setInterval(() => {
      this.publishPending().catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Outbox poll failed: ${message}`,
          err instanceof Error ? err.stack : undefined,
        );
      });
    }, this.POLL_INTERVAL_MS);
    this.logger.log(
      `OutboxWorker started — polling every ${this.POLL_INTERVAL_MS / 1000}s`,
    );
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
    this.logger.log('OutboxWorker stopped');
  }

  private async publishPending(): Promise<void> {
    const now = new Date();
    const rows = await this.repo
      .createQueryBuilder('e')
      .where('e.status = :status', { status: 'pending' })
      .andWhere('e.scheduledAt <= :now', { now })
      .orderBy('e.scheduledAt', 'ASC')
      .take(this.BATCH_SIZE)
      .getMany();

    for (const row of rows) {
      try {
        this.client.emit(row.routingKey, {
          ...row.payload,
          emittedAt: new Date().toISOString(),
        });
        await this.repo.update(row.id, { status: 'published' });
        this.logger.log(`Outbox published: ${row.routingKey} (id=${row.id})`);
      } catch (err: unknown) {
        const nextAttempt = row.attemptCount + 1;
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const backoffMs = Math.pow(2, row.attemptCount) * 1_000;
        const nextStatus = nextAttempt >= this.MAX_ATTEMPTS ? 'failed' : 'pending';

        await this.repo.update(row.id, {
          status: nextStatus,
          attemptCount: nextAttempt,
          lastError:
            err instanceof Error ? err.message : String(err),
          scheduledAt: new Date(Date.now() + backoffMs),
        });

        if (nextStatus === 'failed') {
          this.logger.error(
            `Outbox event ${row.id} (${row.routingKey}) permanently failed after ${nextAttempt} attempts`,
          );
        } else {
          this.logger.warn(
            `Outbox event ${row.id} failed (attempt ${nextAttempt}/${this.MAX_ATTEMPTS}), retry in ${backoffMs}ms`,
          );
        }
      }
    }
  }
}
