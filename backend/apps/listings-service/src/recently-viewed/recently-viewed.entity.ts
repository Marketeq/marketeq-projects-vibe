import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('recently_viewed')
@Index(['userId', 'projectId'], { unique: true })
export class RecentlyViewed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column('uuid')
  projectId: string;

  @CreateDateColumn()
  viewedAt: Date;
}
