import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ResumeVersion } from './resume-version.entity';

@Entity({ schema: 'user_service', name: 'parse_results' })
export class ParseResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'version_id', type: 'uuid' })
  versionId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'document_type', type: 'varchar', length: 50 })
  documentType: string;

  @Column({ name: 'is_resume', type: 'boolean' })
  isResume: boolean;

  @Column({ type: 'decimal', precision: 4, scale: 3 })
  confidence: number;

  @Column({ name: 'extracted_name', type: 'varchar', length: 500, nullable: true })
  extractedName: string | null;

  @Column({ name: 'job_titles', type: 'jsonb', default: '[]' })
  jobTitles: string[];

  @Column({ type: 'jsonb', default: '[]' })
  skills: { name: string }[];

  @Column({ name: 'work_experience', type: 'jsonb', default: '[]' })
  workExperience: {
    job_title: string | null;
    company: string | null;
    start_date: string | null;
    end_date: string | null;
    description: string | null;
  }[];

  @Column({ type: 'jsonb', default: '[]' })
  education: {
    institution: string | null;
    degree: string | null;
    field_of_study: string | null;
    start_date: string | null;
    end_date: string | null;
  }[];

  @Column({ type: 'jsonb', default: '[]' })
  certifications: {
    name: string;
    issuing_body: string | null;
  }[];

  @Column({ name: 'processing_ms', type: 'int', nullable: true })
  processingMs: number | null;

  @Column({ name: 'model_attempts', type: 'int', nullable: true })
  modelAttempts: number | null;

  @Column({ type: 'boolean', default: false })
  truncated: boolean;

  @Column({ name: 'review_status', type: 'varchar', length: 50, default: 'pending' })
  reviewStatus: string;

  @CreateDateColumn({ name: 'parsed_at' })
  parsedAt: Date;

  @OneToOne(() => ResumeVersion, (v) => v.parseResult, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'version_id' })
  version: ResumeVersion;
}
