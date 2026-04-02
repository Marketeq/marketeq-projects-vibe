import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'activity_watch_events', schema: 'time_tracking' })
@Index('idx_awe_bucket_start', ['bucketId', 'startTime'])
@Index('idx_awe_user_start', ['userId', 'startTime'])
@Index('idx_awe_event_type', ['eventType'])
export class ActivityWatchEvent {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @Column({ name: 'bucket_id', type: 'text', nullable: true }) bucketId?: string;

  @Column({ name: 'user_id', type: 'text', nullable: true }) userId?: string;

  @Column({ name: 'event_type', type: 'text', nullable: true }) eventType?: string;

  @Column({ name: 'start_time', type: 'timestamptz', nullable: true }) startTime?: Date;

  @Column({ name: 'end_time', type: 'timestamptz', nullable: true }) endTime?: Date;

  @Column({ type: 'jsonb', nullable: true }) data?: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
