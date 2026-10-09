import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

// Persistent, restart-safe webhook deduplication, keyed on Didit's own
// event_id — the real backing store for
// providers/webhooks/didit-webhook-event-tracker.checkDuplicateEvent's
// `processedEventIds` argument. A unique primary key on event_id makes a
// concurrent duplicate insert fail safely (see handleBiometricSessionWebhook).
@Entity({ name: 'processed_webhook_events', schema: 'identity_verification' })
export class ProcessedWebhookEvent {
  @PrimaryColumn({ name: 'event_id', type: 'varchar', length: 128 })
  eventId!: string;

  @Index('idx_processed_webhook_events_session_id')
  @Column({ name: 'session_id', type: 'varchar', length: 128 })
  sessionId!: string;

  @CreateDateColumn({ name: 'received_at', type: 'timestamptz' })
  receivedAt!: Date;
}
