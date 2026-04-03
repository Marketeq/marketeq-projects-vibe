import {
  Entity, Column, PrimaryGeneratedColumn,
  ManyToMany, CreateDateColumn, UpdateDateColumn
} from 'typeorm';
import { CategoryEntity } from './category.entity';

@Entity({ name: 'tags_v2' })
export class TagEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // Strapi tag may or may not send uuid; keep unique when present
  @Column({ type: 'varchar', unique: true, nullable: true })
  uuid: string | null;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @ManyToMany(() => CategoryEntity, (cat) => cat.tags)
  categories?: CategoryEntity[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
