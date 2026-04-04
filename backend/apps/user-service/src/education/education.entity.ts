import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/entities/user.entity';

@Entity('educations')
export class Education {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  school: string;

  @Column()
  degree: string;

  @Column()
  fieldOfStudy: string;

  @Column({ type: 'int' })
  startYear: number;

  @Column({ type: 'int', nullable: true })
  startMonth?: number;

  @Column({ type: 'int', nullable: true })
  endYear?: number;

  @Column({ type: 'int', nullable: true })
  endMonth?: number;

  @Column({ default: false })
  isCurrent: boolean;

  @ManyToOne(() => User, (user) => user.educations, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
