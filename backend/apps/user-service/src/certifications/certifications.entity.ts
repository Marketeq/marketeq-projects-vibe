import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/entities/user.entity';

@Entity('certifications')
export class Certification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  issuer: string;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'date', nullable: true })
  expirationDate?: Date;

  @Column({ nullable: true })
  credentialId?: string;

  @Column({ nullable: true })
  credentialUrl?: string;

  @ManyToOne(() => User, (user) => user.certifications, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
