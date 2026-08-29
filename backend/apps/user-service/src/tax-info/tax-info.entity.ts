import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Taxpayer details backing the W-9 / W-8 series substitute form.
 *
 * `tin` is the only sensitive value here and is never returned by the API:
 * reads expose `tinLast4` only. Callers that need the full value must go
 * through tax reporting, not the profile surface.
 */
@Entity({ name: 'tax_info', schema: 'user_service' })
export class TaxInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId: string;

  // ── Tax identification ────────────────────────────────────────────────
  @Column({ type: 'text', nullable: true })
  legalFullName?: string | null;

  @Column({ type: 'text', nullable: true })
  federalTaxClassification?: string | null;

  @Column({ type: 'text', nullable: true })
  tinType?: string | null;

  @Column({ type: 'text', nullable: true })
  tin?: string | null;

  // ── Residence ─────────────────────────────────────────────────────────
  @Column({ type: 'text', nullable: true })
  country?: string | null;

  @Column({ type: 'text', nullable: true })
  addressLine1?: string | null;

  @Column({ type: 'text', nullable: true })
  addressLine2?: string | null;

  @Column({ type: 'text', nullable: true })
  city?: string | null;

  @Column({ type: 'text', nullable: true })
  stateOrProvince?: string | null;

  @Column({ type: 'text', nullable: true })
  postalCode?: string | null;

  // ── Certification ─────────────────────────────────────────────────────
  @Column({ type: 'text', nullable: true })
  signature?: string | null;

  @Column({ type: 'text', nullable: true })
  signedDate?: string | null;

  @Column({ type: 'boolean', default: false })
  consentESignature: boolean;

  @Column({ type: 'boolean', default: false })
  consentDigitalDelivery: boolean;

  /** Set only by the explicit submit. Its presence is what makes the W-9 real. */
  @Column({ type: 'timestamptz', nullable: true })
  submittedAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
