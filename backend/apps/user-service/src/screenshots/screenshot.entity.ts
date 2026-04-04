import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'screenshots' })
export class Screenshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  projectId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  taskId: string | null;

  @Column({ type: 'timestamptz' })
  takenAt: Date;

  @Column({ type: 'varchar', length: 1024 })
  imageUrl: string;

  @Column({ type: 'smallint', default: 0 })
  activityPercent: number;

  @Column({ type: 'text', array: true, default: {} })
  appsUsed: string[];

  @Column({ type: 'boolean', default: false })
  blurred: boolean;

  @Column({ type: 'boolean', default: false })
  deleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
