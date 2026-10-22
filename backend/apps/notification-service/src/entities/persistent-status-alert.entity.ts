import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export const PERSISTENT_STATUS_ALERT_TYPES = [
  'travel_mode',
  'submitted_for_review',
  'verified',
  'home_country_updated',
] as const;

export type PersistentStatusAlertType =
  (typeof PERSISTENT_STATUS_ALERT_TYPES)[number];

@Entity('persistent_status_alerts')
@Unique('UQ_persistent_status_alert_occurrence', [
  'userId',
  'type',
  'occurrenceKey',
])
@Index('IDX_persistent_status_alerts_active', [
  'userId',
  'dismissedAt',
  'createdAt',
])
export class PersistentStatusAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', length: 64 })
  type: PersistentStatusAlertType;

  @Column({ length: 200 })
  occurrenceKey: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', nullable: true })
  link: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'timestamp', nullable: true })
  dismissedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
