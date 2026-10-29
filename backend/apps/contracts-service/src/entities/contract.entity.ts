import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ContractStatus } from './enums';
import { ContractGroup } from './contract-group.entity';

/**
 * Contract
 * Always represents one individual talent profile hired by one client.
 * Can be linked to a project/service/team/job through its group.
 */
@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Reference to the parent group (for deposit & billing orchestration)
  @Column()
  groupId: string;

  // Core identifiers
  @Column()
  clientId: string;

  @Column({ name: 'client_name', default: '' })
  clientName: string;

  @Column()
  talentId: string;

  // UI-driven fields (set during "Hire Me" flow)
  @Column()
  title: string; // e.g., "UX Designer for Mobile App"

  @Column('decimal', { precision: 10, scale: 2 })
  rate: number; // hourly rate depending on contract

  @Column()
  schedule: string; // e.g., "full-time", "part-time", "custom"

  @Column()
  duration: string; // e.g., "3 months", "6 months", "ongoing"

  // Lifecycle status
  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.PENDING,
  })
  status: ContractStatus;

  // Timestamps for lifecycle transitions
  @Column({ nullable: true })
  startAtISO: string;

  @Column({ nullable: true })
  endAtISO: string;

  // Optional direct associations (duplicate for fast lookup)
  @Column({ nullable: true })
  projectId: string;

  @Column({ nullable: true })
  serviceId: string;

  @Column({ nullable: true })
  teamId: string;

  @Column({ nullable: true })
  jobId: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  // The accepted offer this contract was created from (OS-07). Null for
  // contracts that predate the offer handoff. Unique when set.
  @Column({ type: 'uuid', nullable: true })
  offerId: string | null;

  // PMCM-829: weekly time cap agreed in the offer (workSchedule). Tracked
  // time over it is not billed. Null = no cap known for this contract.
  @Column({ type: 'int', nullable: true })
  weeklyCapHours: number | null;

  // Automatic timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ContractGroup, (group) => group.contracts)
  @JoinColumn({ name: 'groupId' })
  group: ContractGroup;
}
