import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('favorites')
@Unique(['userId', 'itemId', 'itemType'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() userId: string;
  @Column() itemId: string;
  @Column() itemType: string; // 'project' | 'service' | 'talent' | 'team'
  @CreateDateColumn() createdAt: Date;
}
