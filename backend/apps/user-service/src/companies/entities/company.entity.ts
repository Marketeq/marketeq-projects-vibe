import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Index({ unique: true, where: '"domain" IS NOT NULL' })
  @Column({ length: 255, nullable: true })
  domain?: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl?: string;

  // The rest of what Settings > Company Info collects. All optional — company
  // name is the only required field. Text rather than enums because the size
  // and revenue buckets are a product decision that has changed before, and an
  // enum would need a migration every time the list is edited.
  @Column({ length: 255, nullable: true })
  industry?: string;

  @Column({ name: 'business_type', length: 255, nullable: true })
  businessType?: string;

  @Column({ name: 'company_size', length: 255, nullable: true })
  companySize?: string;

  @Column({ name: 'annual_revenue', length: 255, nullable: true })
  annualRevenue?: string;

  @Column({ length: 50, nullable: true })
  phone?: string;

  @Column({ name: 'time_zone', length: 100, nullable: true })
  timeZone?: string;

  @Index()
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
