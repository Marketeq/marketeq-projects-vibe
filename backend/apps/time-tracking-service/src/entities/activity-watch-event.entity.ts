import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'activity_watch_events', schema: 'time_tracking' })
export class ActivityWatchEvent {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ type: 'text', nullable: true }) bucketId?: string;
  @Index() @Column({ type: 'text', nullable: true }) userId?: string;
  @Index() @Column({ type: 'text', nullable: true }) eventType?: string;
  @Index() @Column({ type: 'timestamptz', nullable: true }) startTime?: Date;
  @Index() @Column({ type: 'timestamptz', nullable: true }) endTime?: Date;
  @Column({ type: 'jsonb', nullable: true }) data?: any;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
}
