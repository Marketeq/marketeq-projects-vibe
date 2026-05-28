import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { DocumentType } from '../../nda/enums/document-type.enum';

/**
 * Append-only acceptance audit trail.
 * New records are inserted when document versions update — existing records are NEVER updated.
 * Unique constraint enforces one record per (user, documentType, version).
 */
@Entity('ls_acceptance_records')
@Unique(['userId', 'documentType', 'documentVersion'])
export class AcceptanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: DocumentType })
  documentType: DocumentType;

  @Column({ length: 20 })
  documentVersion: string;

  /** IPv6-safe — 45 chars */
  @Column({ length: 45 })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  browserUserAgent: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  acceptedAt: Date;
}
