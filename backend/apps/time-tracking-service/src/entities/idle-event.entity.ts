import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'idle_events', schema: 'time_tracking' })
export class IdleEvent {
  @PrimaryColumn({ type: 'text' }) id!: string;
  @Column({ name: 'session_id', type: 'text' }) sessionId!: string;
  @Column({ name: 'started_at', type: 'timestamptz' }) startedAt!: Date;
  @Column({ name: 'ended_at', type: 'timestamptz' }) endedAt!: Date;
  @Column({ type: 'int' }) seconds!: number;
  @Column({ type: 'text', nullable: true }) resolution!: string | null;
  @Column({ name: 'idempotency_key', type: 'text', nullable: true, unique: true }) idempotencyKey!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}