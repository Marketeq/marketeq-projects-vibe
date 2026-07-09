// apps/offer-service/src/common/constants/offer.constants.ts
// OS-08 + OS-11: Single source of truth for all field limits, thresholds, and business rule values.
// Every DTO decorator imports from here. Never hardcode these values elsewhere.

export const OFFER_CONSTANTS = {
  // ---- RATE ----
  MIN_RATE: 1,         // $1 minimum
  MAX_RATE: 9999,      // $9,999 maximum

  // ---- DURATION ----
  MIN_DURATION_MONTHS: 1,
  MAX_DURATION_MONTHS: 60, // 5 years

  // ---- WORK SCHEDULE ----
  MIN_HOURS_PER_WEEK: 1,
  MAX_HOURS_PER_WEEK: 80,

  // ---- TEXT FIELDS ----
  MAX_CONTRACT_TITLE_LENGTH: 200,
  MAX_MESSAGE_LENGTH: 500,
  MIN_DECLINE_REASON_LENGTH: 1,
  MAX_DECLINE_REASON_LENGTH: 500,

  // ---- START DATE ----
  MAX_START_DATE_YEARS_OUT: 5,

  // ---- CURRENCY ----
  CURRENCY_CODE_LENGTH: 3, // ISO 4217: 3 uppercase letters

  // ---- TTL & EXPIRY ----
  OFFER_TTL_DAYS: 14,
  OFFER_WARNING_HOURS: 48,
  OFFER_EXTENSION_THRESHOLD_DAYS: 30,

  // ---- RATE WARNING ----
  RATE_WARNING_MULTIPLIER: 1.25,

  // ---- IDEMPOTENCY ----
  IDEMPOTENCY_KEY_TTL_HOURS: 24,

  // ---- HISTORY PAGINATION ----
  HISTORY_PAGE_SIZE: 50,

  // ---- OUTBOX ----
  OUTBOX_MAX_RETRY_ATTEMPTS: 10,

  // ---- RABBITMQ / ABLY ----
  RABBITMQ_EXCHANGE: 'marketeq.offers',
  ABLY_CHANNEL_PREFIX: 'offer:',
} as const;

// Individual exports for convenient use in decorators
export const {
  MIN_RATE, MAX_RATE,
  MIN_DURATION_MONTHS, MAX_DURATION_MONTHS,
  MIN_HOURS_PER_WEEK, MAX_HOURS_PER_WEEK,
  MAX_CONTRACT_TITLE_LENGTH, MAX_MESSAGE_LENGTH,
  MIN_DECLINE_REASON_LENGTH, MAX_DECLINE_REASON_LENGTH,
  MAX_START_DATE_YEARS_OUT, CURRENCY_CODE_LENGTH,
  HISTORY_PAGE_SIZE,
} = OFFER_CONSTANTS;