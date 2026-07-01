// apps/offer-service/src/outbox/entities/outbox-event.entity.ts
// OS-15: Transactional outbox for guaranteed RabbitMQ delivery
import { Entity, Column, Index } from 'typeorm';
import { OfferServiceBaseEntity } from '../../common/entities/base.entity';

export enum OutboxEventStatus {
  PENDING    = 'PENDING',
  PROCESSING = 'PROCESSING',
  PUBLISHED  = 'PUBLISHED',
  FAILED     = 'FAILED',
}

@Entity({ name: 'outbox', schema: 'offer_service' })
@Index('idx_outbox_status_scheduled', ['status', 'scheduledAt'])
export class OutboxEvent extends OfferServiceBaseEntity {
  @Column({ name: 'aggregate_id', type: 'uuid' })
  @Index('idx_outbox_aggregate_id')
  aggregateId: string;

  @Column({ name: 'aggregate_type', type: 'varchar', length: 30, default: 'offer' })
  aggregateType: string;

  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType: string;

  @Column({ name: 'exchange', type: 'varchar', length: 100, default: 'marketeq.offers' })
  exchange: string;

  @Column({ name: 'routing_key', type: 'varchar', length: 100 })
  routingKey: string;

  @Column({
    name: 'payload',
    type: 'jsonb',
    transformer: {
      to: (v: Record<string, unknown>) => v,
      from: (v: Record<string, unknown>) => v,
    },
  })
  payload: Record<string, unknown>;

  @Column({ name: 'status', type: 'varchar', length: 20, default: OutboxEventStatus.PENDING })
  status: OutboxEventStatus;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'last_error', type: 'text', nullable: true, default: null })
  lastError: string | null;

  @Column({ name: 'scheduled_at', type: 'timestamptz', default: () => 'NOW()' })
  scheduledAt: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true, default: null })
  processedAt: Date | null;
}