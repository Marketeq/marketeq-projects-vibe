import {
  IdentityVerificationStatus,
  LocationVerificationStatus,
} from '../../entities/enums/identity-verification.enums';

// TRVG2 §6.1 ("Internal and support access"): read-only, metadata-only.
// Never document images, raw vendor payloads, document_ref, or the raw
// failure_code column — failureReason is a coarse, derived value only.
// isVerified/gateOpen/inGrace are the confirmed TRVG2 §2 predicates:
//   is_verified(account) := identity == VERIFIED AND location == VERIFIED
//   in_grace(account)    := expired_at is set AND <30 days elapsed
//   gate_open(account)   := is_verified(account) OR in_grace(account)
// Consumer-scoping (what a hiring client vs. a team owner may see) is the
// calling service's responsibility, not this endpoint's (Doc 04 §8b).
export class InternalStatusResponseDto {
  identityVerificationStatus!: IdentityVerificationStatus;
  locationVerificationStatus!: LocationVerificationStatus;
  isVerified!: boolean;
  gateOpen!: boolean;
  inGrace!: boolean;
  attemptCount!: number;
  failureReason!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
