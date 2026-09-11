import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from './company.entity';

export const COMPANY_ROLES = ['admin', 'editor', 'viewer'] as const;
export type CompanyRole = (typeof COMPANY_ROLES)[number];

@Entity('company_users')
export class CompanyUser {
  @Index('idx_company_users_company')
  @PrimaryColumn({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Index('idx_company_users_user')
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ length: 50, default: 'viewer' })
  role!: string;

  @Column({ type: 'text', array: true, default: '{}' })
  permissions!: string[];

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt!: Date;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company?: Company;
}
