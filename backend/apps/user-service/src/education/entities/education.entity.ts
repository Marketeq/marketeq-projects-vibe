import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity({ name: 'education', schema: 'user_service' })
export class Education {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (u) => u.educations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text' })
  institution: string;

  @Column({ type: 'text' })
  degree: string;

  @Column({ type: 'text' })
  field: string;

  @Column({ type: 'text' })
  startDate: string;

  @Column({ type: 'text', nullable: true })
  endDate: string;

  @Column({ type: 'uuid', nullable: true })
  institutionId: string;

  institutionLogoUrl?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
