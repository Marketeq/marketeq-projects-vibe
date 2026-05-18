import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { DocumentType } from '../../nda/enums/document-type.enum';

/**
 * Immutable aggregation layer.
 * Created once per signing/acceptance event — never updated.
 * Presigned download URL is regenerated fresh on every GET.
 */
@Entity('ls_legal_document_records')
export class LegalDocumentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: DocumentType })
  documentType: DocumentType;

  @Column({ length: 300 })
  relatedTitle: string;

  @Column({ length: 20 })
  version: string;

  /** R2 key for the signed PDF — null for ToS/Privacy acceptance records */
  @Column({ type: 'varchar', length: 512, nullable: true })
  signedPdfR2Key: string | null;

  @Column({ length: 30 })
  signingMethod: string;

  /** FK to NdaSigningEvent.id or AcceptanceRecord.id */
  @Column('uuid')
  sourceRecordId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  signedAt: Date;
}
