import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PortfolioStatus = 'draft' | 'published';

@Entity('portfolio_items')
@Index(['ownerUserId', 'slug'], { unique: true })
export class PortfolioItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_user_id' })
  ownerUserId: string;

  @Column()
  slug: string;

  @Column({ default: '' })
  title: string;

  // @Column({ type: 'jsonb', nullable: true })
  // sections: any | null;
  @Column({ type: 'jsonb', nullable: false, default: () => "'[]'" })
  sections: any[];

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status: PortfolioStatus;

  @Column({ type: 'int', default: 0 })
  position: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name : 'updated_at'})
  updatedAt: Date;
}
