// apps/payout-service/src/entities/magic-link-token.entity.ts
// PS-01 §2.5: magic_link_tokens table
// PS-00 §5: Single-use token, 15-minute TTL, hashed storage
// Constraints: NOT NULL token_hash UNIQUE — raw token never stored, only SHA-256 hash (PS-01 §5)
// Indexes: mlt_token_hash_idx (WHERE is_used=false), mlt_contractor_idx,
//          mlt_expires_cleanup_idx (PS-01 §4)

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DepositMethod } from './deposit-method.entity';

@Entity('magic_link_tokens')
export class MagicLinkToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contractor_id' })
  contractorId: string;

  // SHA-256 of the raw token — raw token is NEVER stored
  @Column({ name: 'token_hash', unique: true })
  tokenHash: string;

  @Column({ name: 'payout_amount_usd', type: 'numeric', precision: 18, scale: 8 })
  payoutAmountUsd: string;

  @Column({ name: 'deposit_method_id' })
  depositMethodId: string;

  @ManyToOne(() => DepositMethod)
  @JoinColumn({ name: 'deposit_method_id' })
  depositMethod: DepositMethod;

  @Column({ name: 'is_used', default: false })
  isUsed: boolean;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}