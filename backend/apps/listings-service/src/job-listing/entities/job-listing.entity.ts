import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { JobListingStatus } from '../enums/job-listing-status.enum';
import { JobListingType } from '../enums/job-listing-type.enum';
import { ContractType } from '../enums/contract-type.enum';
import { WorkType } from '../enums/work-type.enum';
import { HiringType } from '../enums/hiring-type.enum';
import { ScopeKnowledge } from '../enums/scope-knowledge.enum';
import { Frequency } from '../enums/frequency.enum';
import { JobListingPhase } from './job-listing-phase.entity';
import { TeamMemberRow } from './job-listing-role-row.entity';
import { RoleDescription } from './job-listing-role-description.entity';
import { BasicInformation } from './job-listing-basic-info.entity';

// Smart Assistant history entry shape
export interface SmartAssistantHistoryEntry {
  id:        string;  // UUID
  field:     string;  // "scope" | "title" | "overview" | "benefits" | "responsibilities"
  before:    unknown; // Previous value
  after:     unknown; // New value after AI edit
  command:   string;  // The command that produced this entry
  createdAt: string;  // ISO timestamp
}

@Entity({ name: 'job_listings' })
export class JobListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── OWNERSHIP ──────────────────────────────────────────────────
  @Column({ name: 'client_user_id', type: 'uuid' })
  clientUserId: string;

  @Column({ name: 'contract_id', type: 'uuid', nullable: true })
  contractId: string | null;

  // ── WIZARD STATE ───────────────────────────────────────────────
  @Column({ type: 'enum', enum: JobListingStatus, default: JobListingStatus.DRAFT })
  status: JobListingStatus;

  @Column({ type: 'enum', enum: ContractType })
  contractType: ContractType;

  @Column({ type: 'enum', enum: WorkType, nullable: true })
  workType: WorkType | null;

  @Column({ type: 'enum', enum: HiringType, nullable: true })
  hiringType: HiringType | null;

  @Column({ type: 'enum', enum: ScopeKnowledge, nullable: true })
  scopeKnowledge: ScopeKnowledge | null;

  @Column({ type: 'enum', enum: JobListingType, nullable: true })
  listingType: JobListingType | null;

  // ── STEP 2 FIELDS ──────────────────────────────────────────────
  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'deliverables', type: 'text', nullable: true })
  deliverables: string | null;

  @Column({ name: 'success_criteria', type: 'text', nullable: true })
  successCriteria: string | null;

  @Column({ name: 'headcount', type: 'int', nullable: true })
  headcount: number | null;

  // ── BUDGET ─────────────────────────────────────────────────────
  // Always stored in USD cents to avoid floating-point errors.
  // Display conversion handled by pricing-service using the client's
  // display currency preference from user-service.
  @Column({ name: 'budget_amount_usd_cents', type: 'bigint', default: 0 })
  budgetAmountUsdCents: number;

  @Column({ type: 'enum', enum: Frequency, default: Frequency.PER_WEEK })
  budgetFrequency: Frequency;

  // ── DURATION ───────────────────────────────────────────────────
  @Column({ name: 'duration_months', type: 'int', nullable: true })
  durationMonths: number | null;

  // True for SERVICE listings where duration is Ongoing with no end date.
  @Column({ name: 'is_ongoing', type: 'boolean', default: false })
  isOngoing: boolean;

  // ── BRIEF DOCUMENT ─────────────────────────────────────────────
  // R2 object key for the uploaded brief. Null if no brief was uploaded.
  @Column({ name: 'brief_r2_key', type: 'varchar', length: 512, nullable: true })
  briefR2Key: string | null;

  @Column({ name: 'brief_filename', type: 'varchar', length: 255, nullable: true })
  briefFilename: string | null;

  @Column({ name: 'brief_size_bytes', type: 'int', nullable: true })
  briefSizeBytes: number | null;

  // ── NDA ────────────────────────────────────────────────────────
  @Column({ name: 'nda_enabled', type: 'boolean', default: false })
  ndaEnabled: boolean;

  // UUID of the NDA document in legal-service. Null until NDA is generated.
  @Column({ name: 'nda_document_id', type: 'uuid', nullable: true })
  ndaDocumentId: string | null;

  // Controls what talent sees after signing NDA.
  // 'relevant_phases' = only phases associated with their role (default).
  // 'full_scope'      = entire scope (client must explicitly opt in).
  @Column({ name: 'nda_scope_visibility', type: 'varchar', length: 20, default: 'relevant_phases' })
  ndaScopeVisibility: string;

  // ── INVITE STATE ───────────────────────────────────────────────
  @Column({ name: 'invite_balance', type: 'int', default: 0 })
  inviteBalance: number;

  @Column({ name: 'invites_sent', type: 'int', default: 0 })
  invitesSent: number;

  // ── MODERATION ─────────────────────────────────────────────────
  @Column({ name: 'moderation_rejection_reason', type: 'text', nullable: true })
  moderationRejectionReason: string | null;

  @Column({ name: 'last_moderation_submitted_at', type: 'timestamptz', nullable: true })
  lastModerationSubmittedAt: Date | null;

  // Tracks which fields were sent on the last moderation submission.
  // Used to avoid re-submitting unchanged fields on subsequent edits.
  @Column({ name: 'last_moderated_fields', type: 'jsonb', nullable: true })
  lastModeratedFields: string[] | null;

  // ── ALGOLIA ────────────────────────────────────────────────────
  @Column({ name: 'algolia_object_id', type: 'varchar', length: 255, nullable: true })
  algoliaObjectId: string | null;

  // ── DRAFT STALENESS ────────────────────────────────────────────
  @Column({ name: 'last_activity_at', type: 'timestamptz', nullable: true })
  lastActivityAt: Date | null;

  @Column({ name: 'stale_warning_sent', type: 'boolean', default: false })
  staleWarningSent: boolean;

  // Highest wizard step the client has reached (1–5). Null until the first
  // step is completed. Never decreases — only advances forward.
  @Column({ name: 'last_completed_step', type: 'int', nullable: true })
  lastCompletedStep: number | null;

  // ── SMART ASSISTANT HISTORY ────────────────────────────────────
  // Stores the Smart Assistant edit history for Step 4 and Step 5.
  // Each entry: { id, field, before, after, command, createdAt }
  // 'field' is 'scope' for Step 4, or the field name for Step 5.
  // 'before' and 'after' are the full field values before and after the edit.
  // Maximum 20 history entries kept. Oldest entries are pruned when limit is exceeded.
  @Column({ name: 'smart_assistant_history', type: 'jsonb', default: () => "'[]'" })
  smartAssistantHistory: SmartAssistantHistoryEntry[];

  // ── RELATIONS ──────────────────────────────────────────────────
  @OneToMany(() => JobListingPhase, (phase) => phase.jobListing, { cascade: true, eager: false })
  phases: JobListingPhase[];

  @OneToMany(() => TeamMemberRow, (row) => row.jobListing, { cascade: true, eager: false })
  teamMemberRows: TeamMemberRow[];

  @OneToMany(() => RoleDescription, (rd) => rd.jobListing, { cascade: true, eager: false })
  roleDescriptions: RoleDescription[];

  @OneToMany(() => BasicInformation, (bi) => bi.jobListing, { cascade: true, eager: false })
  basicInformation: BasicInformation[];

  // ── TIMESTAMPS ─────────────────────────────────────────────────
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;
}
