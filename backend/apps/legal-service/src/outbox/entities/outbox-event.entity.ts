import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Transactional outbox pattern.
 * Written in the same DB transaction as the NDA record.
 * A separate worker reads pending rows and publishes them to RabbitMQ,
 * guaranteeing at-least-once delivery even on service restart.
 */
@Index(['status', 'scheduledAt'])
@Entity('ls_outbox_events')
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** RabbitMQ exchange — e.g. 'marketeq.legal' */
  @Column({ length: 100 })
  exchange: string;

  /** RabbitMQ routing key — e.g. 'nda.generated' */
  @Column({ length: 100 })
  routingKey: string;

  /** Event payload published to RabbitMQ */
  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  /** 'pending' | 'published' | 'failed' */
  @Column({ length: 20 })
  status: string;

  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
