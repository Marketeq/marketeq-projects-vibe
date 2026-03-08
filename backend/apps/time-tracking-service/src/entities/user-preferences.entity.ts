import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_preferences')
@Index(['userId'], { unique: true })
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ default: 'UTC' })
  timezone: string;

  @Column({ default: 'MM/DD/YYYY' })
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
