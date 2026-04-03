import {
  Entity, Column, PrimaryGeneratedColumn,
  ManyToOne, OneToMany, ManyToMany, JoinTable, JoinColumn,
  CreateDateColumn, UpdateDateColumn
} from 'typeorm';
import { TagEntity } from './tag.entity';

@Entity({ name: 'categories_v2' })
export class CategoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  uuid: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'varchar', nullable: true })
  seo_meta_title?: string;

  @Column({ type: 'text', nullable: true })
  seo_meta_description?: string;

  @Column({ type: 'boolean', default: false })
  approved: boolean;

  @Column({ type: 'boolean', default: false })
  published_in_marketplace: boolean;

  // single, canonical FK column
  @Column({ type: 'int', name: 'parentId', nullable: true })
  parentId?: number | null;

  @ManyToOne(() => CategoryEntity, (cat) => cat.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: CategoryEntity | null;

  @OneToMany(() => CategoryEntity, (cat) => cat.parent)
  children?: CategoryEntity[];

  @ManyToMany(() => TagEntity, (tag) => tag.categories, { cascade: true })
  @JoinTable({
    name: 'category_tags_v2',
    joinColumn: { name: 'category_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags?: TagEntity[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
