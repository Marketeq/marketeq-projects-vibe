import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'contract_tasks', schema: 'time_tracking' })
@Index('idx_contract_tasks_contract', ['contractId'])
export class ContractTask {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ name: 'contract_id', type: 'text' })
  contractId!: string;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'archived', type: 'int', default: 0 })
  archived!: number;

  @Column({ name: 'mirrored_at', type: 'bigint', nullable: true })
  mirroredAt!: number | null;
}