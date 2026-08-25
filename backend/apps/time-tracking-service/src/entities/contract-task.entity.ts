import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'contract_tasks', schema: 'time_tracking' })
@Index('idx_contract_tasks_contract', ['contractId'])
export class ContractTask {
  // Real column is uuid (default gen_random_uuid()) — the entity previously
  // declared this as `text` with a manually-built "task-{contractId}-{ts}"
  // id, which would fail to insert against the actual uuid column.
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'contract_id', type: 'text' })
  contractId!: string;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  // Real column is boolean (default false) — the entity previously declared
  // this as `int`, which fails with a Postgres type-mismatch error on any
  // query comparing it against 0/1 ("Database error" surfaced to the
  // frontend on every GET /tasks/contract/:id call).
  @Column({ name: 'archived', type: 'boolean', default: false })
  archived!: boolean;

  @Column({ name: 'created_by', type: 'text' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
