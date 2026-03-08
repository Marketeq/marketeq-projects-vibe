import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index, JoinColumn } from 'typeorm';
import { FavoriteGroup } from './favorite-group.entity';

export enum FavoriteType {
  TALENT = 'talent',
  PROJECT = 'project',
  SERVICE = 'service',
  JOB = 'job',
  TEAM = 'team',
}

@Entity('favorites')
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Index()
  @Column('uuid')
  groupId: string;

  @ManyToOne(() => FavoriteGroup, (group) => group.favorites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: FavoriteGroup;

  @Column({ type: 'enum', enum: FavoriteType })
  type: FavoriteType;

  @Column({ length: 100 })
  itemId: string;

  @CreateDateColumn()
  createdAt: Date;
}
