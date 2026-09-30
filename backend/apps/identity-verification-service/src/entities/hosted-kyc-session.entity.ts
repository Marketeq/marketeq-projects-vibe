import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { IdentityVerificationProfile } from './identity-verification-profile.entity';
import { HostedKycSessionStatus } from './enums/identity-verification.enums';

// One row per Didit-hosted Free KYC session. Deliberately stores NO hosted
// URL (it can carry a session token): the URL is obtained from Didit's own
// same-vendor_data reuse behavior each time it is needed. vendor_reference is
// the opaque value sent to Didit as vendor_data — a random UUID with no
// relation to the user id or any personal data.
@Entity({ name: 'hosted_kyc_sessions', schema: 'identity_verification' })
export class HostedKycSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_hosted_kyc_sessions_profile_id')
  @Column({ name: 'profile_id', type: 'uuid' })
  profileId!: string;

  @ManyToOne(() => IdentityVerificationProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profile_id' })
  profile!: IdentityVerificationProfile;

  @Index('idx_hosted_kyc_sessions_didit_session_id', { unique: true })
  @Column({ name: 'didit_session_id', type: 'varchar', length: 128 })
  diditSessionId!: string;

  @Index('idx_hosted_kyc_sessions_vendor_reference', { unique: true })
  @Column({ name: 'vendor_reference', type: 'uuid' })
  vendorReference!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: HostedKycSessionStatus,
    enumName: 'hosted_kyc_session_status_enum',
    default: HostedKycSessionStatus.CREATED,
  })
  status!: HostedKycSessionStatus;

  @Column({ name: 'last_event_timestamp', type: 'bigint', nullable: true })
  lastEventTimestamp!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
