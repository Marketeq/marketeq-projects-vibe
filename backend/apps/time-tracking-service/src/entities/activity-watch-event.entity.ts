import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('activity_watch_events')
export class ActivityWatchEvent {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ nullable: true }) bucketId?: string;
  @Index() @Column({ nullable: true }) userId?: string;
  @Index() @Column({ nullable: true }) eventType?: string;
  @Index() @Column({ type: 'timestamptz', nullable: true }) startTime?: Date;
  @Index() @Column({ type: 'timestamptz', nullable: true }) endTime?: Date;
  @Column({ type: 'jsonb', nullable: true }) data?: any;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
}
