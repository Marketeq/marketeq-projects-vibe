import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface AppUsageEntry {
  iconUrl: string;
  appName: string;
  url?: string;
}

@Entity({ name: 'screenshots', schema: 'public' })
@Index('idx_screenshots_user_created', ['userId', 'createdAt'])
@Index('idx_screenshots_group_key', ['groupKey'])
export class Screenshot {
  // ── Core (from original) ────────────────────────────────────────────
  @PrimaryGeneratedColumn('uuid') id!: string;

  @Column({ name: 'user_id', type: 'text' })
  userId!: string;

  /** Cloudflare R2 object key — used to generate signed GET URLs */
  @Column({ name: 'key', type: 'text', unique: true })
  key!: string;

  @Column({ name: 'mime_type', type: 'text' })
  mimeType!: string;

  @Column({ name: 'bytes', type: 'int' })
  bytes!: number;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  // ── Extended metadata ───────────────────────────────────────────────
  @Column({ name: 'captured_at', type: 'timestamptz', nullable: true })
  capturedAt!: Date | null;

  @Column({ name: 'project_id', type: 'text', nullable: true })
  projectId!: string | null;

  @Column({ name: 'task_id', type: 'text', nullable: true })
  taskId!: string | null;

  /** Primary URL of the page visible in the screenshot (for URL filter) */
  @Column({ name: 'url', type: 'text', nullable: true })
  url!: string | null;

  // ── Activity data ───────────────────────────────────────────────────
  @Column({ name: 'keyboard', type: 'int', default: 0 })
  keyboard!: number;

  @Column({ name: 'mouse', type: 'int', default: 0 })
  mouse!: number;

  @Column({ name: 'keyboard_pct', type: 'int', default: 0 })
  keyboardPct!: number;

  @Column({ name: 'mouse_pct', type: 'int', default: 0 })
  mousePct!: number;

  /** App usage entries: [{iconUrl, appName, url?}] — used in detail view and app filter */
  @Column({ name: 'apps', type: 'jsonb', nullable: true })
  apps!: AppUsageEntry[] | null;

  // ── Blur / moderation ───────────────────────────────────────────────
  @Column({ name: 'is_blurred', type: 'boolean', default: false })
  isBlurred!: boolean;

  @Column({ name: 'blurred_at', type: 'timestamptz', nullable: true })
  blurredAt!: Date | null;

  @Column({ name: 'is_flagged', type: 'boolean', default: false })
  isFlagged!: boolean;

  @Column({ name: 'flagged_by', type: 'text', nullable: true })
  flaggedBy!: string | null;

  @Column({ name: 'flagged_at', type: 'timestamptz', nullable: true })
  flaggedAt!: Date | null;

  @Column({
    name: 'review_status',
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    nullable: true,
  })
  reviewStatus!: ReviewStatus | null;

  @Column({ name: 'reviewed_by', type: 'text', nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'review_comment', type: 'text', nullable: true })
  reviewComment!: string | null;

  // ── Soft-delete metadata ────────────────────────────────────────────
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @Column({ name: 'deletion_reason', type: 'text', nullable: true })
  deletionReason!: string | null;

  // ── Multi-monitor grouping ──────────────────────────────────────────
  @Column({ name: 'monitor_id', type: 'text', nullable: true })
  monitorId!: string | null;

  /** Groups simultaneous screenshots from multiple monitors */
  @Column({ name: 'group_key', type: 'text', nullable: true })
  groupKey!: string | null;
}
