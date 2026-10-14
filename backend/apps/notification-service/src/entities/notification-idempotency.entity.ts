import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * One row per publisher-supplied idempotency key. Claiming the key (an INSERT that
 * conflicts if the row exists) is what makes a notification deliver once, however
 * many times the event is redelivered, republished or processed concurrently.
 */
@Entity('notification_idempotency')
export class NotificationIdempotency {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  key: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
