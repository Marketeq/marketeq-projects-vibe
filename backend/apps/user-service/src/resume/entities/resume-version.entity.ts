import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Resume } from './resume.entity';
import { ParseResult } from './parse-result.entity';

@Entity({ schema: 'user_service', name: 'resume_versions' })
export class ResumeVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'resume_id', type: 'uuid' })
  resumeId: string;

  @Column({ name: 'file_name', type: 'varchar', length: 500 })
  fileName: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 1000 })
  storageKey: string;

  @Column({ name: 'version_number', type: 'int', default: 1 })
  versionNumber: number;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;

  @ManyToOne(() => Resume, (r) => r.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resume_id' })
  resume: Resume;

  @OneToOne(() => ParseResult, (p) => p.version)
  parseResult: ParseResult;
}
