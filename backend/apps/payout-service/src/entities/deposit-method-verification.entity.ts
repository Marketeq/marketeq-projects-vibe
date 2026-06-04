// apps/payout-service/src/entities/deposit-method-verification.entity.ts
// PS-01 §2.4: deposit_method_verification table
// Tracks verification for each method type:
//   micro_deposit — amount_1_cents, amount_2_cents, attempt_count, max_attempts, locked_until, expires_at
//   stripe_fc     — oauth_state, oauth_code
//   oauth         — oauth_state, oauth_code (PayPal, Wise, Payoneer)
//   crypto_confirm — confirmation_code, confirmation_expires_at
// Indexes: dmv_deposit_method_idx, dmv_contractor_idx, dmv_expires_idx (PS-01 §4)

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DepositMethod } from './deposit-method.entity';

@Entity('deposit_method_verification')
export class DepositMethodVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'deposit_method_id' })
  depositMethodId: string;

  @ManyToOne(() => DepositMethod, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deposit_method_id' })
  depositMethod: DepositMethod;

  @Column({ name: 'contractor_id' })
  contractorId: string;

  // 'micro_deposit' | 'stripe_fc' | 'oauth' | 'crypto_confirm'
  @Column({ name: 'verification_type' })
  verificationType: string;

  // -- Micro-deposit fields --
  @Column({ name: 'amount_1_cents', type: 'smallint', nullable: true })
  amount1Cents: number | null;

  @Column({ name: 'amount_2_cents', type: 'smallint', nullable: true })
  amount2Cents: number | null;

  @Column({ name: 'attempt_count', type: 'smallint', default: 0 })
  attemptCount: number;

  @Column({ name: 'max_attempts', type: 'smallint', default: 3 })
  maxAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  // -- OAuth / Stripe FC fields --
  @Column({ name: 'oauth_state', nullable: true, type: 'varchar' })
  oauthState: string | null;

  @Column({ name: 'oauth_code', nullable: true, type: 'varchar' })
  oauthCode: string | null;

  // -- Crypto confirmation --
  @Column({ name: 'confirmation_code', nullable: true, type: 'varchar' })
  confirmationCode: string | null;

  @Column({ name: 'confirmation_expires_at', type: 'timestamptz', nullable: true })
  confirmationExpiresAt: Date | null;

  // -- Status --
  @Column({ default: 'pending' })
  status: string;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}