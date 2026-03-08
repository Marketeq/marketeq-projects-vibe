import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type PortfolioStatus = 'draft' | 'published' | 'archived';

@Entity('portfolio_items')
export class PortfolioItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  ownerUserId: string;

  @Index({ unique: true })
  @Column('text')
  slug: string;

  @Column('text')
  title: string;

  @Column('jsonb', { nullable: true })
  schemaJson: Record<string, any> | null;

  @Column('text', { nullable: true })
  htmlPreview: string | null;

  @Column('text', { nullable: true })
  htmlPublished: string | null;

  @Column({ type: 'text', default: 'draft' })
  status: PortfolioStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
