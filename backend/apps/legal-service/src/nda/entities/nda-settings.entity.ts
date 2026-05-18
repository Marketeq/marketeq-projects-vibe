import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { NdaDocument } from './nda-document.entity';
import { DisplayNameFormat } from '../enums/display-name-format.enum';

@Entity('ls_nda_settings')
export class NdaSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  ndaDocumentId: string;

  @OneToOne(() => NdaDocument, (d) => d.settings)
  @JoinColumn({ name: 'ndaDocumentId' })
  ndaDocument: NdaDocument;

  @Column({ type: 'enum', enum: DisplayNameFormat })
  displayNameFormat: DisplayNameFormat;

  /** Required when displayNameFormat = COMPANY_REPRESENTATIVE */
  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @Column()
  jobTitleVisible: boolean;

  /** When true, talent must sign before viewing scope details */
  @Column()
  requireNdaToViewScope: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
