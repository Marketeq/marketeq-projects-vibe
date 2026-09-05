import {
  IdentityVerificationStatus,
  LocationVerificationStatus,
  TravelClassification,
  DeclaredDuration,
} from '../../entities/enums/identity-verification.enums';
import { IdentityVerificationProfile } from '../../entities/identity-verification-profile.entity';

export class ProfileStatusResponseDto {
  verifiedHomeCountry: string | null;
  detectedCountry: string | null;
  detectedRegionState: string | null;
  detectedCity: string | null;
  timeZone: string | null;

  travelClassification: TravelClassification | null;
  declaredDuration: DeclaredDuration | null;
  travelModeActive: boolean;

  identityVerificationStatus: IdentityVerificationStatus;
  identityRejectionReason: string | null;
  locationVerificationStatus: LocationVerificationStatus;

  reconfirmationRequired: boolean;

  static fromEntity(profile: IdentityVerificationProfile): ProfileStatusResponseDto {
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
    dto.identityRejectionReason = profile.identityRejectionReason;
    dto.locationVerificationStatus = profile.locationVerificationStatus;
    dto.reconfirmationRequired = Boolean(
      profile.verifiedHomeCountry && profile.detectedCountry && profile.verifiedHomeCountry !== profile.detectedCountry,
    );
    return dto;
  }
}
