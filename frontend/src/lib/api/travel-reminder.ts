// frontend/src/lib/api/travel-reminder.ts
//
// Day-3 / day-7 Travel Mode reminders. The backend decides everything: GET /me says
// whether a reminder is due now (travelReminderDue) or when the next one becomes
// available (travelReminderAvailableAt), and POST travel-reminder/claim atomically
// hands an occurrence to exactly ONE caller. This file only
//   1. claims — before anything is shown — and accepts nothing but { claimed: boolean },
//   2. schedules a single timer for a future availability (never polls), and
//   3. makes sure a rerender, remount or second tab cannot show the same occurrence twice
//      (the backend claim is the cross-tab guard; this is the in-page one).
// No UI lives here and no reminder rule (days, durations, expiry) is re-derived.

export type TravelReminderClaimOutcome = "claimed" | "not_claimed" | "failed"

/**
 * The claim response must be EXACTLY { claimed: boolean }: a plain object with that one
 * key and a boolean value. Anything else (extra fields, a missing key, a string "true",
 * an array, null) is rejected as null — never interpreted.
 */
export function parseTravelReminderClaimResponse(raw: unknown): boolean | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const keys = Object.keys(raw)
  if (keys.length !== 1 || keys[0] !== "claimed") return null
  const claimed = (raw as { claimed: unknown }).claimed
  return typeof claimed === "boolean" ? claimed : null
}

async function defaultPost(): Promise<unknown> {
  const { IdentityVerificationAPI } = await import(
    "@/service/http/identity-verification"
  )
  return (await IdentityVerificationAPI.claimTravelReminder()).data
}

/**
 * Claims the next reminder. "claimed" only for the exact response { claimed: true };
 * "not_claimed" for exactly { claimed: false }; "failed" for a request error or any
 * other response shape. A failure never shows a popup.
 */
export async function claimTravelReminder(
  post: () => Promise<unknown> = defaultPost
): Promise<TravelReminderClaimOutcome> {
  try {
    const parsed = parseTravelReminderClaimResponse(await post())
    if (parsed === null) return "failed"
    return parsed ? "claimed" : "not_claimed"
  } catch {
    return "failed"
  }
}

// --- scheduling -----------------------------------------------------------

// The largest delay setTimeout accepts; a longer wait is re-armed in steps.
export const MAX_TIMER_MS = 2_147_483_647
// When the backend says "not due yet" but the browser clock believes the time has
// passed (clock skew), wait at least this long before asking again.
export const MIN_RETRY_DELAY_MS = 5_000
// A timer-fired claim the backend answers "not yet" is retried at most this many times
// per occurrence; a reload tries again.
export const MAX_EARLY_RETRIES = 3

export interface TravelReminderSchedule {
  /** From GET /me: an unclaimed reminder is due now. */
  due: boolean | null
  /** From GET /me: the time of the earliest unclaimed reminder (ISO), or null. */
  availableAt: string | null
}

type Holder<T> = { current: T }

// Page-lifetime memory (cleared by a reload), shared by every scheduler instance so a
// StrictMode double effect or a remount cannot claim the same occurrence twice.
const defaultAttempted = new Set<string>()
const defaultRetries = new Map<string, number>()
const defaultInFlight: Holder<Promise<TravelReminderClaimOutcome> | null> = { current: null }

export interface TravelReminderSchedulerDeps {
  /** Performs the claim; defaults to the real endpoint. */
  claim?: () => Promise<TravelReminderClaimOutcome>
  /** Called only when the backend answered { claimed: true }: show the popup. */
  onClaimed: () => void
  /**
   * Called after a DEFINITIVE answer (claimed or not), so the page can re-read GET /me
   * for the next occurrence. Never called after a failure, so a failing network cannot
   * make a retry loop.
   */
  onSettled?: () => void
  now?: () => number
  setTimer?: (callback: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
  attempted?: Set<string>
  retries?: Map<string, number>
  inFlight?: Holder<Promise<TravelReminderClaimOutcome> | null>
}

export function createTravelReminderScheduler(deps: TravelReminderSchedulerDeps) {
  const claim = deps.claim ?? (() => claimTravelReminder())
  const now = deps.now ?? (() => Date.now())
  const setTimer = deps.setTimer ?? ((cb, ms) => setTimeout(cb, ms))
  const clearTimer =
    deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>))
  const attempted = deps.attempted ?? defaultAttempted
  const retries = deps.retries ?? defaultRetries
  const inFlight = deps.inFlight ?? defaultInFlight

  let timer: unknown = null
  let disposed = false
  let generation = 0

  const clear = () => {
    if (timer !== null) {
      clearTimer(timer)
      timer = null
    }
  }

  // One claim request at a time across instances: a second instance that starts while
  // one is in flight waits for the same answer instead of sending another.
  const sharedClaim = (): Promise<TravelReminderClaimOutcome> => {
    if (inFlight.current) return inFlight.current
    const started = claim().finally(() => {
      if (inFlight.current === started) inFlight.current = null
    })
    inFlight.current = started
    return started
  }

  const attempt = async (slot: string, backendSaidDue: boolean) => {
    if (attempted.has(slot)) return
    const myGeneration = generation
    const outcome = await sharedClaim()
    if (outcome === "failed") return // nothing recorded, nothing shown, no re-read
    if (outcome === "claimed" || backendSaidDue) {
      attempted.add(slot) // a definitive answer for an occurrence the backend called due
    } else {
      // A timer fired a little early (clock skew): allow a few later retries.
      retries.set(slot, (retries.get(slot) ?? 0) + 1)
    }
    if (disposed || myGeneration !== generation) return // superseded; the live one acts
    if (outcome === "claimed") deps.onClaimed()
    deps.onSettled?.()
  }

  const arm = (schedule: TravelReminderSchedule, slot: string, at: number) => {
    const delay = Math.max(at - now(), (retries.get(slot) ?? 0) > 0 ? MIN_RETRY_DELAY_MS : 0)
    if (delay <= 0) {
      void attempt(slot, false)
      return
    }
    if (delay > MAX_TIMER_MS) {
      timer = setTimer(() => {
        timer = null
        arm(schedule, slot, at)
      }, MAX_TIMER_MS)
      return
    }
    timer = setTimer(() => {
      timer = null
      void attempt(slot, false)
    }, delay)
  }

  return {
    /** Replaces any pending timer with the schedule from the latest GET /me. */
    update(schedule: TravelReminderSchedule): void {
      clear()
      generation += 1
      if (disposed) return
      const slot = schedule.availableAt
      const at = slot ? Date.parse(slot) : Number.NaN
      if (!slot || !Number.isFinite(at)) return // nothing to claim or schedule
      if (attempted.has(slot)) return // this occurrence already had its definitive answer
      if (schedule.due === true) {
        void attempt(slot, true) // due now: claim BEFORE showing anything
        return
      }
      if ((retries.get(slot) ?? 0) >= MAX_EARLY_RETRIES) return
      arm(schedule, slot, at) // a single timer for the future time; never a poll
    },
    /** Clears the timer; late answers are ignored (the backend claim already settled them). */
    dispose(): void {
      disposed = true
      clear()
    },
  }
}
