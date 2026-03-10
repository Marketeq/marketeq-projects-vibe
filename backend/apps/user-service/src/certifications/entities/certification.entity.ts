import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity({ name: 'certifications', schema: 'user_service' })
export class Certification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (u) => u.certifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  issuingOrganization: string;

  @Column({ type: 'text', nullable: true })
  issueDate: string;

  @Column({ type: 'text', nullable: true })
  expiryDate: string;

  @Column({ type: 'text', nullable: true })
  credentialUrl: string;
}
