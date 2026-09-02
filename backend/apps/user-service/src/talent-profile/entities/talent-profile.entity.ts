import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("talent_profiles")
export class TalentProfile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 64, unique: true })
  externalId: string;

  @Column({ type: "varchar", length: 64, nullable: true, unique: true })
  sourceId: string | null;

  @Column({ type: "varchar", length: 120, unique: true })
  username: string;

  @Column({ type: "varchar", length: 180 })
  name: string;

  @Column({ type: "varchar", length: 1024, nullable: true })
  avatarUrl: string | null;

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  jobTitles: { headline: string; rate: number }[];

  @Column({ type: "varchar", length: 10, nullable: true })
  availability: string | null;

  @Column({ type: "varchar", length: 180, nullable: true })
  location: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  country: string | null;

  @Column({ type: "varchar", length: 60, nullable: true })
  timezone: string | null;

  @Column({ type: "int", nullable: true })
  rate: number | null;

  @Column({ type: "jsonb", nullable: true })
  overview: Record<string, any> | null;

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  skills: string[];

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  industryExpertise: string[];

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  languages: { language: string; fluency: string }[];

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  certifications: {
    title: string;
    organization: string;
    dateAwarded: string | null;
  }[];

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  education: {
    institution: string;
    degree: string;
    graduationYear: number | null;
  }[];

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  workExperience: {
    role: string;
    company: string;
    startDate: string | null;
    endDate: string | null;
    description: string | null;
    skills: string[];
  }[];

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  portfolio: {
    title: string;
    url: string | null;
    thumbnailId: number | null;
    thumbnailUrl: string | null;
    description: string | null;
  }[];

  @Column({ type: "varchar", length: 20, default: "active" })
  status: "active" | "inactive" | "suspended";

  // System-generated fields — NOT overwritten by CMS sync
  @Column({ type: "numeric", precision: 3, scale: 2, nullable: true })
  rating: number | null;

  @Column({ type: "int", nullable: true })
  reviewsCount: number | null;

  @Column({ type: "int", nullable: true })
  totalProjectsCompleted: number | null;

  @Column({ type: "numeric", precision: 5, scale: 2, nullable: true })
  repeatHireRate: number | null;

  @Column({ type: "int", nullable: true })
  responseTimeHours: number | null;

  @Column({ type: "date", nullable: true })
  memberSince: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
