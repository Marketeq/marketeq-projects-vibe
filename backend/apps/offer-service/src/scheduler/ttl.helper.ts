// apps/offer-service/src/scheduler/ttl.helper.ts
// OS-26: All TTL constants and calculation functions.
// Single source of truth for the 14-day TTL, 48h warning, 30-day extension.

/** Primary TTL: offers and counter offers expire 14 days after last activity. */
export const OFFER_TTL_DAYS = 14;

/** Warning threshold: send 48h warning before expiry. */
export const EXPIRY_WARNING_HOURS = 48;

/**
 * Extension threshold: if an offer expired <= 30 days ago, show
 * "Request Extension" button. If > 30 days ago, show "Ask Now" button.
 */
export const EXTENSION_THRESHOLD_DAYS = 30;

/**
 * calculateExpiresAt()
 *
 * Returns NOW() + OFFER_TTL_DAYS. Used in every service method that resets TTL:
 *   create, edit, CO submit, CO edit, resend
 */
export function calculateExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + OFFER_TTL_DAYS);
  return d;
}

/**
 * getWarningThreshold()
 *
 * Returns NOW() + EXPIRY_WARNING_HOURS. Used by WarningProcessor:
 *   WHERE expires_at <= getWarningThreshold() AND warning_sent_at IS NULL
 */
export function getWarningThreshold(): Date {
  const d = new Date();
  d.setHours(d.getHours() + EXPIRY_WARNING_HOURS);
  return d;
}

/**
 * isWithinExtensionWindow(expiredAt)
 *
 * Returns true if the offer expired within the last EXTENSION_THRESHOLD_DAYS.
 * Used in the offer response to decide "Request Extension" vs "Ask Now".
 */
export function isWithinExtensionWindow(expiredAt: Date): boolean {
  const daysSinceExpiry =
    (Date.now() - expiredAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceExpiry <= EXTENSION_THRESHOLD_DAYS;
}

/**
 * hoursUntilExpiry(expiresAt)
 *
 * Returns approximate hours until expiry. Used in OfferExpiringSoonPayload.
 */
export function hoursUntilExpiry(expiresAt: Date): number {
  const ms = expiresAt.getTime() - Date.now();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60)));
}