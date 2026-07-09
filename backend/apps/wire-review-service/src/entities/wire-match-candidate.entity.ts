import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('wire_match_candidates')
export class WireMatchCandidate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  transactionId: string;

  @Column()
  amount: number;

  @Column({ nullable: true })
  resolvedProjectId?: string;

  @Column({ nullable: true })
  clientId?: string;

  @Column({ nullable: true })
  memo?: string;

  @Column({ type: 'float', default: 0 })
  matchScore: number;

  @Column({ default: 'pending_review' })
  status: 'pending_review' | 'confirmed' | 'flagged';

  @CreateDateColumn()
  receivedAt: Date;

  @Column('jsonb', { nullable: true })
  rawPayload?: Record<string, any>;

  @Column({ default: false })
  syncedToAirtable: boolean;

  @Column({ default: 0 })
  syncAttempts: number;

  @Column({ nullable: true })
  lastSyncError: string;

}