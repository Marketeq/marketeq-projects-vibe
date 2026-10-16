// apps/payout-service/src/notifications/withdrawal-failure-reason.ts
// PMCM-806: the reason line in the "withdrawal failed" push and email.
//
// The ticket allows exactly five strings and nothing else. Provider codes
// (Stripe's failure_code, Wise's reasonCode) and this service's own ERR_*
// codes are classified into one of them here. The free-text `reason` that
// travels with payout.failed is never shown, because it can carry a raw
// provider message (the executors pass err.message straight through). Anything
// that does not classify gets the "no reason" line. It is never blank and never
// a guess.

export const WITHDRAWAL_FAILURE_REASONS = {
  BANK_REJECTED: 'Your bank rejected the transfer',
  METHOD_NEEDS_VERIFICATION: 'Your payout method needs to be verified again',
  DETAILS_INCORRECT: 'The account details on this method appear to be incorrect',
  PROVIDER_UNAVAILABLE: 'Our payment provider was temporarily unavailable',
  NO_REASON: 'We weren’t given a specific reason',
} as const;

export type WithdrawalFailureReason =
  (typeof WITHDRAWAL_FAILURE_REASONS)[keyof typeof WITHDRAWAL_FAILURE_REASONS];

const R = WITHDRAWAL_FAILURE_REASONS;

const BY_CODE: Record<string, WithdrawalFailureReason> = {
  // ── Stripe payout.failure_code ─────────────────────────────
  account_closed: R.BANK_REJECTED,
  account_frozen: R.BANK_REJECTED,
  bank_account_restricted: R.BANK_REJECTED,
  could_not_process: R.BANK_REJECTED,
  debit_not_authorized: R.BANK_REJECTED,
  declined: R.BANK_REJECTED,
  invalid_account_number: R.DETAILS_INCORRECT,
  invalid_account_number_length: R.DETAILS_INCORRECT,
  incorrect_account_holder_name: R.DETAILS_INCORRECT,
  incorrect_account_holder_address: R.DETAILS_INCORRECT,
  incorrect_account_holder_tax_id: R.DETAILS_INCORRECT,
  invalid_currency: R.DETAILS_INCORRECT,
  no_account: R.DETAILS_INCORRECT,
  bank_ownership_changed: R.METHOD_NEEDS_VERIFICATION,
  unsupported_card: R.METHOD_NEEDS_VERIFICATION,
  expired_card: R.METHOD_NEEDS_VERIFICATION,
  lost_or_stolen_card: R.METHOD_NEEDS_VERIFICATION,
  // The platform's own Stripe balance, not the contractor's.
  insufficient_funds: R.PROVIDER_UNAVAILABLE,

  // ── Wise Platform transfer reasonCode ──────────────────────
  funds_refunded: R.BANK_REJECTED,

  // ── payout-service executor error codes ────────────────────
  ERR_BANK_NOT_VERIFIED: R.METHOD_NEEDS_VERIFICATION,
  ERR_CONNECT_ACCOUNT_NOT_ATTACHED: R.METHOD_NEEDS_VERIFICATION,
  ERR_CONNECT_ACCOUNT_NOT_PAYOUT_READY: R.METHOD_NEEDS_VERIFICATION,
  ERR_OAUTH_REAUTH_REQUIRED: R.METHOD_NEEDS_VERIFICATION,
  ERR_PAYOUT_METHOD_REAUTH_REQUIRED: R.METHOD_NEEDS_VERIFICATION,
  ERR_PAYOUT_METHOD_TOKEN_REFRESH_FAILED: R.METHOD_NEEDS_VERIFICATION,
  ERR_CARD_NOT_FOUND: R.METHOD_NEEDS_VERIFICATION,
  ERR_CARD_NOT_ACTIVATED: R.METHOD_NEEDS_VERIFICATION,
  ERR_CARD_FROZEN: R.METHOD_NEEDS_VERIFICATION,
  ERR_CARD_CANCELED: R.METHOD_NEEDS_VERIFICATION,
  ERR_CRYPTO_TOKEN_NOT_SUPPORTED: R.METHOD_NEEDS_VERIFICATION,
  ERR_BRIDGE_UNAVAILABLE: R.PROVIDER_UNAVAILABLE,
  ERR_STRIPE_PLATFORM_INSUFFICIENT_BALANCE: R.PROVIDER_UNAVAILABLE,
  ERR_WISE_PLATFORM_FUND_FAILED: R.PROVIDER_UNAVAILABLE,
  ERR_WISE_PLATFORM_INSUFFICIENT_BALANCE: R.PROVIDER_UNAVAILABLE,
  // Deliberately absent, so they fall to NO_REASON:
  // - the generic catch-alls (ERR_BANK_PAYOUT_FAILED, ERR_CARD_PAYOUT_FAILED,
  //   ERR_WISE_PLATFORM_TRANSFER_FAILED) carry an arbitrary exception, and
  //   naming a cause for those would be a guess;
  // - ERR_PAYOUT_OFAC_BLOCKED and ERR_CARD_BALANCE_CAP_EXCEEDED are compliance
  //   and limit outcomes, which no allowed line describes truthfully.
};

/** Always returns one of the five allowed lines, never a raw code or blank. */
export function toWithdrawalFailureReason(
  failureCode: string | null | undefined,
): WithdrawalFailureReason {
  const code = failureCode?.trim();
  if (!code) return R.NO_REASON;
  return BY_CODE[code] ?? BY_CODE[code.toLowerCase()] ?? R.NO_REASON;
}
