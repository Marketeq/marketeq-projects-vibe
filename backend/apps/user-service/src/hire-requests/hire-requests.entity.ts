import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HireStatus } from './enums/hire-status.enums';
import { User } from '../user/entities/user.entity';

@Entity('hire_requests')
export class HireRequests {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  clientUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientUserId' })
  client: User;

  @Column('uuid')
  talentUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'talentUserId' })
  talent: User;

  @Column({ nullable: true })
  message?: string;

  @Column()
  budgetUsd: number;

  @Column({ nullable: true })
  projectType?: string;

  @Column({ type: 'enum', enum: HireStatus, default: HireStatus.PENDING })
  status: HireStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
