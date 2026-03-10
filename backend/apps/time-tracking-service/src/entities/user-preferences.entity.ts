import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'user_preferences', schema: 'time_tracking' })
@Index(['userId'], { unique: true })
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  userId: string;

  @Column({ type: 'text', default: 'UTC' })
  timezone: string;

  @Column({ type: 'text', default: 'MM/DD/YYYY' })
  dateFormat: string;

  @Column({
    type: 'enum',
    enum: ['Sunday', 'Monday'],
    default: 'Sunday',
  })
  startOfWeek: 'Sunday' | 'Monday';

  @Column({
    type: 'enum',
    enum: ['12h', '24h'],
    default: '12h',
  })
  timeFormat: '12h' | '24h';

  @UpdateDateColumn()
  updatedAt: Date;
}
