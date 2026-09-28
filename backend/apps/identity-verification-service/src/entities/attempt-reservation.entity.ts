import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { IdentityVerificationProfile } from './identity-verification-profile.entity';

// A short-lived placeholder row that closes the count-then-act race on the
// account-wide 3-attempt ceiling (see account-wide-attempt-count.ts's
// reserveAttemptSlot). Inserted atomically (advisory lock + ceiling check +
// insert, one transaction) BEFORE either pipeline's first real vendor call,
// and deleted right after — on vendor success (superseded by the real
// persisted VerificationAttempt/PendingVerificationSession row or
// IdentityDocument.documentCheckedAt) or on vendor/storage failure (the
// outage must cost no attempt). If the deleting side never runs (a genuine
// process crash mid-flight, not just a thrown error), the row is simply
// ignored by getAccountWideAttemptCount once RESERVATION_TTL_MS has
// passed — no sweeper job needed, and no permanently "stuck" attempt.
@Entity({ name: 'attempt_reservations', schema: 'identity_verification' })
export class AttemptReservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_attempt_reservations_profile_id')
  @Column({ name: 'profile_id', type: 'uuid' })
  profileId!: string;

  @ManyToOne(() => IdentityVerificationProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profile_id' })
  profile!: IdentityVerificationProfile;

  @CreateDateColumn({ name: 'reserved_at', type: 'timestamptz' })
  reservedAt!: Date;
}
