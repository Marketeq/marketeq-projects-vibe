// apps/payout-service/src/entities/payout-request.entity.ts
// PS-01 §3.1 + PS-12 + PS-15: PayoutRequest entity
import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { DepositMethod } from './deposit-method.entity';
import { MagicLinkToken } from './magic-link-token.entity';

export enum PayoutStatus {
  PENDING_VERIFICATION = 'pending_verification',
  AWAITING_EDD         = 'awaiting_edd',           // PS-15 §6: EDD compliance review
  QUEUED               = 'queued',
  PROCESSING           = 'processing',
  COMPLETED            = 'completed',
  FAILED               = 'failed',
  CANCELLED            = 'cancelled',
}

export enum PayoutTrigger {
  MANUAL    = 'manual',
  SCHEDULED = 'scheduled',
}

export enum PayoutSpeed {
  STANDARD = 'standard',
  INSTANT  = 'instant',
}

@Entity('payout_requests')
@Index(['contractorId', 'createdAt'])
export class PayoutRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contractor_id' })
  contractorId: string;

  @Column({ name: 'idempotency_key', unique: true })
  idempotencyKey: string;

  @Column({ type: 'enum', enum: PayoutTrigger, default: PayoutTrigger.MANUAL })
  trigger: PayoutTrigger;

  @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.PENDING_VERIFICATION })
  status: PayoutStatus;

  // 006_payout_request_speed.sql — a plain text column with a CHECK
  // constraint, not a native Postgres enum type (unlike trigger/status
  // above), so `type: 'varchar'` here rather than `type: 'enum'`.
  @Column({ type: 'varchar', default: PayoutSpeed.STANDARD })
  speed: PayoutSpeed;

  // --- Amounts ---
  @Column({ name: 'amount_usd', type: 'numeric', precision: 18, scale: 8 })
  amountUsd: string;

  @Column({ name: 'fee_usd', type: 'numeric', precision: 18, scale: 8, default: '0' })
  feeUsd: string;

  @Column({ name: 'net_amount_usd', type: 'numeric', precision: 18, scale: 8 })
  netAmountUsd: string;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  // --- Provider response ---
  // `text`, not `varchar`, to match the actual column (001_initial_schema.sql)
  // and because Ramp payouts store a full widget URL (~200-300 chars) here.
  @Column({ name: 'provider_reference', nullable: true, type: 'text' })
  providerReference: string | null;

  // Raw, provider-specific status string (e.g. 'pending', 'awaiting_manual_completion',
  // 'settled') — informational only. The payout's actual state machine runs on
  // the `status` column (PayoutStatus) above; nothing should switch on this field.
  @Column({ name: 'provider_status', nullable: true, type: 'text' })
  providerStatus: string | null;

  @Column({ name: 'provider_response', type: 'jsonb', nullable: true })
  providerResponse: object | null;

  @Column({ name: 'failure_reason', nullable: true, type: 'varchar' })
  failureReason: string | null;

  @Column({ name: 'retry_count', type: 'smallint', default: 0 })
  retryCount: number;

  // --- PS-12: Crypto settlement fields ---
  @Column({ name: 'external_transaction_id', nullable: true, type: 'varchar' })
  externalTransactionId: string | null;

  @Column({ name: 'bridge_provider', type: 'varchar', length: 32, nullable: true })
  bridgeProvider: string | null;

  // PS-34 §8: Wise Platform transfer ID for payouts routed through
  // WisePlatformService (India, Japan, GCC, and other non-Stripe-cross-border
  // countries). Null for every other execution path.
  @Column({ name: 'wise_platform_transfer_id', type: 'varchar', length: 64, nullable: true })
  wisePlatformTransferId: string | null;

  @Column({ name: 'crypto_amount', type: 'numeric', precision: 28, scale: 18, nullable: true })
  cryptoAmount: string | null;

  @Column({ name: 'crypto_token', type: 'varchar', length: 10, nullable: true })
  cryptoToken: string | null;

  @Column({ name: 'crypto_network', type: 'varchar', length: 32, nullable: true })
  cryptoNetwork: string | null;

  @Column({ name: 'conversion_rate', type: 'numeric', precision: 18, scale: 8, nullable: true })
  conversionRate: string | null;

  @Column({ name: 'gas_fee_usd', type: 'numeric', precision: 18, scale: 8, nullable: true })
  gasFeeUsd: string | null;

  @Column({ name: 'gas_fee_wei', nullable: true, type: 'varchar' })
  gasFeeWei: string | null;

  @Column({ name: 'settlement_estimated_at', type: 'timestamptz', nullable: true })
  settlementEstimatedAt: Date | null;

  @Column({ name: 'settled_at', type: 'timestamptz', nullable: true })
  settledAt: Date | null;

  // --- Timing ---
  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'queued_at', type: 'timestamptz', nullable: true })
  queuedAt: Date | null;

  @Column({ name: 'processing_at', type: 'timestamptz', nullable: true })
  processingAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'scheduled_for', type: 'timestamptz', nullable: true })
  scheduledFor: Date | null;

  // --- Split payout reference ---
  @Column({ name: 'split_group_id', nullable: true, type: 'varchar' })
  splitGroupId: string | null;

  @Column({ name: 'split_sequence', type: 'smallint', nullable: true })
  splitSequence: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // --- Relations ---
  @Column({ name: 'deposit_method_id' })
  depositMethodId: string;

  @ManyToOne(() => DepositMethod)
  @JoinColumn({ name: 'deposit_method_id' })
  depositMethod: DepositMethod;

  @Column({ name: 'magic_link_token_id', nullable: true, type: 'varchar' })
  magicLinkTokenId: string | null;

  @ManyToOne(() => MagicLinkToken)
  @JoinColumn({ name: 'magic_link_token_id' })
  magicLinkToken: MagicLinkToken | null;
}