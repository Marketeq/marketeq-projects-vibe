import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { IdentityVerificationProfile } from './identity-verification-profile.entity';
import { IdentityDocument } from './identity-document.entity';
import {
  CaptureMethod,
  DocumentType,
  VpnProxyDetectionResult,
} from './enums/identity-verification.enums';

@Entity({ name: 'verification_attempts', schema: 'identity_verification' })
@Check('chk_verification_attempts_attempt_number', '"attempt_number" >= 1 AND "attempt_number" <= 3')
export class VerificationAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_verification_attempts_profile_id')
  @Column({ name: 'profile_id', type: 'uuid' })
  profileId!: string;

  @ManyToOne(() => IdentityVerificationProfile, (profile) => profile.attempts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_id' })
  profile!: IdentityVerificationProfile;

  @Index('idx_verification_attempts_document_id')
  @Column({ name: 'document_id', type: 'uuid', nullable: true })
  documentId!: string | null;

  @ManyToOne(() => IdentityDocument, (document) => document.attempts, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'document_id' })
  document!: IdentityDocument | null;

  @Index('idx_verification_attempts_vendor_session_id', { unique: true })
  @Column({ name: 'vendor_session_id', type: 'varchar', length: 128 })
  vendorSessionId!: string;

  @CreateDateColumn({ name: 'attempt_timestamp', type: 'timestamptz' })
  attemptTimestamp!: Date;

  @Column({
    name: 'attempt_method',
    type: 'enum',
    enum: CaptureMethod,
    enumName: 'capture_method_enum',
  })
  attemptMethod!: CaptureMethod;

  @Column({
    name: 'attempt_document_type',
    type: 'enum',
    enum: DocumentType,
    enumName: 'document_type_enum',
  })
  attemptDocumentType!: DocumentType;

  @Column({ name: 'attempt_outcome', type: 'varchar', length: 32 })
  attemptOutcome!: string;

  @Column({ name: 'failure_code', type: 'varchar', length: 64, nullable: true })
  failureCode!: string | null;

  @Column({ name: 'attempt_number', type: 'smallint' })
  attemptNumber!: number;

  @Column({
    name: 'vpn_proxy_detection_result',
    type: 'enum',
    enum: VpnProxyDetectionResult,
    enumName: 'vpn_proxy_detection_result_enum',
    default: VpnProxyDetectionResult.NONE,
  })
  vpnProxyDetectionResult!: VpnProxyDetectionResult;
}
