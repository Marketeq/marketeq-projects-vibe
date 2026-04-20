import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ManualTimeStatus = 'pending' | 'approved' | 'rejected';

@Entity({ name: 'manual_time', schema: 'time_tracking' })
@Index(['userId', 'status'])
export class ManualTime {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'text' })
  userId: string;

  @Column({ name: 'contract_id', type: 'text', nullable: true })
  contractId: string | null;

  @Column({ name: 'task_id', type: 'text', nullable: true })
  taskId: string | null;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status: ManualTimeStatus;

  @Column({ name: 'reviewed_by', type: 'text', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'review_comment', type: 'text', nullable: true })
  reviewComment: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
