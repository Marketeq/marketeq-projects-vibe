// apps/payout-service/src/entities/magic-link-verification.entity.ts
// PS-14 §9: magic_link_verifications table
// Stores SHA-256 hash of token ONLY — raw token never persisted.

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('magic_link_verifications')
@Index(['tokenHash'], { unique: true })
@Index(['payoutRequestId'])
@Index(['contractorId'])
export class MagicLinkVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payout_request_id' })
  payoutRequestId: string;

  @Column({ name: 'contractor_id' })
  contractorId: string;

  // SHA-256 hash — raw token is NEVER stored anywhere
  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ default: false })
  used: boolean;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  // PS-14 §7: true if a resend invalidated this token
  @Column({ default: false })
  superseded: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}