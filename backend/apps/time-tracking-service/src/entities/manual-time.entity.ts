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

  @Column({ type: 'text' })
  userId: string;

  @Column({ type: 'text', nullable: true })
  projectId: string | null;

  @Column({ type: 'text', nullable: true })
  taskId: string | null;

  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status: ManualTimeStatus;

  @Column({ type: 'text', nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'text', nullable: true })
  reviewComment: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
