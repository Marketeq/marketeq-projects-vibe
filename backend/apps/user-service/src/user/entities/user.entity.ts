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

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  overview: string;

  @Column({ type: 'enum', enum: ['client', 'talent'], nullable: true })
  userType: UserType;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  timezone: string;

  @Column({ nullable: true })
  availability: string;

  @Column({ nullable: true })
  role: string;

  @Column({ nullable: true })
  industry: string;

  @Column('simple-array', { nullable: true })
  businessGoals: string[];

  @Column({ nullable: true })
  teamName: string;

  @Column({ nullable: true })
  inviteCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  rateMin: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  rateMax: number;

  @Column({ default: false })
  onboardingDismissed: boolean;

  @Column({ type: 'enum', enum: ['pending', 'completed', 'skipped'], default: 'pending' })
  onboardingStatus: OnboardingStatus;

  @Column({ default: true })
  isActive: boolean;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
