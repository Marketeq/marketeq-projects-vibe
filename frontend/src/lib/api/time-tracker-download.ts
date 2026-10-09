// G8: how the Time Tracker download reacts to the backend's identity gate.
// The backend answers 403 VERIFICATION_REQUIRED (account not verified, outside
// the grace period) or 503 IDENTITY_VERIFICATION_UNAVAILABLE (the check itself
// failed - an unanswered gate is a closed gate). Anything else is an ordinary
// download failure. The frontend never decides whether the gate is open.
export type DownloadBlock = "verification_required" | "verification_unavailable" | null

export function downloadBlockFor(err: unknown): DownloadBlock {
  const response = (err as { response?: { status?: unknown; data?: { error?: unknown } } } | null)?.response
  if (!response) return null
  const code = response.data?.error
  if (response.status === 403 && code === "VERIFICATION_REQUIRED") return "verification_required"
  if (response.status === 503 && code === "IDENTITY_VERIFICATION_UNAVAILABLE") return "verification_unavailable"
  return null
}
