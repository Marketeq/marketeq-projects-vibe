import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ResumeVersion } from './resume-version.entity';

@Entity({ schema: 'user_service', name: 'resumes' })
export class Resume {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'current_version_id', type: 'uuid', nullable: true })
  currentVersionId: string | null;

  @Column({ type: 'varchar', length: 50, default: 'idle' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ResumeVersion, (v) => v.resume)
  versions: ResumeVersion[];
}
