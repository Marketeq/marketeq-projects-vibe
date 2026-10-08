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

  @Column({ name: 'default_screenshot_view', type: 'text', default: 'hour' })
  defaultScreenshotView: string;

  @Column({ name: 'show_tooltips', default: true })
  showTooltips: boolean;

  @Column({ name: 'capture_mode', type: 'text', default: 'active' })
  captureMode: string;

  @Column({ name: 'notify_manual_time', default: true })
  notifyManualTime: boolean;

  @Column({ name: 'notify_reassignment', default: true })
  notifyReassignment: boolean;

  @Column({ name: 'notify_weekly_report', default: true })
  notifyWeeklyReport: boolean;

  @Column({ name: 'notify_screenshot_comments', default: true })
  notifyScreenshotComments: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
