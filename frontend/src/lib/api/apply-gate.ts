import type { IdentityVerificationSummaryView } from "./identity-verification-state"

// G3: the job Apply button is gated by the backend's gate_open answer
// (verified OR inside the 30-day grace window), read from GET /me. fullyVerified
// is deliberately not used: it is false for a talent in grace, who must still be
// able to apply. Anything but an explicit answer fails closed.
export type ApplyGateDecision = "open" | "closed" | "unavailable"

export function applyGateFor(
  summary: IdentityVerificationSummaryView | null
): ApplyGateDecision {
  // The status could not be read (or was not an object): unavailable, never open.
  if (!summary) return "unavailable"
  if (summary.gateOpen === true) return "open"
  if (summary.gateOpen === false) return "closed"
  // The backend sent no usable gate_open: unavailable, never open.
  return "unavailable"
}
