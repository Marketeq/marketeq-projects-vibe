import {
  IdentityVerificationStatus,
  LocationVerificationStatus,
} from '../../entities/enums/identity-verification.enums';

export class InternalStatusResponseDto {
  identityVerificationStatus: IdentityVerificationStatus;
  locationVerificationStatus: LocationVerificationStatus;
}
