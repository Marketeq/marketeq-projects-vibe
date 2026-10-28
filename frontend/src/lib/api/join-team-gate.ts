// frontend/src/lib/api/join-team-gate.ts
//
// G7 (accept an invitation, gated at acceptance). The invitations service runs the
// verification gate BEFORE it writes anything, and answers a blocked acceptance with
//   403 { error: "VERIFICATION_REQUIRED", missingRequirements: "identity" | "location" | "both" }
// or, when the gate could not be evaluated (a closed gate, never an open one),
//   503 { error: "IDENTITY_VERIFICATION_UNAVAILABLE" }.
// This file only reads those answers; it never decides the gate itself. Pure: no UI,
// no network, no storage.
export type MissingVerification = "identity" | "location" | "both"

export type JoinTeamBlock =
  | { kind: "verification"; missing: MissingVerification }
  | { kind: "unavailable" }

const COPY: Record<MissingVerification, string> = {
  both: "To join this team, you must verify your identity and location",
  identity: "To join this team, you must verify your identity",
  location: "To join this team, you must verify your location",
}

export function joinTeamTitleFor(missing: MissingVerification): string {
  return COPY[missing]
}

/**
 * Maps a rejected accept call to the gate outcome it carries, or null for any other
 * failure (an expired invite, a different account, ...), which keeps its existing toast.
 * A VERIFICATION_REQUIRED answer without a usable requirement fails closed to the
 * unavailable state rather than guessing which copy applies.
 */
export function joinTeamBlockFrom(error: unknown): JoinTeamBlock | null {
  const response = (error as { response?: { status?: unknown; data?: unknown } })
    ?.response
  const data = response?.data as
    | { error?: unknown; missingRequirements?: unknown }
    | undefined
  if (data?.error === "IDENTITY_VERIFICATION_UNAVAILABLE") {
    return { kind: "unavailable" }
  }
  if (data?.error !== "VERIFICATION_REQUIRED") return null
  const missing = data.missingRequirements
  if (missing === "identity" || missing === "location" || missing === "both") {
    return { kind: "verification", missing }
  }
  return { kind: "unavailable" }
}
