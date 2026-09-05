import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import {
  CaptureMethod,
  DocumentType,
  VpnProxyDetectionResult,
} from './enums/identity-verification.enums';

@Entity({ name: 'pending_verification_sessions', schema: 'identity_verification' })
export class PendingVerificationSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'profile_id', type: 'uuid' })
  profileId: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Index('idx_pending_verification_sessions_vendor_session_id', { unique: true })
  @Column({ name: 'vendor_session_id', type: 'varchar', length: 128 })
  vendorSessionId: string;

  @Column({ name: 'attempt_number', type: 'smallint' })
  attemptNumber: number;

  @Column({ name: 'attempt_method', type: 'enum', enum: CaptureMethod, enumName: 'capture_method_enum' })
  attemptMethod: CaptureMethod;

  @Column({ name: 'attempt_document_type', type: 'enum', enum: DocumentType, enumName: 'document_type_enum' })
  attemptDocumentType: DocumentType;

  @Column({ name: 'vpn_proxy_detection_result', type: 'enum', enum: VpnProxyDetectionResult, enumName: 'vpn_proxy_detection_result_enum' })
  vpnProxyDetectionResult: VpnProxyDetectionResult;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
