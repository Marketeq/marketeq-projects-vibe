export enum IdentityVerificationEventType {
  TRAVEL_MODE_ACTIVATED = 'travel_mode_activated',
  TRAVEL_MODE_STILL_ACTIVE = 'travel_mode_still_active',
  LOCATION_VERIFICATION_SUBMITTED = 'location_verification_submitted',
  IDENTITY_VERIFIED = 'identity_verified',
  LOCATION_VERIFIED = 'location_verified',
  HOME_COUNTRY_UPDATED = 'home_country_updated',
}

export interface IdentityVerificationEvent {
  eventType: IdentityVerificationEventType;
  profileId: string;
  userId: string;
  occurredAt: string;
  data?: Record<string, unknown>;
}
