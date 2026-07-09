import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { DocumentType } from '../enums/document-type.enum';
import { NdaSigningEvent } from './nda-signing-event.entity';
import { NdaSettings } from './nda-settings.entity';

@Entity('ls_nda_documents')
export class NdaDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: DocumentType })
  documentType: DocumentType;

  @Column({ length: 20 })
  templateVersion: string;

  @Column('uuid')
  jobListingId: string;

  @Column('uuid')
  clientUserId: string;

  @Column({ length: 300 })
  clientDisplayName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  listingTitle: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  unsignedPdfR2Key: string | null;

  /** 'generated' | 'signed' | 'voided' */
  @Column({ length: 30 })
  status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  generatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  voidedAt: Date | null;

  @OneToMany(() => NdaSigningEvent, (e) => e.ndaDocument)
  signingEvents: NdaSigningEvent[];

  @OneToOne(() => NdaSettings, (s) => s.ndaDocument)
  settings: NdaSettings;
}
