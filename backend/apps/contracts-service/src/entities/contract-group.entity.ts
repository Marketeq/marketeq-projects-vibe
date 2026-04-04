import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { GroupType } from './enums';
import { Contract } from './contract.entity';

/**
 * ContractGroup
 * Represents a logical grouping of individual contracts
 * (e.g., one project with multiple people hired).
 * Used for bundled deposits and billing purposes.
 */
@Entity('contract_groups')
export class ContractGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // What type of group this is (project, service, team, or job)
  @Column({ type: 'enum', enum: GroupType })
  type: GroupType;

  // The client who owns this group of contracts
  @Column()
  ownerClientId: string;

  // Optional references to external services (validate via Listing Service)
  @Column({ nullable: true })
  projectId: string;

  @Column({ nullable: true })
  serviceId: string;

  @Column({ nullable: true })
  teamId: string;

  @Column({ nullable: true })
  jobId: string;

  // Flag set true when initial deposit is successfully paid
  @Column({ default: false })
  depositPaid: boolean;

  // Automatic timestamps
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Contract, (contract) => contract.group)
  contracts: Contract[];
}
