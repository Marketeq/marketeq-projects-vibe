// frontend/src/lib/api/retry-gate-presentation.ts
//
// When a Didit result that was just reconciled leaves the account at `retry_identity` (a
// declined attempt, attempts left), the existing AccountVerificationGate is shown once over the
// page the talent is on. The backend decides: this only answers "is this a newly reconciled
// decline that has not been presented yet", from the backend's own state and the return marker.
//
// The occurrence is keyed by account + the trip to Didit (the awaiting-result marker's own
// timestamp: a NEW Didit attempt has a new one) + the attempt count the backend reports. It is
// presented once and the marker is cleared at that moment, so focus, visibility, route changes,
// alert refreshes, reloads and repeated /me reads cannot show it again; the next real decline
// comes from a new trip and a new marker.
import {
  AWAITING_RESULT_KEY,
  type KeyValueStorage,
} from "./identity-verification-status"
import type { IdentityVerificationSummaryView } from "./identity-verification-state"

export const RETRY_GATE_SHOWN_KEY =
  "marketeq:identity-verification:retry-gate-shown"

export function readAwaitingFlag(
  storage: KeyValueStorage | undefined
): string | null {
  try {
    return storage?.getItem(AWAITING_RESULT_KEY) || null
  } catch {
    return null
  }
}

export function declineOccurrenceKey(input: {
  userId: string
  flag: string
  attemptsUsed: number | null
}): string {
  return `${input.userId}:${input.flag}:${input.attemptsUsed ?? "?"}`
}

export function shouldPresentRetryGate(input: {
  summary: IdentityVerificationSummaryView | null
  userId: string | null | undefined
  flag: string | null
  storage: KeyValueStorage | undefined
}): { present: boolean; key: string | null } {
  const { summary, userId, flag, storage } = input
  if (!summary || !userId || !flag) return { present: false, key: null }
  // Only the backend's own retry state: never the SDK's reported status.
  if (summary.flowState !== "retry-identity") return { present: false, key: null }
  const key = declineOccurrenceKey({
    userId,
    flag,
    attemptsUsed: summary.attemptsUsed,
  })
  let last: string | null = null
  try {
    last = storage?.getItem(RETRY_GATE_SHOWN_KEY) ?? null
  } catch {
    last = null
  }
  return last === key ? { present: false, key } : { present: true, key }
}

export function markRetryGatePresented(
  storage: KeyValueStorage | undefined,
  key: string
): void {
  try {
    storage?.setItem(RETRY_GATE_SHOWN_KEY, key)
  } catch {
    // storage unavailable: the cleared awaiting marker still prevents a repeat
  }
}
