import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('contract_audits')
@Index(['contractId'])
@Index(['groupId'])
export class ContractAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  role: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  contractId?: string;

  @Column({ nullable: true })
  groupId?: string;

  @Column('jsonb', { nullable: true })
  details?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
