import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { IdentityVerificationProfile } from './identity-verification-profile.entity';
import { IdentityDocument } from './identity-document.entity';
import { BiometricSessionStatus } from './enums/identity-verification.enums';

// One row per Didit-hosted biometric (Liveness + Face Match) session.
// `status` is updated ONLY by handleBiometricSessionWebhook after a
// verified webhook — never by the redirect return from Didit's page, and
// never inferred from the synchronous session-creation response (which is
// always "Not Started"/"created").
@Entity({ name: 'biometric_sessions', schema: 'identity_verification' })
export class BiometricSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_biometric_sessions_profile_id')
  @Column({ name: 'profile_id', type: 'uuid' })
  profileId!: string;

  @ManyToOne(() => IdentityVerificationProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profile_id' })
  profile!: IdentityVerificationProfile;

  @Index('idx_biometric_sessions_document_id')
  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @ManyToOne(() => IdentityDocument, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document!: IdentityDocument;

  @Index('idx_biometric_sessions_didit_session_id', { unique: true })
  @Column({ name: 'didit_session_id', type: 'varchar', length: 128 })
  diditSessionId!: string;

  // Stored at creation so "Begin verifying" can resume an in-progress
  // session without re-fetching it from Didit.
  @Column({ name: 'hosted_url', type: 'varchar', length: 512 })
  hostedUrl!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: BiometricSessionStatus,
    enumName: 'biometric_session_status_enum',
    default: BiometricSessionStatus.CREATED,
  })
  status!: BiometricSessionStatus;

  // Out-of-order-event guard (didit-webhook-event-tracker.checkOutOfOrder)
  // — the real backing store that module's tests deliberately left as a
  // caller-supplied dependency.
  @Column({ name: 'last_event_timestamp', type: 'bigint', nullable: true })
  lastEventTimestamp!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
