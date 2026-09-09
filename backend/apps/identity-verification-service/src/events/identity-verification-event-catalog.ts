import { IdentityVerificationEventType } from './identity-verification-event.types';

export interface EventCatalogEntry {
  eventType: IdentityVerificationEventType;
  description: string;
  wired: boolean;
  emittedBy: string;
}

export const IDENTITY_VERIFICATION_EVENT_CATALOG: readonly EventCatalogEntry[] = [
  {
    eventType: IdentityVerificationEventType.TRAVEL_MODE_ACTIVATED,
    description: 'Travel Mode activated: a declared duration was recorded while the profile was classified Temporarily Traveling.',
    wired: true,
    emittedBy: 'IdentityVerificationService.recordTravelDuration (Doc 05 Step 11)',
  },
  {
    eventType: IdentityVerificationEventType.TRAVEL_MODE_STILL_ACTIVE,
    description: 'The daily reminder sweep found a profile due for a Travel Mode reminder, not on a skip day.',
    wired: true,
    emittedBy: 'TravelModeReminderJob (Doc 05 Step 10)',
  },
  {
    eventType: IdentityVerificationEventType.LOCATION_VERIFICATION_SUBMITTED,
    description: 'Reserved for a location-verification submission. No confirmed source defines what "submitted" means, so this is unwired.',
    wired: false,
    emittedBy: 'Not wired by any document yet.',
  },
  {
    eventType: IdentityVerificationEventType.IDENTITY_VERIFIED,
    description: 'The Didit webhook reported outcome "approved".',
    wired: true,
    emittedBy: 'IdentityVerificationService.handleDiditWebhook (Doc 05 Step 11)',
  },
  {
    eventType: IdentityVerificationEventType.LOCATION_VERIFIED,
    description: 'First-time home-country confirmation.',
    wired: true,
    emittedBy: 'IdentityVerificationService.confirmHomeCountry (Doc 05 Step 11)',
  },
  {
    eventType: IdentityVerificationEventType.HOME_COUNTRY_UPDATED,
    description: 'A later confirmation that changed a previously-confirmed home country.',
    wired: true,
    emittedBy: 'IdentityVerificationService.confirmHomeCountry (Doc 05 Step 11)',
  },
] as const;
