// frontend/src/lib/api/create-listing-gate.ts
//
// G2, starting a talent listing. Choosing Project or Service on /my-listings asks the
// backend's read-only creation check first (GET /publish/create-gate). A talent who is not
// fully identity-and-location verified (and not inside the grace period) is refused with
//   403 { error: "VERIFICATION_REQUIRED", missingRequirements: "identity" | "location" | "both" }
// and a gate that could not be evaluated with 503 IDENTITY_VERIFICATION_UNAVAILABLE. Only a
// resolved check lets the draft be created: every other outcome (a malformed refusal, a
// network error, a 5xx) is a closed gate here too. This file only reads the answer; it never
// decides the gate. Pure: no UI, no network, no storage.
import type { MissingVerification } from "./start-time-gate"

export type CreateListingBlock =
  | { kind: "verification"; missing: MissingVerification }
  | { kind: "unavailable" }

const COPY: Record<MissingVerification, string> = {
  both: "To publish this job, you must verify your identity and location",
  identity: "To publish this job, you must verify your identity",
  location: "To publish this job, you must verify your location",
}

export function createListingTitleFor(missing: MissingVerification): string {
  return COPY[missing]
}

export function createListingBlockFrom(error: unknown): CreateListingBlock {
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

/**
 * The whole decision, with its collaborators passed in so it can be exercised without a
 * browser: a non-talent proceeds untouched; a talent's check runs first, and `proceed` (the
 * draft creation) runs only after that check resolved. A check that rejects returns the block
 * to show and never calls `proceed`, so nothing is created or saved while blocked.
 */
export async function runCreateListingGate(deps: {
  isTalent: boolean
  check: () => Promise<unknown>
  proceed: () => unknown
}): Promise<{ block: CreateListingBlock | null; proceeded: boolean }> {
  if (!deps.isTalent) {
    await deps.proceed()
    return { block: null, proceeded: true }
  }
  try {
    await deps.check()
  } catch (error) {
    return { block: createListingBlockFrom(error), proceeded: false }
  }
  await deps.proceed()
  return { block: null, proceeded: true }
}
