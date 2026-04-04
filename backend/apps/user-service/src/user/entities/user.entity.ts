import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { BeforeInsert, BeforeUpdate } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { Education } from '../../education/education.entity';
import { Experience } from '../../experience/experience.entity';
import { Industry } from '../../industries/industries.entity';
import { Language } from '../../languages/languages.entity';
import { Certification } from '../../certifications/certifications.entity';
import { Portfolio } from '../../portfolio/portfolio.entity';
import { Skill } from '../../skills/skills.entity';
import { UserRole } from '../enums/user-role.enum';
import { AffiliatedTeam } from '../../affiliated-teams/affiliated-teams.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // `username` can be unset. Uniqueness is enforced via a partial unique index in migrations
  // (only when `username IS NOT NULL`), not via a global unique index here.
  @Column({ nullable: true })
  username?: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ select: false, nullable: true })
  password?: string;

  @Column({ default: 'EMAIL' })
  provider: string;

  @Column({ default: false })
  hasPassword: boolean;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (!this.password) return;

    if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$'))
      return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'text', nullable: true })
  overview?: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  language?: string;

  @Column({ nullable: true })
  recentJobTitle?: string;

  @Column({ nullable: true })
  industriesWorkedIn?: string;

  @Column({ nullable: true })
  timezone?: string;

  @Column({ nullable: true })
  availability?: string;

  @Column({ type: 'simple-array', nullable: true })
  lookingToWorkWith?: string[];

  @Column({ type: 'simple-array', nullable: true })
  projectTypes?: string[];

  @Column({ type: 'boolean', default: false })
  isStudent?: boolean;

  @Column({ type: 'jsonb', nullable: true })
  customAvailability?: unknown;

  @Column({ type: 'numeric', nullable: true })
  rate_min?: number;

  @Column({ type: 'numeric', nullable: true })
  rate_max?: number;

  @Column({ type: 'numeric', nullable: true })
  client_success_rating?: number;

  @Column({ type: 'numeric', nullable: true })
  repeat_hire_rate?: number;

  @Column({ nullable: true })
  response_time?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENT })
  role: UserRole;

  @Column({ default: false })
  onboardingDismissed: boolean;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Education, (education) => education.user)
  educations: Education[];

  @OneToMany(() => Experience, (experience) => experience.user)
  experiences: Experience[];

  @OneToMany(() => Certification, (certification) => certification.user)
  certifications: Certification[];

  @OneToMany(() => Industry, (industry) => industry.user)
  industries: Industry[];

  @OneToMany(() => Language, (language) => language.user)
  languages: Language[];

  @OneToMany(() => Portfolio, (portfolio) => portfolio.user)
  portfolioItems: Portfolio[];

  @OneToMany(() => Skill, (skill) => skill.user)
  skills: Skill[];

  @OneToMany(() => AffiliatedTeam, (affiliatedTeam) => affiliatedTeam.user)
  affiliatedTeams: AffiliatedTeam[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
