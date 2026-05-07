import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Generated,
  Index,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PhaseEntity } from './phase.entity';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { Task } from '../../../../interface/task';

@Entity({ name: 'task' })
export class TaskEntity extends EntityRelationalHelper implements Task {
  @Index()
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string;

  @Column({ name: 'title', type: String, length: 255, nullable: false })
  taskName: string;

  @Column({ type: String, length: 255, nullable: false })
  role: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', array: true, nullable: false, default: [] })
  location: string[];

  @Column({ type: 'text', array: true, nullable: false, default: [] })
  experience: string[];

  @Column({ type: String, length: 255, nullable: false })
  experienceLevel: string;

  @Column({ type: 'int', nullable: true })
  estimatedHours: number;

  @Column({ type: String, nullable: false })
  duration: string;

  @ManyToOne(() => PhaseEntity, (phase) => phase.tasks, { onDelete: 'CASCADE' })
  phase: PhaseEntity;

  @Column('uuid')
  phaseId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
