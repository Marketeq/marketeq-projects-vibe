import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('contract_label_cache')
@Index('idx_contract_label_contractor', ['contractorId'])
export class ContractLabelCache {
  @PrimaryColumn({ type: 'uuid' })
  contractId: string;

  @Column({ type: 'uuid' })
  contractorId: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @Column({ type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contractTitle: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  projectName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  clientDisplayName: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'timestamptz' })
  activatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
