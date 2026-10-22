import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * One row per publisher-supplied idempotency key. It is both the claim that makes a notification
 * deliver once, however many times the event is redelivered, republished or processed
 * concurrently, and the record of which channels have ALREADY been delivered, so a retry only
 * does what is unfinished.
 *
 *   lockedUntil   the worker's lease. While in the future another worker must not deliver this
 *                 key; once it passes (the worker died) or is released (it failed), the next
 *                 delivery takes over and resumes. NULL = nobody holds it.
 *   notificationId the stored in-app row (its id is derived from the key, so it can only ever
 *                 be one row).
 *   ablyDone / emailDone  the realtime push / the email went out.
 *   completedAt   every channel is done: a repeat of the key is a duplicate and is dropped.
 */
@Entity('notification_idempotency')
export class NotificationIdempotency {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  key: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @Column({ type: 'uuid', nullable: true })
  notificationId: string | null;

  @Column({ type: 'boolean', default: false })
  ablyDone: boolean;

  @Column({ type: 'boolean', default: false })
  emailDone: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
