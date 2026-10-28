// frontend/src/lib/api/start-time-gate.ts
//
// G8, start logging time. The Log Time buttons launch the desktop tracker (or offer its
// installer), so the backend's G8 gate is asked first through its read-only check route.
// An unverified talent is refused with
//   403 { error: "VERIFICATION_REQUIRED", missingRequirements: "identity" | "location" | "both" }
// and a gate that could not be evaluated with 503 IDENTITY_VERIFICATION_UNAVAILABLE.
// Only a resolved check lets the start continue: every other outcome (a malformed refusal,
// a network error, a 5xx) is a closed gate here too, so an unanswered gate never launches
// anything. This file only reads the answer; it never decides the gate. Pure: no UI, no
// network, no storage.
import type { MissingVerification } from "./join-team-gate"

export type StartTimeBlock =
  | { kind: "verification"; missing: MissingVerification }
  | { kind: "unavailable" }

const COPY: Record<MissingVerification, string> = {
  both: "To start logging time, you must verify your identity and location",
  identity: "To start logging time, you must verify your identity",
  location: "To start logging time, you must verify your location",
}

export function startTimeTitleFor(missing: MissingVerification): string {
  return COPY[missing]
}

export function startTimeBlockFrom(error: unknown): StartTimeBlock {
  const response = (error as { response?: { status?: unknown; data?: unknown } } | null)
    ?.response
  const data = response?.data as
    | { error?: unknown; missingRequirements?: unknown }
    | undefined
  if (response?.status === 403 && data?.error === "VERIFICATION_REQUIRED") {
    const missing = data.missingRequirements
    if (missing === "identity" || missing === "location" || missing === "both") {
      return { kind: "verification", missing }
    }
  }
  return { kind: "unavailable" }
}
