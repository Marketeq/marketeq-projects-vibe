import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
@Entity({ name: 'disputes', schema: 'time_tracking' })
export class Dispute {
  @PrimaryColumn({ type: 'text' }) id!: string;
  @Column({ name: 'session_id', type: 'text' }) sessionId!: string;
  @Column({ name: 'opened_by', type: 'text' }) openedBy!: string;
  @Column({ type: 'text', default: 'other' }) reason!: string;
  @Column({ type: 'text', nullable: true }) note!: string | null;
  @Column({ type: 'text', default: 'open' }) status!: string;
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true }) resolvedAt!: Date | null;
  @Column({ name: 'resolved_by', type: 'text', nullable: true }) resolvedBy!: string | null;
  @Column({ name: 'resolution_note', type: 'text', nullable: true }) resolutionNote!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}