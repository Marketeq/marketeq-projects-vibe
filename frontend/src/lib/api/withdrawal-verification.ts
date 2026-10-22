// G9: how the withdrawal screens react to the payout service's identity gate.
// POST /payouts/initiate and GET /payouts/verify-email answer 403
// VERIFICATION_REQUIRED (account not verified, outside the grace period) or 503
// IDENTITY_VERIFICATION_UNAVAILABLE (the check itself failed - an unanswered gate
// is a closed gate). Either opens the existing Verify My Account popup; anything
// else is an ordinary failure handled as before. The frontend never decides
// whether the gate is open.
export type WithdrawalVerificationBlock = "verification_required" | "verification_unavailable" | null

export function withdrawalBlockFor(status: number, data: unknown): WithdrawalVerificationBlock {
  const code = (data as { errorCode?: unknown } | null)?.errorCode
  if (status === 403 && code === "VERIFICATION_REQUIRED") return "verification_required"
  if (status === 503 && code === "IDENTITY_VERIFICATION_UNAVAILABLE") return "verification_unavailable"
  return null
}
