import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('gift_card_attempts')
export class GiftCardAttempt {
  @PrimaryColumn({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @Column({ name: 'failed_count', type: 'int', default: 0 })
  failedCount: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
