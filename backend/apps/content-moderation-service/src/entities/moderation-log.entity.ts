import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum ModerationAction {
  APPROVED = 'approved',
  FLAGGED = 'flagged',
  REJECTED = 'rejected',
}

export enum ContentType {
  PROJECT = 'project',
  REVIEW = 'review',
  PROFILE = 'profile',
  LISTING = 'listing',
  MESSAGE = 'message',
  MEDIA = 'media',
}

@Entity('moderation_logs')
export class ModerationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  contentId: string;

  @Column({ type: 'enum', enum: ContentType })
  contentType: ContentType;

  @Column({ type: 'enum', enum: ModerationAction })
  action: ModerationAction;

  @Column({ nullable: true })
  reason: string | null;

  @Column({ nullable: true })
  moderatorId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, any> | null;

  @CreateDateColumn()
  timestamp: Date;
}
