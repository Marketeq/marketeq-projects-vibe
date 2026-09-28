import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { IdentityVerificationProfile } from './identity-verification-profile.entity';
import { VerificationAttempt } from './verification-attempt.entity';
import {
  DocumentType,
  CaptureMethod,
  VerificationDepth,
  DocumentCheckStatus,
} from './enums/identity-verification.enums';

@Entity({ name: 'identity_documents', schema: 'identity_verification' })
@Check('chk_identity_documents_issuing_state', `"issuing_state" IS NULL OR "document_type" = 'drivers_licence'`)
export class IdentityDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_identity_documents_profile_id')
  @Column({ name: 'profile_id', type: 'uuid' })
  profileId!: string;

  @ManyToOne(() => IdentityVerificationProfile, (profile) => profile.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profile_id' })
  profile!: IdentityVerificationProfile;

  @Column({
    name: 'document_type',
    type: 'enum',
    enum: DocumentType,
    enumName: 'document_type_enum',
  })
  documentType!: DocumentType;

  // Display-only. Never branch gate or business logic on this field
  // (TRVG2 §1.4). documentType (above) remains the canonical,
  // vendor-aligned value; this is user-facing wording only.
  @Column({ name: 'document_type_label', type: 'varchar', length: 100, nullable: true })
  documentTypeLabel!: string | null;

  @Column({ name: 'issuing_country', type: 'char', length: 2 })
  issuingCountry!: string;

  // Nullable: required at submission for captureMethod=manual_entry, but
  // legitimately absent for captureMethod=scan until (if ever) Didit's own
  // document-check extracts it — see SubmitDocumentRequestDto's header
  // comment and TwoStageVerificationService.checkDocumentWithVendor's
  // backfill logic. Never populated with a fabricated value.
  @Column({ name: 'document_number', type: 'varchar', length: 64, nullable: true })
  documentNumber!: string | null;

  // Nullable for the same reason as documentNumber — there is nothing to
  // fingerprint until a real document number exists.
  @Index('idx_identity_documents_fingerprint')
  @Column({ name: 'document_number_normalized', type: 'varchar', length: 64, nullable: true })
  documentNumberNormalized!: string | null;

  // Nullable — required at submission for captureMethod=manual_entry
  // (except drivers_licence), but legitimately absent for captureMethod=scan
  // (some ID cards have no expiry at all) until/unless Didit's document-check
  // extracts one. See SubmitDocumentRequestDto's header comment.
  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate!: string | null;

  @Column({ name: 'issuing_state', type: 'varchar', length: 10, nullable: true })
  issuingState!: string | null;

  @Column({
    name: 'capture_method',
    type: 'enum',
    enum: CaptureMethod,
    enumName: 'capture_method_enum',
  })
  captureMethod!: CaptureMethod;

  @Column({ name: 'document_image_reference', type: 'varchar', length: 512 })
  documentImageReference!: string;

  // Optional — many document types have no back side. Same R2 object-key
  // convention as documentImageReference.
  @Column({ name: 'back_image_reference', type: 'varchar', length: 512, nullable: true })
  backImageReference!: string | null;

  // --- Standalone Didit document-check result (POST /v3/id-verification/) ---
  // Populated by checkDocumentWithVendor. Never set by anything else.
  @Column({
    name: 'document_check_status',
    type: 'enum',
    enum: DocumentCheckStatus,
    enumName: 'document_check_status_enum',
    nullable: true,
  })
  documentCheckStatus!: DocumentCheckStatus | null;

  // Trimmed {risk, logType, shortDescription} entries only — never the
  // full vendor payload (extracted personal fields, images).
  @Column({ name: 'document_check_warnings', type: 'jsonb', nullable: true })
  documentCheckWarnings!: Array<{ risk: string; logType: string; shortDescription: string }> | null;

  // SHA-256 of the exact image bytes actually submitted, so a cached
  // result can never be silently reused against a replaced image.
  @Column({ name: 'document_check_image_hash', type: 'varchar', length: 64, nullable: true })
  documentCheckImageHash!: string | null;

  // Didit's own request_id from the (save_api_request=true) document
  // check — needed to look the stored portrait back up later, since
  // "Begin verifying" can happen well after document submission.
  @Column({ name: 'document_check_request_id', type: 'varchar', length: 128, nullable: true })
  documentCheckRequestId!: string | null;

  @Column({ name: 'document_checked_at', type: 'timestamptz', nullable: true })
  documentCheckedAt!: Date | null;

  @Column({
    name: 'verification_depth',
    type: 'enum',
    enum: VerificationDepth,
    enumName: 'verification_depth_enum',
    nullable: true,
  })
  verificationDepth!: VerificationDepth | null;

  @Column({ name: 'is_duplicate_match', type: 'boolean', default: false })
  isDuplicateMatch!: boolean;

  @Index('idx_identity_documents_duplicate_of')
  @Column({ name: 'duplicate_of_document_id', type: 'uuid', nullable: true })
  duplicateOfDocumentId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => VerificationAttempt, (attempt) => attempt.document)
  attempts!: VerificationAttempt[];
}
