import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index, Unique } from 'typeorm';
import { Favorite, FavoriteType } from './favorite.entity';

@Entity('favorite_groups')
@Unique(['userId', 'name'])
export class FavoriteGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Index()
  @Column('uuid')
  userId: string;

  /** The tab/type this group was created under (project, service, talent, etc.) */
  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  defaultType: string | null;

  @OneToMany(() => Favorite, (fav) => fav.group, { cascade: true })
  favorites: Favorite[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
