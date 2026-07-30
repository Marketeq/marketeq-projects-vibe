import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export type SyncAction = 'added' | 'replaced' | 'kept' | 'undone';

@Entity({ schema: 'user_service', name: 'sync_audits' })
export class SyncAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'parse_result_id', type: 'uuid' })
  parseResultId: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType: 'skill' | 'education' | 'experience' | 'certification' | 'job_title';

  @Column({ type: 'varchar', length: 20 })
  action: SyncAction;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ name: 'previous_data', type: 'jsonb', nullable: true })
  previousData: Record<string, any> | null;

  @Column({ name: 'new_data', type: 'jsonb', nullable: true })
  newData: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
