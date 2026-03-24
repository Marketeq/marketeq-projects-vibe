import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index, Unique } from 'typeorm';
import { Favorite } from './favorite.entity';

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

  @OneToMany(() => Favorite, (fav) => fav.group, { cascade: true })
  favorites: Favorite[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
