import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
  DeclaredDuration,
} from './enums/identity-verification.enums';
import { IdentityDocument } from './identity-document.entity';
import { VerificationAttempt } from './verification-attempt.entity';

@Entity({ name: 'identity_verification_profiles', schema: 'identity_verification' })
export class IdentityVerificationProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_ivp_user_id', { unique: true })
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @Column({ name: 'verified_home_country', type: 'char', length: 2, nullable: true })
  verifiedHomeCountry!: string | null;

  @Column({ name: 'verified_home_country_confirmed_at', type: 'timestamptz', nullable: true })
  verifiedHomeCountryConfirmedAt!: Date | null;

  @Column({ name: 'detected_country', type: 'char', length: 2, nullable: true })
  detectedCountry!: string | null;

  @Column({ name: 'detected_region_state', type: 'varchar', length: 120, nullable: true })
  detectedRegionState!: string | null;

  @Column({ name: 'detected_city', type: 'varchar', length: 120, nullable: true })
  detectedCity!: string | null;

  @Column({ name: 'time_zone', type: 'varchar', length: 64, nullable: true })
  timeZone!: string | null;

  @Column({
    name: 'travel_classification',
    type: 'enum',
    enum: TravelClassification,
    enumName: 'travel_classification_enum',
    nullable: true,
  })
  travelClassification!: TravelClassification | null;

  @Column({
    name: 'declared_duration',
    type: 'enum',
    enum: DeclaredDuration,
    enumName: 'declared_duration_enum',
    nullable: true,
  })
  declaredDuration!: DeclaredDuration | null;

  @Column({ name: 'travel_mode_active', type: 'boolean', default: false })
  travelModeActive!: boolean;

  @Column({ name: 'travel_mode_activated_at', type: 'timestamptz', nullable: true })
  travelModeActivatedAt!: Date | null;

  @Column({ name: 'last_travel_reminder_sent_at', type: 'timestamptz', nullable: true })
  lastTravelReminderSentAt!: Date | null;

  @Column({ name: 'next_travel_reminder_at', type: 'timestamptz', nullable: true })
  nextTravelReminderAt!: Date | null;

  @Index('idx_ivp_identity_status')
  @Column({
    name: 'identity_verification_status',
    type: 'enum',
    enum: IdentityVerificationStatus,
    enumName: 'identity_verification_status_enum',
    default: IdentityVerificationStatus.NOT_VERIFIED,
  })
  identityVerificationStatus!: IdentityVerificationStatus;

  @Column({ name: 'identity_rejection_reason', type: 'varchar', length: 64, nullable: true })
  identityRejectionReason!: string | null;

  @Index('idx_ivp_location_status')
  @Column({
    name: 'location_verification_status',
    type: 'enum',
    enum: LocationVerificationStatus,
    enumName: 'location_verification_status_enum',
    default: LocationVerificationStatus.NOT_VERIFIED,
  })
  locationVerificationStatus!: LocationVerificationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => IdentityDocument, (document) => document.profile)
  documents!: IdentityDocument[];

  @OneToMany(() => VerificationAttempt, (attempt) => attempt.profile)
  attempts!: VerificationAttempt[];
}
