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

  @Column({ name: 'document_number', type: 'varchar', length: 64 })
  documentNumber!: string;

  @Index('idx_identity_documents_fingerprint')
  @Column({ name: 'document_number_normalized', type: 'varchar', length: 64 })
  documentNumberNormalized!: string;

  @Column({ name: 'expiration_date', type: 'date' })
  expirationDate!: string;

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
