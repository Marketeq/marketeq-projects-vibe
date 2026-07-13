// apps/offer-service/src/outbox/outbox.processor.ts
// OS-22: Background poller with retry policy, exponential backoff, and alert on FAILED.
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OutboxEvent, OutboxEventStatus } from './entities/outbox-event.entity';
import { RabbitMQPublisher } from '../messaging/rabbitmq.publisher';
import { AlertService } from '../common/alert/alert.service';
import { OfferRoutingKey } from '../messaging/constants/rabbitmq.constants';

const MAX_RETRY_ATTEMPTS = 10;
const BATCH_SIZE = 10;

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepo: Repository<OutboxEvent>,
    private readonly dataSource: DataSource,
    private readonly publisher: RabbitMQPublisher,
    private readonly alert: AlertService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processPendingEvents(): Promise<void> {
    if (!this.publisher.isReady()) return;
    await this.claimAndPublishBatch();
  }

  private async claimAndPublishBatch(): Promise<void> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    let rows: OutboxEvent[] = [];
    try {
      rows = await runner.manager
        .getRepository(OutboxEvent)
        .createQueryBuilder('o')
        .setLock('pessimistic_write')
        .where('o.status = :status', { status: OutboxEventStatus.PENDING })
        .andWhere('o.scheduledAt <= NOW()')
        .orderBy('o.scheduledAt', 'ASC')
        .limit(BATCH_SIZE)
        .getMany();

      if (rows.length > 0) {
        const ids = rows.map(r => r.id);
        await runner.manager.update(OutboxEvent, ids, { status: OutboxEventStatus.PROCESSING });
      }

      await runner.commitTransaction();
    } catch (err) {
      await runner.rollbackTransaction();
      this.logger.error('Outbox claim error:', err instanceof Error ? err.message : String(err));
      return;
    } finally {
      await runner.release();
    }

    if (rows.length === 0) return;
    this.logger.debug(`Claimed ${rows.length} outbox event(s) for publishing.`);

    await Promise.all(rows.map(row => this.publishAndSettle(row)));
  }

  private async publishAndSettle(row: OutboxEvent): Promise<void> {
    try {
      await this.publisher.publish({
        routingKey: row.routingKey as OfferRoutingKey,
        payload: row.payload,
      });

      await this.outboxRepo.delete({ id: row.id });
      this.logger.debug(`Published and deleted outbox event: ${row.eventType} (${row.id})`);

    } catch (err) {
      await this.handlePublishFailure(row, err);
    }
  }

  private async handlePublishFailure(row: OutboxEvent, err: unknown): Promise<void> {
    const newRetryCount = (row.retryCount ?? 0) + 1;
    const errMsg = err instanceof Error ? err.message : String(err);

    if (newRetryCount >= MAX_RETRY_ATTEMPTS) {
      await this.outboxRepo.update(row.id, {
        status: OutboxEventStatus.FAILED,
        retryCount: newRetryCount,
        lastError: errMsg,
      });

      this.logger.error(
        `OUTBOX FAILED after ${newRetryCount} retries:` +
        ` eventType=${row.eventType} outboxId=${row.id}` +
        ` aggregateId=${row.aggregateId} lastError=${errMsg}`,
      );

      await this.alert.sendOutboxFailedAlert({
        outboxId: row.id,
        aggregateId: row.aggregateId,
        eventType: row.eventType,
        retryCount: newRetryCount,
        lastError: errMsg,
      });

    } else {
      const backoffMinutes = Math.pow(2, newRetryCount);
      const scheduledAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

      await this.outboxRepo.update(row.id, {
        status: OutboxEventStatus.PENDING,
        retryCount: newRetryCount,
        lastError: errMsg,
        scheduledAt,
      });

      this.logger.warn(
        `Outbox publish failed (attempt ${newRetryCount}/${MAX_RETRY_ATTEMPTS}):` +
        ` eventType=${row.eventType} outboxId=${row.id}` +
        ` nextRetry=${scheduledAt.toISOString()} error=${errMsg}`,
      );
    }
  }

  async resetFailedEvents(): Promise<number> {
    const result = await this.outboxRepo
      .createQueryBuilder()
      .update(OutboxEvent)
      .set({ status: OutboxEventStatus.PENDING, retryCount: 0, lastError: null, scheduledAt: new Date() })
      .where('status = :status', { status: OutboxEventStatus.FAILED })
      .execute();

    const count = result.affected ?? 0;
    this.logger.log(`Reset ${count} FAILED outbox events to PENDING.`);
    return count;
  }
}