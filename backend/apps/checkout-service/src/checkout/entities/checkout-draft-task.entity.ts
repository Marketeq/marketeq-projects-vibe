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

@Entity('checkout_draft_tasks')
export class CheckoutDraftTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_checkout_draft_tasks_phaseId')
  @Column({ type: 'uuid' })
  phaseId: string;

  @ManyToOne(() => CheckoutDraftPhaseEntity, (phase) => phase.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'phaseId', foreignKeyConstraintName: 'FK_checkout_draft_tasks_phase' })
  phase: CheckoutDraftPhaseEntity;

  @Column({ type: 'varchar', nullable: true })
  sourceTaskId: string | null;

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

  @Column({ default: false })
  isDraftOverride: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
