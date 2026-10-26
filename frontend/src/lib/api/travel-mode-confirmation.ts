// frontend/src/lib/api/travel-mode-confirmation.ts
//
// An already-active traveler's Update > Temporarily traveling (PMCM-651). The flow reports the
// choice (onTravelModeConfirmed); this runs the confirmation: the backend stores a new
// persistent "Travel Mode is on" occurrence (the period's dates are untouched), and only after
// it succeeded is the live "You are in Travel Mode / Update" card hidden for the rest of this
// login (the marker an activation uses, travel-activation-login.ts) and the new alert awaited.
//
// The confirmation id is chosen once per choice and kept until the request succeeds, so a retry
// after a failure carries the same id: if the first request did reach the server, the retry
// is stored once. On failure nothing is hidden, remembered or announced.
import { rememberTravelActivationInLogin } from "./travel-activation-login"
import type { DismissalStorage } from "./travel-expiry-popup"

export interface PendingConfirmation {
  current: string | null
}

export async function confirmActiveTravelMode(args: {
  confirm: (confirmationId: string) => Promise<unknown>
  pending: PendingConfirmation
  newId: () => string
  loginSessionKey: string | null | undefined
  // The period's end time from /me: tells this activation from another.
  occurrence: string | null
  storage: DismissalStorage | undefined
  // Success: update what the page shows and start awaiting the new alert.
  onConfirmed: (occurrence: string | null) => void
  // Failure: nothing was hidden or announced; let the user try again.
  onFailed: (error: unknown) => void
}): Promise<"confirmed" | "failed"> {
  const confirmationId = args.pending.current ?? args.newId()
  args.pending.current = confirmationId
  try {
    await args.confirm(confirmationId)
  } catch (error) {
    args.onFailed(error)
    return "failed"
  }
  args.pending.current = null
  if (args.occurrence) {
    rememberTravelActivationInLogin(
      args.loginSessionKey,
      args.occurrence,
      args.storage
    )
  }
  args.onConfirmed(args.occurrence)
  return "confirmed"
}
