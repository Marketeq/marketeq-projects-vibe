// Fixed details.reason values for HOME_COUNTRY_CONFIRMATION_REQUIRED (HTTP 409).
// The error CODE is stable and unchanged; these reasons are a closed set so a
// client can switch on them without parsing messages. They never carry a value.
//
//   location_not_verified   location verification is not in the verified state
//   confirmation_missing    no home country / confirmation time on record (or no profile yet)
//   travel_mode_active      travel mode is active or the profile is classified temporarily traveling
//   confirmation_stale      the confirmation is older than the 15-minute window (new sessions only)
export const HOME_COUNTRY_CONFIRMATION_REASONS = [
  'location_not_verified',
  'confirmation_missing',
  'travel_mode_active',
  'confirmation_stale',
] as const;
export type HomeCountryConfirmationReason = (typeof HOME_COUNTRY_CONFIRMATION_REASONS)[number];
