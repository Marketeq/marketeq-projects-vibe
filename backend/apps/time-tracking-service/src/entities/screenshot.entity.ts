import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

@Entity('screenshots')
@Index(['userId', 'timestamp'])
@Index(['groupKey'])
export class Screenshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  projectId: string | null;

  @Column({ nullable: true })
  taskId: string | null;

  @Column()
  imageUrl: string;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ type: 'int', default: 0 })
  keyboard: number;

  @Column({ type: 'int', default: 0 })
  mouse: number;

  @Column({ type: 'float', nullable: true })
  keyboardPct: number | null;

  @Column({ type: 'float', nullable: true })
  mousePct: number | null;

  @Column({ default: false })
  isBlurred: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  blurredAt: Date | null;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ nullable: true })
  deletionReason: string | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    nullable: true,
  })
  reviewStatus: ReviewStatus | null;

  @Column({ nullable: true })
  monitorId: string | null;

  @Column({ nullable: true })
  groupKey: string | null;

  @Column({ type: 'jsonb', nullable: true })
  appUsage: Record<string, any>[] | null;

  @CreateDateColumn()
  createdAt: Date;
}
