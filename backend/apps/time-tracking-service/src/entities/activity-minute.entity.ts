import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'activity_minutes', schema: 'time_tracking' })
export class ActivityMinute {
  @PrimaryColumn({ type: 'text' }) id!: string;
  @Column({ name: 'session_id', type: 'text' }) sessionId!: string;
  @Column({ name: 'minute_start_at', type: 'timestamptz' }) minuteStartAt!: Date;
  @Column({ type: 'boolean' }) active!: boolean;
  @Column({ name: 'idempotency_key', type: 'text', nullable: true, unique: true }) idempotencyKey!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}