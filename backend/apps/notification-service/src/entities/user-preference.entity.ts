import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface InAppChannelPrefs {
  enabled: boolean;
  bell: boolean;
  popup: boolean;
  browser: boolean;
}

export interface EmailChannelPrefs {
  enabled: boolean;
  address: string | null;
}

export interface SmsChannelPrefs {
  enabled: boolean;
  phone: string | null;
}

export interface GlobalChannelPrefs {
  inApp: InAppChannelPrefs;
  email: EmailChannelPrefs;
  sms: SmsChannelPrefs;
}

export interface ScopedChannelState {
  inApp: boolean;
  email: boolean;
  sms: boolean;
}

export interface CategoryPref {
  enabled: boolean;
  channels: ScopedChannelState;
}

export interface NotificationItemPref {
  enabled: boolean;
  channels: ScopedChannelState;
}

@Entity('notification_preferences')
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ default: true })
  inAppEnabled: boolean;

  @Column({ default: true })
  emailEnabled: boolean;

  @Column({ default: false })
  smsEnabled: boolean;

  @Column('simple-array', { nullable: true })
  disabledCategories: string[];

  @Column({ type: 'jsonb', nullable: true })
  channels: GlobalChannelPrefs | null;

  @Column({ type: 'jsonb', nullable: true })
  categories: Record<string, CategoryPref> | null;

  @Column({ type: 'jsonb', nullable: true })
  notifications: Record<string, NotificationItemPref> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
