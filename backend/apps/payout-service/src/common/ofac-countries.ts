// apps/payout-service/src/common/ofac-countries.ts
// PS-21 §6.1: OFAC country list — shared between deposit-method creation
// (bank-validation.service.ts) and payout-execution re-screening
// (bank-payout-executor.service.ts) so both enforce the exact same list
// instead of two independently-maintained copies drifting apart.
//
// v1 list per PS-21 §6.1. Must be reviewed and updated quarterly. Source:
// https://home.treasury.gov/policy-issues/financial-sanctions/sanctions-programs-and-country-information
//
// Note (per spec): Russia, Venezuela, Belarus blocks are program-specific —
// legal counsel must confirm full vs partial block for Marketeq's
// transaction types. UA-43 (Crimea) is a region, not an ISO 3166-1 alpha-2
// country code — kept verbatim from the spec even though bankCountry is
// always a real country code and will never match it as written.
export const OFAC_BLOCKED_COUNTRIES: readonly string[] = [
  'CU', // Cuba
  'IR', // Iran
  'KP', // North Korea
  'RU', // Russia (partial — specific programs)
  'SY', // Syria
  'UA-43', // Crimea region (Ukraine)
  'VE', // Venezuela (specific SDN programs)
  'BY', // Belarus
  'MM', // Myanmar
  'ZW', // Zimbabwe
  'SD', // Sudan
  'SO', // Somalia
  'YE', // Yemen
  'LY', // Libya
  'CD', // Democratic Republic of Congo
  'CF', // Central African Republic
];

const OFAC_BLOCKED_SET = new Set(OFAC_BLOCKED_COUNTRIES);

export function isOfacBlockedCountry(country: string | null | undefined): boolean {
  if (!country) return false;
  return OFAC_BLOCKED_SET.has(country.toUpperCase());
}
