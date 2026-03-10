import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Education } from '../../education/entities/education.entity';
import { Experience } from '../../experience/entities/experience.entity';
import { Skill } from '../../skills/entities/skill.entity';
import { Language } from '../../languages/entities/language.entity';
import { Certification } from '../../certifications/entities/certification.entity';
import { Industry } from '../../industries/entities/industry.entity';

export type UserType = 'client' | 'talent';
export type OnboardingStatus = 'pending' | 'completed' | 'skipped';

@Entity({ name: 'users', schema: 'user_service' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  email: string;

  @Column({ type: 'text', unique: true, nullable: true })
  username: string;

  @Column({ type: 'text', nullable: true })
  firstName: string;

  @Column({ type: 'text', nullable: true })
  lastName: string;

  @Column({ type: 'text', nullable: true })
  avatarUrl: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'text', nullable: true })
  overview: string;

  @Column({ type: 'text', nullable: true })
  userType: UserType;

  @Column({ type: 'text', nullable: true })
  location: string;

  @Column({ type: 'text', nullable: true })
  timezone: string;

  @Column({ type: 'text', nullable: true })
  availability: string;

  @Column({ type: 'text', nullable: true })
  role: string;

  @Column({ type: 'text', nullable: true })
  industry: string;

  @Column({ type: 'text', nullable: true })
  businessGoals: string;

  @Column({ type: 'text', nullable: true })
  teamName: string;

  @Column({ type: 'text', nullable: true })
  inviteCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  rateMin: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  rateMax: number;

  @Column({ type: 'boolean', default: false })
  onboardingDismissed: boolean;

  @Column({ type: 'text', default: 'pending' })
  onboardingStatus: OnboardingStatus;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /** Timestamp when user completed registration/onboarding */
  @Column({ type: 'timestamptz', nullable: true })
  onboardedAt: Date | null;

  @OneToMany(() => Education, (e) => e.user, { cascade: true })
  education: Education[];

  @OneToMany(() => Experience, (e) => e.user, { cascade: true })
  experience: Experience[];

  @OneToMany(() => Skill, (s) => s.user, { cascade: true })
  skills: Skill[];

  @OneToMany(() => Language, (l) => l.user, { cascade: true })
  languages: Language[];

  @OneToMany(() => Certification, (c) => c.user, { cascade: true })
  certifications: Certification[];

  @OneToMany(() => Industry, (i) => i.user, { cascade: true })
  industries: Industry[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
