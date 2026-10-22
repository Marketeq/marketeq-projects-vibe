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

  // --- Home-country change (a fully verified account re-verifying its residence) ---
  // The claimed new home country stays PENDING here; verifiedHomeCountry is only
  // replaced when Didit approves the session linked below. Detected server-side
  // from the request IP and explicitly confirmed by the user, never typed.
  @Column({ name: 'pending_home_country', type: 'char', length: 2, nullable: true })
  pendingHomeCountry!: string | null;

  // When the user confirmed the pending country: the 15-minute freshness basis
  // for starting a home-country-change session.
  @Column({ name: 'pending_home_country_confirmed_at', type: 'timestamptz', nullable: true })
  pendingHomeCountryConfirmedAt!: Date | null;

  // hosted_kyc_sessions.id of the CURRENT home-country-change session. Only that
  // session can promote the pending country (or change the account's status);
  // an older one never can. Attempts, failure states and the 24-hour cooldown
  // reuse the ordinary identity fields (failed_final_at etc.).
  @Column({ name: 'pending_relocation_session_id', type: 'uuid', nullable: true })
  pendingRelocationSessionId!: string | null;

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

  // The time up to which Travel Mode check-ins are RESOLVED (the column name predates this).
  // Written only by a saved duration answer (which clears it) or by starting the
  // home-country update flow; showing, closing or refreshing a check-in never moves it.
  @Column({
    name: 'last_travel_reminder_sent_at',
    type: 'timestamptz',
    nullable: true,
  })
  lastTravelReminderSentAt!: Date | null;

  @Column({ name: 'next_travel_reminder_at', type: 'timestamptz', nullable: true })
  nextTravelReminderAt!: Date | null;

  // Duration answers saved by check-ins in the current Travel Mode cycle. 0 = the first
  // check-in has not been answered (skipping or closing it is not an answer); a fresh
  // activation and any end of Travel Mode reset it to 0.
  @Column({ name: 'travel_check_in_count', type: 'smallint', default: 0 })
  travelCheckInCount!: number;

  @Index('idx_ivp_identity_status')
  @Column({
    name: 'identity_verification_status',
    type: 'enum',
    enum: IdentityVerificationStatus,
    enumName: 'identity_verification_status_enum',
    default: IdentityVerificationStatus.UNSTARTED,
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

  // --- Document Expiry and Re-Verification (TRVG2 §1.1, §3) ---
  // Population and the scheduled evaluation that transitions VERIFIED ->
  // EXPIRED live in StatusAutoClearJob.
  @Column({ name: 'document_expires_on', type: 'date', nullable: true })
  documentExpiresOn!: string | null;

  @Column({ name: 'last_evaluated_at', type: 'timestamptz', nullable: true })
  lastEvaluatedAt!: Date | null;

  // --- Grace Window & Age-Block Clearing (TRVG2 §1.1, §2, §3) ---
  // expiredAt drives the 30-day grace window (in_grace); set when the
  // profile transitions into EXPIRED. eligibleOn clears BLOCKED_AGE
  // automatically once reached (the holder's 18th birthday, derived from
  // the document at read time and discarded — no date of birth is held).
  @Column({ name: 'expired_at', type: 'timestamptz', nullable: true })
  expiredAt!: Date | null;

  @Column({ name: 'eligible_on', type: 'date', nullable: true })
  eligibleOn!: string | null;

  // Not part of Doc 03's confirmed schema. TRVG2 §3 confirms FAILED_FINAL
  // auto-clears after a 24h cooldown but names no column to time it from;
  // `updated_at` is unsuitable since unrelated writes also bump it. This
  // is this pass's own narrow engineering addition, flagged here the same
  // way Doc 05 flagged its own pending_verification_sessions addition.
  @Column({ name: 'failed_final_at', type: 'timestamptz', nullable: true })
  failedFinalAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => IdentityDocument, (document) => document.profile)
  documents!: IdentityDocument[];

  @OneToMany(() => VerificationAttempt, (attempt) => attempt.profile)
  attempts!: VerificationAttempt[];
}
