import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
 
@Entity({ name: 'time_entries', schema: 'time_tracking' })
export class TimeEntry {
  @PrimaryColumn({ type: 'text' }) id!: string;
  @Column({ name: 'session_id', type: 'text' }) sessionId!: string;
  @Column({ name: 'started_at', type: 'timestamptz' }) startedAt!: Date;
  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true }) endedAt!: Date | null;
  @Column({ name: 'duration_seconds', type: 'int', default: 0 }) durationSeconds!: number;
  @Column({ name: 'idempotency_key', type: 'text', nullable: true, unique: true }) idempotencyKey!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}