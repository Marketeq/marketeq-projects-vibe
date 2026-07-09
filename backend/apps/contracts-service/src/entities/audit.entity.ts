import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('contract_audits')
export class ContractAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  role: string;

  @Column()
  action: string; // e.g., "CONTRACT_ENDED"

  @Column({ nullable: true })
  contractId: string;

  @Column({ nullable: true })
  groupId: string;

  @Column('jsonb', { nullable: true })
  details: any;

  @CreateDateColumn()
  createdAt: Date;
}
