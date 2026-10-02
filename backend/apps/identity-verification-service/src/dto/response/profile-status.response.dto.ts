import {
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
  DeclaredDuration,
} from '../../entities/enums/identity-verification.enums';
import { IdentityVerificationProfile } from '../../entities/identity-verification-profile.entity';
import { coarseFailureReason } from '../../common/status/coarse-failure-reason';
import { NextAction, VerificationSummary } from '../../common/status/verification-summary';

export class ProfileStatusResponseDto {
  verifiedHomeCountry!: string | null;
  detectedCountry!: string | null;
  detectedRegionState!: string | null;
  detectedCity!: string | null;
  timeZone!: string | null;

  travelClassification!: TravelClassification | null;
  declaredDuration!: DeclaredDuration | null;
  travelModeActive!: boolean;

  identityVerificationStatus!: IdentityVerificationStatus;
  identityRejectionReason!: string | null;
  locationVerificationStatus!: LocationVerificationStatus;

  reconfirmationRequired!: boolean;

  // Backward-compatible summary additions. fullyVerified is derived from the two
  // statuses alone, so it is on every response that carries this DTO. The rest
  // need hosted-session data and are present only where a summary is supplied
  // (GET /me); responses that do not supply one simply omit them. See
  // common/status/verification-summary.ts for the nextAction contract.
  fullyVerified!: boolean;
  nextAction?: NextAction;
  attemptsUsed?: number;
  attemptsRemaining?: number;
  maxAttempts?: number;
  canRetry?: boolean;
  retryAvailableAt?: string | null;
  hasActiveSession?: boolean;

  static fromEntity(profile: IdentityVerificationProfile, summary?: VerificationSummary): ProfileStatusResponseDto {
    const dto = new ProfileStatusResponseDto();
    dto.verifiedHomeCountry = profile.verifiedHomeCountry;
    dto.detectedCountry = profile.detectedCountry;
    dto.detectedRegionState = profile.detectedRegionState;
    dto.detectedCity = profile.detectedCity;
    dto.timeZone = profile.timeZone;
    dto.travelClassification = profile.travelClassification;
    dto.declaredDuration = profile.declaredDuration;
    dto.travelModeActive = profile.travelModeActive;
    dto.identityVerificationStatus = profile.identityVerificationStatus;
    dto.identityRejectionReason =
      profile.identityRejectionReason ?? coarseFailureReason(profile.identityVerificationStatus);
    dto.locationVerificationStatus = profile.locationVerificationStatus;
    dto.reconfirmationRequired = Boolean(
      profile.verifiedHomeCountry && profile.detectedCountry && profile.verifiedHomeCountry !== profile.detectedCountry,
    );
    // Both conditions are required: identity verified AND location verified.
    dto.fullyVerified =
      profile.identityVerificationStatus === IdentityVerificationStatus.VERIFIED &&
      profile.locationVerificationStatus === LocationVerificationStatus.VERIFIED;
    if (summary) {
      dto.nextAction = summary.nextAction;
      dto.attemptsUsed = summary.attemptsUsed;
      dto.attemptsRemaining = summary.attemptsRemaining;
      dto.maxAttempts = summary.maxAttempts;
      dto.canRetry = summary.canRetry;
      dto.retryAvailableAt = summary.retryAvailableAt;
      dto.hasActiveSession = summary.hasActiveSession;
    }
    return dto;
  }
}
