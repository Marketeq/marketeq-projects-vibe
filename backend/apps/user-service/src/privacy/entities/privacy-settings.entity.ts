import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Privacy preferences for a user account. Each user has one row.
 * Settings are stored as a JSONB blob keyed by role ("talent" | "client")
 * so a dual-role user keeps both sets of preferences.
 */
@Entity('privacy_settings')
export class PrivacySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId: string;

  /**
   * Talent-specific privacy preferences.
   * Shape: TalentPrivacyPrefs (see DTO for full definition).
   */
  @Column({ type: 'jsonb', nullable: true })
  talent: Record<string, any> | null;

  /**
   * Client-specific privacy preferences.
   * Shape: ClientPrivacyPrefs (see DTO for full definition).
   */
  @Column({ type: 'jsonb', nullable: true })
  client: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
