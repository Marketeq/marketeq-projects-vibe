import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { GroupType } from './enums';
import { Contract } from './contract.entity';

@Entity('contract_groups')
export class ContractGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: GroupType })
  type: GroupType;

  @Column()
  ownerClientId: string;

  @Column({ nullable: true })
  projectId: string;

  @Column({ nullable: true })
  serviceId: string;

  @Column({ nullable: true })
  teamId: string;

  @Column({ nullable: true })
  jobId: string;

  @Column({ default: false })
  depositPaid: boolean;

  @OneToMany(() => Contract, (c) => c.group, { cascade: true })
  contracts: Contract[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
