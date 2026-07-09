import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NdaDocument } from './nda-document.entity';
import { NameMatchStatus } from '../enums/name-match-status.enum';
import { SigningMethod } from '../enums/signing-method.enum';

/**
 * Append-only audit trail. This entity is NEVER updated or deleted.
 * Records are legally compelled evidence of signing.
 */
@Entity('ls_nda_signing_events')
export class NdaSigningEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  ndaDocumentId: string;

  @ManyToOne(() => NdaDocument, (d) => d.signingEvents, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ndaDocumentId' })
  ndaDocument: NdaDocument;

  @Column('uuid')
  signerUserId: string;

  @Column({ length: 100 })
  signerUsername: string;

  @Column({ length: 200 })
  signerTypedName: string;

  @Column({ length: 200 })
  signerRegisteredName: string;

  @Column({ type: 'enum', enum: NameMatchStatus })
  nameMatchStatus: NameMatchStatus;

  /** Jaro-Winkler score stored to 4 decimal places */
  @Column({ type: 'decimal', precision: 5, scale: 4 })
  nameMatchScore: number;

  @Column('uuid')
  jobListingId: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  signerInitials: string | null;

  /** IPv6-safe — 45 chars */
  @Column({ length: 45 })
  ipAddress: string;

  @Column({ length: 20 })
  deviceType: string;

  @Column('text')
  browserUserAgent: string;

  @Column({ type: 'enum', enum: SigningMethod })
  signingMethod: SigningMethod;

  /** ESIGN Act §6.1 — must be true for signing to proceed */
  @Column()
  consentCheckboxChecked: boolean;

  /** Set after PDF is written to R2. Once set, never changed. */
  @Column({ type: 'varchar', length: 512, nullable: true })
  signedPdfR2Key: string | null;

  /** Immutable creation timestamp — no UpdateDateColumn on this entity */
  @CreateDateColumn({ type: 'timestamptz' })
  signedAtUtc: Date;

  /** R2 key for typed/drawn/uploaded signature artifact */
  @Column({ type: 'varchar', length: 512, nullable: true })
  signatureArtifactR2Key: string | null;

  /** Present only for COMPANY_REPRESENTATIVE display format */
  @Column({ type: 'uuid', nullable: true })
  designatedRepCompanyId: string | null;

  /** Set on GDPR DSAR erasure — signals PII has been pseudonymized */
  @Column({ type: 'timestamptz', nullable: true })
  pseudonymizedAt: Date | null;
}
