import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
@Entity({ name: 'break_events', schema: 'time_tracking' })
export class BreakEvent {
  @PrimaryColumn({ type: 'text' }) id!: string;
  @Column({ name: 'session_id', type: 'text' }) sessionId!: string;
  @Column({ type: 'text', default: 'unpaid' }) kind!: string;
  @Column({ name: 'started_at', type: 'timestamptz' }) startedAt!: Date;
  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true }) endedAt!: Date | null;
  @Column({ name: 'idempotency_key', type: 'text', nullable: true, unique: true }) idempotencyKey!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}