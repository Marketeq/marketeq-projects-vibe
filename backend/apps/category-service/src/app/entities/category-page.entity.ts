import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('category_pages')
export class CategoryPageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // UUID from categories_v2 table (canonical ID)
  @Column({ type: 'varchar', unique: true, nullable: true })
  categoryUuid: string | null;

  @Column({ unique: true })
  path: string;

  @Column()
  displayTitle: string;

  @Column({ type: 'int', default: 0 })
  level: number;

  @Column('jsonb', { nullable: true })
  heroBanner: { title: string; subtitle: string; imageUrl?: string } | null;

  @Column('text', { nullable: true })
  intro: string;

  @Column('jsonb', { default: '[]' })
  faq: { question: string; answer: string }[];

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
