import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';

import { Education } from '../../education/education.entity';
import { Experience } from '../../experience/experience.entity';
import { Industry } from '../../industries/industries.entity';
import { Language } from '../../languages/languages.entity';
import { Certification } from '../../certifications/certifications.entity';
import { Portfolio } from '../../portfolio/portfolio.entity';
import { Skill } from '../../skills/skills.entity';
import { AffiliatedTeam } from '../../affiliated-teams/affiliated-teams.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'text', nullable: true })
  overview?: string;

  @Column({ nullable: true })
  userType?: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  timezone?: string;

  @Column({ nullable: true })
  availability?: string;

  @Column({ nullable: true })
  role?: string;

  @Column({ default: 'EMAIL' })
  provider: string;

  @Column({ default: false })
  hasPassword: boolean;

  @Column({ nullable: true })
  industry?: string;

  @Column({ nullable: true })
  businessGoals?: string;

  @Column({ nullable: true })
  teamName?: string;

  @Column({ nullable: true })
  inviteCode?: string;

  @Column({ default: false })
  onboardingDismissed: boolean;

  @Column({ nullable: true })
  onboardingStatus?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  onboardedAt?: Date;

  @Column({ type: 'numeric', nullable: true })
  rateMin?: number;

  @Column({ type: 'numeric', nullable: true })
  rateMax?: number;

  @Column({ type: 'jsonb', nullable: true })
  jobTitles?: string[];

  // Restored in migration 1773700000000 — previous "align entity with DB"
  // pass (commit 371fd4f3) dropped these columns from the entity, which
  // caused Talent onboarding / settings / custom-availability writes to
  // silently no-op. Re-added here and re-asserted in the DB.
  @Column({ type: 'varchar', nullable: true })
  recentJobTitle?: string;

  // These four columns are JSONB to tolerate the mixed shapes in callers
  // (single string vs string[]). Type as `any` so both forms compile.
  @Column({ type: 'jsonb', nullable: true })
  industriesWorkedIn?: any;

  @Column({ type: 'jsonb', nullable: true })
  lookingToWorkWith?: any;

  @Column({ type: 'jsonb', nullable: true })
  projectTypes?: any;

  @Column({ type: 'jsonb', nullable: true })
  language?: any;

  @Column({ type: 'jsonb', nullable: true })
  customAvailability?: unknown;

  @Column({ type: 'boolean', nullable: true, default: false })
  isStudent?: boolean;

  @Column({ type: 'int', nullable: true })
  gettingStartedStep?: number;

  @Column({ type: 'int', nullable: true })
  totalProjectsCompleted?: number;

  @Column({ type: 'numeric', nullable: true })
  clientSuccessRating?: number;

  @Column({ type: 'numeric', nullable: true })
  repeatHireRate?: number;

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
