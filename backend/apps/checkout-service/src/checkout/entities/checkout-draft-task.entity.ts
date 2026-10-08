import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CheckoutDraftPhaseEntity } from './checkout-draft-phase.entity';

@Entity('draft_tasks')
export class CheckoutDraftTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_draft_tasks_phaseId')
  @Column({ type: 'uuid' })
  phaseId: string;

  @ManyToOne(() => CheckoutDraftPhaseEntity, (phase) => phase.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'phaseId', foreignKeyConstraintName: 'FK_draft_tasks_phase' })
  phase: CheckoutDraftPhaseEntity;

  @Column()
  title: string;

  @Column({ type: 'varchar', nullable: true })
  roleName: string | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  location: string[];

  @Column({ type: 'varchar', nullable: true })
  experienceLevel: string | null;

  @Column({ type: 'int', nullable: true })
  durationHours: number | null;

  @Column({ type: 'uuid', nullable: true })
  assigneeUserId: string | null;

  @Column({ type: 'int' })
  order: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
