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

  @Column({ name: 'user_id', type: 'text', unique: true })
  userId: string;

  @Column({ type: 'text', default: 'UTC' })
  timezone: string;

  @Column({ name: 'date_format', type: 'text', default: 'MM/DD/YYYY' })
  dateFormat: string;

  @Column({
    name: 'start_of_week',
    type: 'enum',
    enum: ['Sunday', 'Monday'],
    default: 'Sunday',
  })
  startOfWeek: 'Sunday' | 'Monday';

  @Column({
    name: 'time_format',
    type: 'enum',
    enum: ['12h', '24h'],
    default: '12h',
  })
  timeFormat: '12h' | '24h';

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
