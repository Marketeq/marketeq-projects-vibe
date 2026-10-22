// frontend/src/lib/api/travel-check-in.ts
//
// The periodic "Still traveling?" check-in (PMCM-641). The backend decides everything:
// GET /me says whether a check-in is due now (travelReminderDue), which occurrence it is
// (travelReminderAvailableAt) and how many duration answers were saved in this Travel Mode
// cycle (travelCheckInCount, absent = 0). A check-in stays due until a saved duration answer
// or a started home-country flow resolves it, so showing, closing, skipping or refreshing it
// changes nothing on the server. This file only
//   1. picks the copy (first time vs asked before),
//   2. decides when the modal opens, and keeps a closed one from reopening in a render loop,
//   3. says when to look at /me again (one timer, no polling) and how to answer, and
//   4. keeps the check-in ahead of the traveler location prompt and the small Travel Mode alert.
// No UI lives here and no reminder rule (days, durations, expiry) is re-derived.
import type { IdentityVerificationSummaryView } from "./identity-verification-state"
import {
  type DeclaredDurationValue,
  TRAVEL_DURATION_TO_BACKEND,
} from "./travel-mode-backend"
import {
  MAX_EARLY_RETRIES,
  MAX_TIMER_MS,
  MIN_RETRY_DELAY_MS,
} from "./travel-reminder"

// --- copy -----------------------------------------------------------------

export const CHECK_IN_COPY = {
  // The large "Still traveling?" modal (Figma node 13101-46785).
  prompt: {
    title: "Still traveling?",
    body: "You’re logging in from a location outside your usual one. Just checking if you’re still away.",
    stillTraveling: "I’m still traveling",
    updateHomeCountry: "Update my home country",
  },
  // The duration question the first time it is asked: the existing Storybook copy.
  firstDuration: {
    title: "How long are you traveling?",
    body: "You’re marked as temporarily traveling. Some features may be limited until you’re back in your home country.",
    alert: "We’ll remind you later to check if your status has changed.",
  },
  // The second and later time (Figma node 13101-46818).
  laterDuration: {
    title: "How much longer will you be traveling?",
    body: "We’ve asked before, answering helps reduce these reminders.",
    alert: "You won’t be asked again for a while based on your selection.",
  },
  skip: "Skip",
  // Shown right after a duration answer was saved: the existing Storybook TravelMode copy.
  confirmation: {
    title: "Travel Mode is now active!",
    body: "You’re marked as temporarily traveling. You can now use the platform without restrictions.",
    alert:
      "You’ll remain in Travel Mode until you return to your home country or update your location.",
    done: "Done",
  },
} as const

/** The four duration answers, in display order. "Not sure" is an answer like the others. */
export const CHECK_IN_DURATION_LABELS = [
  "A few days",
  "1–2 weeks",
  "More than 2 weeks",
  "Not sure",
] as const
export type CheckInDurationLabel = (typeof CHECK_IN_DURATION_LABELS)[number]

/** Saved answers in this cycle; the backend omits the key while it is 0. */
export function checkInAnswerCount(
  summary: Pick<IdentityVerificationSummaryView, "travelCheckInCount"> | null
): number {
  const n = summary?.travelCheckInCount
  return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : 0
}

/** First-time copy for 0 answers, the "asked before" copy from the first saved answer on. */
export function durationCopyFor(answerCount: number) {
  return answerCount >= 1
    ? CHECK_IN_COPY.laterDuration
    : CHECK_IN_COPY.firstDuration
}

// --- which occurrence is due ----------------------------------------------

type DueFields = Pick<
  IdentityVerificationSummaryView,
  "travelReminderDue" | "travelReminderAvailableAt" | "travelModeExpired"
>

/**
 * The due occurrence (travelReminderAvailableAt exactly as /me sent it), or null. Due means
 * the backend said so, with a usable time, for a Travel Mode that has not ended. Anything
 * unknown or malformed is "not due".
 */
export function dueCheckInOccurrence(summary: DueFields | null): string | null {
  if (!summary) return null
  if (summary.travelReminderDue !== true) return null
  if (summary.travelModeExpired === true) return null
  const at = summary.travelReminderAvailableAt
  return typeof at === "string" && Number.isFinite(Date.parse(at)) ? at : null
}

// --- closing is not answering ---------------------------------------------

/**
 * "Closed in this page" memory, scoped to ONE account and ONE login: a dismissal made under
 * another scope never hides this one. It exists only to stop a closed modal reopening on the
 * very next render; every real re-check (load, a visible tab, the timer) calls clear(), and
 * the occurrence, still due on the server, opens again. Memory only, nothing is persisted.
 *
 * It also remembers occurrences this page has just ANSWERED. That mark is not cleared by a
 * re-check: a summary that was read before the answer was saved (a slow visibility or timer
 * read, a retry) can still arrive afterwards and call the same occurrence due, and it must
 * not reopen the modal. An answered occurrence can never legitimately be due again (the answer
 * restarts the schedule at new times), so keeping the mark is safe. reset() forgets everything
 * (another account took over the page).
 */
export interface CheckInDismissals {
  dismiss(scope: string, occurrence: string): void
  isDismissed(scope: string, occurrence: string): boolean
  markAnswered(scope: string, occurrence: string): void
  isAnswered(scope: string, occurrence: string): boolean
  clear(): void
  reset(): void
}

export function createCheckInDismissals(): CheckInDismissals {
  const dismissed = new Set<string>()
  const answered = new Set<string>()
  const key = (scope: string, occurrence: string) =>
    JSON.stringify([scope, occurrence])
  return {
    dismiss: (scope, occurrence) => void dismissed.add(key(scope, occurrence)),
    isDismissed: (scope, occurrence) => dismissed.has(key(scope, occurrence)),
    markAnswered: (scope, occurrence) =>
      void answered.add(key(scope, occurrence)),
    isAnswered: (scope, occurrence) => answered.has(key(scope, occurrence)),
    clear: () => dismissed.clear(),
    reset: () => {
      dismissed.clear()
      answered.clear()
    },
  }
}

/** One account on one login: the account id and the opaque per-login key from /me. */
export function checkInScope(
  userId: string | null | undefined,
  loginSessionKey: string | null
): string {
  return JSON.stringify([userId ?? "", loginSessionKey ?? ""])
}

/**
 * The occurrence the modal should be showing right now, or null for none. A due occurrence
 * that was closed in this page is not offered again until a re-check clears the dismissals,
 * and one this page just answered is not offered again at all, even if a summary read before
 * the answer was saved arrives later; `busy` (another verification dialog owns the screen)
 * holds it back without dismissing it.
 */
export function checkInToShow(input: {
  summary: DueFields | null
  scope: string
  dismissals: CheckInDismissals
  busy?: boolean
}): string | null {
  const occurrence = dueCheckInOccurrence(input.summary)
  if (!occurrence || input.busy) return null
  if (input.dismissals.isAnswered(input.scope, occurrence)) return null
  return input.dismissals.isDismissed(input.scope, occurrence)
    ? null
    : occurrence
}

/**
 * The one decision the page's effect makes on every summary update: which occurrence the modal
 * should show now. An open modal stays open while /me still names its occurrence as the due one;
 * once it does not (answered here or in another tab, Travel Mode ended, replaced) it closes, and
 * only an occurrence that is due, not closed in this page and not already answered here is
 * opened in its place.
 */
export function reconcileCheckIn(
  open: string | null,
  input: Parameters<typeof checkInToShow>[0]
): string | null {
  if (open !== null && !isCheckInStale(open, input.summary)) return open
  return checkInToShow(input)
}

/**
 * What the page records the moment an answer attempt has an outcome, BEFORE it re-reads /me,
 * so no render in between (and no stale summary arriving later) can reopen the modal:
 *  - saved: the occurrence is answered for good in this page;
 *  - stale / in_progress: the server did not take this answer, and /me may still call the same
 *    occurrence due; it is only kept from reopening right away, and returns on the next real
 *    re-check (it stays due on the server);
 *  - failed: nothing is recorded, the screen stays open to try again.
 */
export function recordCheckInAnswerOutcome(input: {
  outcome: CheckInAnswerOutcome
  scope: string
  occurrence: string
  dismissals: CheckInDismissals
}): void {
  if (input.outcome === "saved") {
    input.dismissals.markAnswered(input.scope, input.occurrence)
  } else if (input.outcome === "stale" || input.outcome === "in_progress") {
    input.dismissals.dismiss(input.scope, input.occurrence)
  }
}

/**
 * Whether a modal that is open for `open` is stale against a fresh /me read: the occurrence
 * is no longer the due one (answered or resolved elsewhere, Travel Mode ended, or replaced).
 */
export function isCheckInStale(
  open: string,
  summary: DueFields | null
): boolean {
  return dueCheckInOccurrence(summary) !== open
}

/**
 * The "Travel Mode is now active!" confirmation opens only when the server saved the answer
 * (POST /travel-duration/update returned 200): never for Skip, a close, a failed request, a
 * 409 (stale / in progress) or "Update my home country". It is an immediate success message
 * held in page memory only, so a refresh never shows it again.
 */
export function shouldShowCheckInConfirmation(
  outcome: CheckInAnswerOutcome
): boolean {
  return outcome === "saved"
}

// --- priority ---------------------------------------------------------------

/**
 * The check-in wins while it is due or open, and only then: the traveler location prompt is
 * not opened, and the small Travel Mode alert is not shown. A closed (dismissed) check-in is
 * still due, so it keeps holding them back until it is answered; once it is resolved this
 * is false and a pending mismatch prompt is evaluated again.
 */
export function checkInHasPriority(
  summary: DueFields | null,
  open: boolean
): boolean {
  return open || dueCheckInOccurrence(summary) !== null
}

// --- when to look at /me again ---------------------------------------------

/** A tab that becomes visible re-checks, but not while a read is already in flight. */
export function shouldRecheckOnVisibility(input: {
  visibilityState: string
  inFlight: boolean
  lastCheckAt: number | null
  now: number
  minGapMs?: number
}): boolean {
  if (input.visibilityState !== "visible" || input.inFlight) return false
  const gap = input.minGapMs ?? 2_000
  return input.lastCheckAt === null || input.now - input.lastCheckAt >= gap
}

export interface CheckInTimerDeps {
  /** Called when the next occurrence is expected to be due: re-read /me. */
  onFire: () => void
  now?: () => number
  setTimer?: (callback: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
  retries?: Map<string, number>
}

/**
 * ONE timer for the next occurrence (never a poll). A due occurrence needs none (the modal
 * handles it). A future one is waited for in steps no longer than setTimeout allows; when the
 * browser clock thinks it has passed but /me still says "not yet" (skew), it waits at least
 * MIN_RETRY_DELAY_MS and gives up on that occurrence after MAX_EARLY_RETRIES, so it can never
 * loop. A reload tries again. update() replaces the timer, dispose() clears it.
 */
export function createCheckInTimer(deps: CheckInTimerDeps) {
  const now = deps.now ?? (() => Date.now())
  const setTimer = deps.setTimer ?? ((cb, ms) => setTimeout(cb, ms))
  const clearTimer =
    deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>))
  const retries = deps.retries ?? new Map<string, number>()
  let timer: unknown = null
  let disposed = false

  const clear = () => {
    if (timer !== null) {
      clearTimer(timer)
      timer = null
    }
  }

  const arm = (slot: string, at: number) => {
    const tries = retries.get(slot) ?? 0
    const delay = Math.max(at - now(), tries > 0 ? MIN_RETRY_DELAY_MS : 0)
    const wait = Math.min(delay, MAX_TIMER_MS)
    timer = setTimer(() => {
      timer = null
      if (disposed) return
      if (delay > MAX_TIMER_MS) {
        arm(slot, at) // still far away: keep waiting in steps
        return
      }
      retries.set(slot, (retries.get(slot) ?? 0) + 1)
      deps.onFire()
    }, wait)
  }

  return {
    update(summary: DueFields | null): void {
      clear()
      if (disposed || !summary) return
      if (dueCheckInOccurrence(summary) !== null) return // due now: the modal owns it
      const slot = summary.travelReminderAvailableAt
      const at = slot ? Date.parse(slot) : Number.NaN
      if (!slot || !Number.isFinite(at) || summary.travelModeExpired === true)
        return
      if ((retries.get(slot) ?? 0) >= MAX_EARLY_RETRIES) return
      arm(slot, at)
    },
    dispose(): void {
      disposed = true
      clear()
    },
  }
}

// --- the answer -------------------------------------------------------------

export type CheckInAnswerOutcome =
  /** The server saved the answer. */
  | "saved"
  /** Another tab answered it, or Travel Mode ended: re-read /me and close the modal. */
  | "stale"
  /** A home-country change is running or in review: re-read /me and follow its state. */
  | "in_progress"
  /** Nothing was saved (network or server error): keep the screen open to try again. */
  | "failed"

export interface CheckInAnswerDeps {
  /** POST /v1/identity-verification/travel-duration/update */
  post: (duration: DeclaredDurationValue, checkInAt: string) => Promise<unknown>
}

function errorCode(error: unknown): string | null {
  const data = (
    error as {
      response?: { data?: { code?: unknown; error?: { code?: unknown } } }
    } | null
  )?.response?.data
  const code = data?.code ?? data?.error?.code
  return typeof code === "string" ? code : null
}

function outcomeOfError(error: unknown): CheckInAnswerOutcome {
  const code = errorCode(error)
  if (
    code === "TRAVEL_CHECK_IN_ALREADY_ANSWERED" ||
    code === "TRAVEL_MODE_NOT_ACTIVE"
  )
    return "stale"
  if (code === "HOME_COUNTRY_CHANGE_IN_PROGRESS") return "in_progress"
  return "failed"
}

/**
 * Submits ONE duration answer for the occurrence that was captured when the modal opened
 * (`checkInAt` is passed in, never re-read here). An unknown label or a missing occurrence
 * sends nothing. Skip, X/close, a refresh or navigating away never reach this function.
 */
export async function answerCheckIn(
  deps: CheckInAnswerDeps,
  label: string,
  checkInAt: string | null
): Promise<CheckInAnswerOutcome> {
  const duration = TRAVEL_DURATION_TO_BACKEND[label]
  if (!duration || !checkInAt) return "failed"
  try {
    await deps.post(duration, checkInAt)
    return "saved"
  } catch (error) {
    return outcomeOfError(error)
  }
}

// --- the confirmation and its Back (a revision of the saved answer) ----------

/**
 * The "Travel Mode is now active!" flow after a saved answer. `saved` is the duration the
 * server holds right now (it is what Back preselects), `answerCount` picks the same
 * first-time / "asked before" copy the answered screen had, and `screen` is which of the
 * two screens is showing. The whole flow is open while this is non-null; it closes only
 * through Done, X, or Skip/X on the revision screen, and none of those send anything.
 */
export interface CheckInConfirmation {
  saved: CheckInDurationLabel
  answerCount: number
  screen: "confirmation" | "revise"
}

export function isDurationLabel(label: string): label is CheckInDurationLabel {
  return (CHECK_IN_DURATION_LABELS as readonly string[]).includes(label)
}

/** Opens the flow on the confirmation, right after a saved answer. */
export function showCheckInConfirmation(
  label: string,
  answerCount: number
): CheckInConfirmation | null {
  return isDurationLabel(label)
    ? { saved: label, answerCount, screen: "confirmation" }
    : null
}

/** Back toggles between the confirmation and the duration screen; it never closes the flow. */
export function confirmationBack(
  current: CheckInConfirmation
): CheckInConfirmation {
  return {
    ...current,
    screen: current.screen === "confirmation" ? "revise" : "confirmation",
  }
}

export interface CheckInRevisionDeps {
  /** POST /v1/identity-verification/travel-duration/update, with NO checkInAt */
  post: (duration: DeclaredDurationValue) => Promise<unknown>
}

/**
 * Submits a revision of the answer that was just saved: the same endpoint without checkInAt,
 * so the server updates the duration and restarts the schedule but counts nothing and the
 * original occurrence stays resolved. Same outcomes as an answer.
 */
export async function reviseCheckIn(
  deps: CheckInRevisionDeps,
  label: string
): Promise<CheckInAnswerOutcome> {
  const duration = TRAVEL_DURATION_TO_BACKEND[label]
  if (!duration) return "failed"
  try {
    await deps.post(duration)
    return "saved"
  } catch (error) {
    return outcomeOfError(error)
  }
}

/**
 * Where the flow goes after a revision attempt:
 *  - saved: the new duration is the saved one and the confirmation is shown again;
 *  - failed: nothing changed, the duration screen stays (the saved option stays selected);
 *  - stale / in_progress: the server no longer takes edits (Travel Mode ended, another tab
 *    won, a home-country change started): the flow ends and /me is read again.
 */
export function applyCheckInRevision(
  current: CheckInConfirmation,
  label: string,
  outcome: CheckInAnswerOutcome
): CheckInConfirmation | null {
  if (outcome === "saved" && isDurationLabel(label)) {
    return { ...current, saved: label, screen: "confirmation" }
  }
  return outcome === "failed" ? current : null
}
