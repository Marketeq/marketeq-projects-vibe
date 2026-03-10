import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { ContractStatus } from './enums';
import { ContractGroup } from './contract-group.entity';

@Entity('contracts')
@Index(['clientId'])
@Index(['talentId'])
@Index(['status'])
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  groupId: string;

  @ManyToOne(() => ContractGroup, (g) => g.contracts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: ContractGroup;

  @Column()
  clientId: string;

  @Column()
  talentId: string;

  @Column()
  title: string;

  @Column('decimal', { precision: 10, scale: 2 })
  rate: number;

  @Column()
  schedule: string;

  @Column()
  duration: string;

  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.PENDING })
  status: ContractStatus;

  @Column({ nullable: true })
  startAtISO: string;

  @Column({ nullable: true })
  endAtISO: string;

  @Column({ nullable: true })
  reasonCode: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  projectId: string;

  @Column({ nullable: true })
  serviceId: string;

  @Column({ nullable: true })
  teamId: string;

  @Column({ nullable: true })
  jobId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
