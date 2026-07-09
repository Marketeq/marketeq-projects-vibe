// apps/payout-service/src/entities/payout-audit-log.entity.ts
// PS-01 §2.6: payout_audit_log table — immutable audit trail
// Indexes: pal_contractor_idx, pal_payout_request_idx, pal_created_at_idx (PS-01 §4)
//
// PS-01 §2.6.1 action values:
//   withdrawal.initiated  — Contractor submits withdrawal request
//   magic_link.sent       — Magic link email dispatched via SendGrid
//   magic_link.verified   — Contractor clicks magic link — token validated
//   magic_link.expired    — Magic link TTL elapsed without use
//   payout.queued         — Payout moves to queued status after verification
//   payout.processing     — Provider API call initiated
//   payout.completed      — Provider confirms transfer
//   payout.failed         — Provider rejects or all retries exhausted
//   payout.cancelled      — Contractor cancels before processing
//   method.added          — New deposit method added
//   method.removed        — Deposit method deactivated
//   method.set_default    — Default method changed
//   schedule.updated      — Payout schedule configuration changed
//   admin.viewed          — Admin viewed contractor payout history

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PayoutRequest, PayoutStatus } from './payout-request.entity';

@Entity('payout_audit_log')
export class PayoutAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'contractor_id' })
  contractorId: string;

  @Column({ name: 'payout_request_id', nullable: true, type: 'varchar' })
  payoutRequestId: string | null;

  @ManyToOne(() => PayoutRequest, { nullable: true })
  @JoinColumn({ name: 'payout_request_id' })
  payoutRequest: PayoutRequest | null;

  // 'contractor' | 'service' | 'admin'
  @Column({ name: 'actor_type' })
  actorType: string;

  @Column({ name: 'actor_id' })
  actorId: string;

  // See §2.6.1 above for valid values
  @Column()
  action: string;

  @Column({ name: 'previous_status', type: 'enum', enum: PayoutStatus, nullable: true })
  previousStatus: PayoutStatus | null;

  @Column({ name: 'new_status', type: 'enum', enum: PayoutStatus, nullable: true })
  newStatus: PayoutStatus | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: object | null;

  @Column({ name: 'request_id', nullable: true, type: 'varchar' })
  requestId: string | null;
}