import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'manual_time_entries' })
export class ManualTimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  projectId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  taskId?: string | null;

  @Index()
  @Column({ type: 'timestamptz' })
  startAt: Date;

  @Index()
  @Column({ type: 'timestamptz' })
  endAt: Date;

  @Column({ type: 'text', default: '' })
  note: string;

  @Index()
  @Column({ type: 'boolean', default: false })
  approved: boolean;

  @Column({ type: 'boolean', default: false })
  deleted: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
