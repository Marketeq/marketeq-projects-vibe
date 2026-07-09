import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AppealStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REQUEST_EDITS = 'request_edits',
}

@Entity('moderation_appeals')
export class Appeal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  contentId: string;

  @Index()
  @Column()
  userId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: AppealStatus, default: AppealStatus.PENDING })
  status: AppealStatus;

  @Column({ type: 'text', nullable: true })
  moderatorComments: string | null;

  @Column({ type: 'text', nullable: true })
  reviewedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;
}
