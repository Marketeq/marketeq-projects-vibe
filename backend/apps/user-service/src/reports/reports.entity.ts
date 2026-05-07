import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/entities/user.entity';

export type ReportStatus = 'pending' | 'reviewing' | 'actioned' | 'dismissed';

@Entity('reports')
@Index('idx_reports_reporter', ['reporterId'])
@Index('idx_reports_reported', ['reportedId'])
@Index('idx_reports_status', ['status'])
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  reporterId: string;

  @Column({ type: 'uuid' })
  reportedId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'uuid', nullable: true })
  contextThreadId: string | null;

  @Column({ type: 'uuid', nullable: true })
  contextMessageId: string | null;

  @Column({
    type: 'enum',
    enum: ['pending', 'reviewing', 'actioned', 'dismissed'],
    default: 'pending',
    enumName: 'report_status',
  })
  status: ReportStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportedId' })
  reported: User;
}
