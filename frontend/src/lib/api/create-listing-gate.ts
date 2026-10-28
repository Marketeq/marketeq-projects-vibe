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
 * Creates a draft behind the gate, with its collaborators passed in so the ordering can be
 * tested without a browser: `check` runs first and `post` (the draft creation) runs only after
 * it resolved, so a refused or unreadable check creates nothing. A refusal (from the check, or
 * from the POST itself on a race) goes to `refuse` and the original error is rethrown, never
 * swallowed. Exactly two check statuses are special: a 404 means an older backend without
 * GET /publish/create-gate, so the POST runs and its own answer decides (no modal); a 401 is
 * an authentication problem, not a verification one, so nothing is posted, no modal shows,
 * and the original error is rethrown for the existing sign-in handling. Every other failure
 * (403, 503, other 5xx, network) stays fail-closed.
 */
export async function createDraftBehindGate<T>(deps: {
  check: () => Promise<unknown>
  post: () => Promise<T>
  refuse: (error: unknown) => void
}): Promise<T> {
  try {
    await deps.check()
  } catch (error) {
    const status = (error as { response?: { status?: unknown } } | null)?.response?.status
    if (status === 401) throw error
    if (status !== 404) {
      deps.refuse(error)
      throw error
    }
    // 404: the check route does not exist on this backend; let the POST decide.
  }
  try {
    return await deps.post()
  } catch (error) {
    if (isGateRefusal(error)) deps.refuse(error)
    throw error
  }
}

// --- one gate for every listing-creation entry point ---------------------------------
//
// ProjectAPI.CreateProjectDraft runs the creation check before it POSTs. When the check (or
// the POST itself, on a race) is refused, the error is marked and announced here; a single
// modal host mounted in the root layout listens and shows the G2 modal. Callers keep their
// own catch, but a refusal is never silent and never leaves a draft behind.
export const CREATE_LISTING_BLOCKED_EVENT = "marketeq:create-listing-blocked"

const BLOCK_KEY = "createListingBlock"

/** The block a marked error carries, or null for any other error. */
export function createListingBlockOf(error: unknown): CreateListingBlock | null {
  if (!error || typeof error !== "object") return null
  const block = (error as Record<string, unknown>)[BLOCK_KEY]
  return block ? (block as CreateListingBlock) : null
}

/** True for an error the creation gate refused (so a page can leave its empty form). */
export function isCreateListingBlocked(error: unknown): boolean {
  return createListingBlockOf(error) !== null
}

/** Marks `error` with its block (no modal). Returns the block. */
export function markCreateListingBlocked(error: unknown): CreateListingBlock {
  const block = createListingBlockFrom(error)
  if (error && typeof error === "object") {
    try {
      ;(error as Record<string, unknown>)[BLOCK_KEY] = block
    } catch {
      // a frozen error object still gets the modal, it just is not marked
    }
  }
  return block
}

/** Marks `error` and tells the modal host to show it. Returns the block. */
export function announceCreateListingBlocked(
  error: unknown,
  target: Pick<EventTarget, "dispatchEvent"> | null = typeof window !== "undefined"
    ? window
    : null
): CreateListingBlock {
  const block = markCreateListingBlocked(error)
  target?.dispatchEvent(new CustomEvent(CREATE_LISTING_BLOCKED_EVENT, { detail: block }))
  return block
}

/** A POST refused by the gate itself (403 VERIFICATION_REQUIRED / 503 unavailable). */
export function isGateRefusal(error: unknown): boolean {
  const response = (error as { response?: { status?: unknown; data?: unknown } } | null)
    ?.response
  const code = (response?.data as { error?: unknown } | undefined)?.error
  return (
    (response?.status === 403 && code === "VERIFICATION_REQUIRED") ||
    (response?.status === 503 && code === "IDENTITY_VERIFICATION_UNAVAILABLE")
  )
}
