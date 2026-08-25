import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Generated,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectEntity } from './project.entity';
import { Phase } from '../../../../interface/phase';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { TaskEntity } from './task.entity';
import { Task } from '../../../../interface/task';

@Entity({ name: 'phase' })
export class PhaseEntity extends EntityRelationalHelper implements Phase {
  @Index()
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string;

  @Column({ name: 'phaseName', type: String, length: 255, nullable: false })
  name: string;

  @Column({ type: String, length: 255, nullable: true })
  stageName: string;

  @Column({ type: 'int', nullable: true })
  startDay: number;

  @Column({ type: 'int', nullable: true })
  endDay: number;

  @Column({ type: 'int', nullable: true })
  order: number;

  // Service-scope phase model: 'setup' | 'recurring' | 'ongoing'.
  // NULL for project (flat day-based) phases.
  @Column({ name: 'phaseType', type: String, length: 20, nullable: true })
  phaseType: string | null;

  // Recurring phases only: 'weekly' | 'monthly' | 'quarterly'.
  @Column({
    name: 'recurrenceSchedule',
    type: String,
    length: 20,
    nullable: true,
  })
  recurrenceSchedule: string | null;

  // Recurring phases only: how many times the phase repeats (1..99).
  @Column({ name: 'recurrenceCount', type: 'int', nullable: true })
  recurrenceCount: number | null;

  @ManyToOne(() => ProjectEntity, (project) => project.id, {
    onDelete: 'CASCADE',
  })
  project: ProjectEntity;

  @Column('uuid')
  projectId: string;

  @OneToMany(() => TaskEntity, (task) => task.phase, { cascade: true })
  tasks: TaskEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
