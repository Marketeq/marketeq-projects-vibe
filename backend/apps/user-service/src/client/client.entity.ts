import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/entities/user.entity';

@Entity('client')
export class ClientProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @Column({ nullable: true })
  teamName?: string;

  @Column({ nullable: true })
  role?: string;

  @Column({ nullable: true })
  industry?: string;

  @Column({ type: 'simple-array', nullable: true })
  businessTypes?: string[];

  @Column({ type: 'simple-array', nullable: true })
  teammateEmails?: string[];

  @Column({ type: 'simple-array', nullable: true })
  industries?: string[];

  @Column({ type: 'simple-array', nullable: true })
  lookingToWorkWith?: string[];

  @Column({ type: 'simple-array', nullable: true })
  skills?: string[];

  @Column({ type: 'simple-array', nullable: true })
  projectTypes?: string[];

  @Column({ nullable: true })
  budget?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
