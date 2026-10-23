// Run like detected-location.test.ts (from the frontend/ directory).
//
// The login reminder ("5 minutes after authentication") is decided entirely by the backend:
// it arrives on the same /me fields as day 3 / day 7 (travelReminderDue / travelReminderAvailableAt)
// and is claimed through the same body-less POST. These tests prove the existing scheduler and
// popup already deliver the approved behavior without any new client rule: one timer for the
// 5-minute time, claim before showing, one popup for an overlap, nothing for a losing tab, and the
// next occurrence after a claim. They also prove the client never reads or sends a token claim.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  createTravelReminderScheduler,
  type TravelReminderClaimOutcome,
} from "./travel-reminder"
import { parseIdentityVerificationSummary } from "./identity-verification-state"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const flush = () => new Promise((resolve) => setImmediate(resolve))
const MINUTE = 60_000
const DAY = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString()

function env(initialNow = 1_000_000_000_000) {
  const state = { now: initialNow }
  const timers: Array<{ fn: () => void; ms: number; live: boolean }> = []
  const log: string[] = []
  const claims: TravelReminderClaimOutcome[] = []
  const deps = () => ({
    now: () => state.now,
    setTimer: (fn: () => void, ms: number) => {
      timers.push({ fn, ms, live: true })
      return timers.length
    },
    clearTimer: (handle: unknown) => {
      const t = timers[(handle as number) - 1]
      if (t) t.live = false
    },
    claim: async () => {
      log.push("claim")
      return claims.shift() ?? "not_claimed"
    },
    onClaimed: () => log.push("popup"),
    onSettled: () => log.push("settled"),
    attempted: new Set<string>(),
    retries: new Map<string, number>(),
    inFlight: { current: null } as { current: Promise<TravelReminderClaimOutcome> | null },
  })
  const fire = (i: number) => {
    timers[i].live = false // a timer that fired is spent
    timers[i].fn()
  }
  return { state, timers, log, claims, deps, fire, live: () => timers.filter((t) => t.live) }
}

describe("a login reminder arrives on the existing /me fields", () => {
  it("is read from travelReminderDue / travelReminderAvailableAt like any other occurrence", () => {
    const loginAt = iso(1_000_000_000_000 + 5 * MINUTE)
    const parsed = parseIdentityVerificationSummary({
      nextAction: "complete",
      fullyVerified: true,
      travelReminderDue: false,
      travelReminderAvailableAt: loginAt,
    })
    assert.equal(parsed?.travelReminderDue, false)
    assert.equal(parsed?.travelReminderAvailableAt, loginAt)
  })
})

describe("5 minutes after login: the existing scheduler delivers it once", () => {
  it("sets exactly one timer for the 5-minute time and claims only when it fires", async () => {
    const e = env()
    e.claims.push("claimed")
    const s = createTravelReminderScheduler(e.deps())
    s.update({ due: false, availableAt: iso(e.state.now + 5 * MINUTE) })

    assert.equal(e.live().length, 1)
    assert.equal(e.live()[0].ms, 5 * MINUTE)
    assert.deepEqual(e.log, [], "nothing is claimed or shown before the time")

    e.state.now += 5 * MINUTE
    e.fire(0)
    await flush()
    assert.deepEqual(e.log, ["claim", "popup", "settled"], "claim first, popup only on { claimed: true }")
  })

  it("a refresh (the page re-reads /me and updates) replaces the timer; it never adds a second", () => {
    const e = env()
    const s = createTravelReminderScheduler(e.deps())
    const schedule = { due: false, availableAt: iso(e.state.now + 5 * MINUTE) }
    s.update(schedule)
    s.update(schedule)
    s.update(schedule)
    assert.equal(e.live().length, 1)
  })

  it("loading the page after the 5 minutes (already due) claims once, shows once and never loops", async () => {
    const e = env()
    e.claims.push("claimed")
    const s = createTravelReminderScheduler(e.deps())
    const schedule = { due: true, availableAt: iso(e.state.now - 2 * MINUTE) }
    s.update(schedule)
    s.update(schedule) // a re-render with the same answer must not claim again
    await flush()
    assert.equal(e.log.filter((x) => x === "claim").length, 1)
    assert.equal(e.log.filter((x) => x === "popup").length, 1)
  })

  it("a second tab that loses the claim shows nothing", async () => {
    const winner = env()
    winner.claims.push("claimed")
    const loser = env()
    loser.claims.push("not_claimed")
    const schedule = { due: true, availableAt: iso(winner.state.now - MINUTE) }
    createTravelReminderScheduler(winner.deps()).update(schedule)
    createTravelReminderScheduler(loser.deps()).update(schedule)
    await flush()
    assert.ok(winner.log.includes("popup"))
    assert.ok(!loser.log.includes("popup"))
  })
})

describe("a login reminder overlapping a day reminder is one popup", () => {
  it("the backend reports one due occurrence and one claim consumes both: one popup, then the next occurrence", async () => {
    const e = env()
    e.claims.push("claimed")
    const s = createTravelReminderScheduler(e.deps())
    // Both are due: /me reports the earlier of the two as the single due occurrence.
    s.update({ due: true, availableAt: iso(e.state.now - 4 * MINUTE) })
    await flush()
    assert.equal(e.log.filter((x) => x === "popup").length, 1)
    assert.equal(e.log.filter((x) => x === "claim").length, 1)

    // The backend consumed both, so the re-read reports only what is left (day 7): its own timer.
    s.update({ due: false, availableAt: iso(e.state.now + 4 * DAY) })
    assert.equal(e.live().length, 1)
    assert.equal(e.log.filter((x) => x === "popup").length, 1, "no second popup for the same overlap")
  })

  it("after the login reminder is claimed, the day reminder is scheduled separately with its own timer", async () => {
    const e = env()
    e.claims.push("claimed", "claimed")
    const s = createTravelReminderScheduler(e.deps())
    s.update({ due: false, availableAt: iso(e.state.now + 5 * MINUTE) }) // login reminder
    e.state.now += 5 * MINUTE
    e.fire(0)
    await flush()

    s.update({ due: false, availableAt: iso(e.state.now + 3 * DAY) }) // day 3, from the next /me
    assert.equal(e.live().length, 1)
    assert.equal(e.live()[0].ms, 3 * DAY)
    e.state.now += 3 * DAY
    e.fire(1)
    await flush()
    assert.equal(e.log.filter((x) => x === "popup").length, 2, "two separate occurrences, two popups")
  })
})

describe("the client never touches the token's session or authentication time", () => {
  const files = [
    ["src", "lib", "api", "travel-reminder.ts"],
    ["src", "lib", "api", "travel-popup.ts"],
    ["src", "lib", "api", "identity-verification-state.ts"],
  ]

  it("no reminder file reads or sends auth_time, sid, a token or a cookie", () => {
    for (const f of files) {
      const source = read(...f)
      assert.ok(!/auth_time|authTime/.test(source), `${f.join("/")} must not read auth_time`)
      assert.ok(!/access_token|refresh_token|document\.cookie/.test(source), `${f.join("/")} must not read tokens or cookies`)
    }
  })

  it("the dashboard page hands the whole /me summary to the check-in helpers and never reads the token", () => {
    const page = read("app", "(group)", "talent-dashboard", "page.tsx")
    // travelReminderDue / travelReminderAvailableAt are read inside travel-check-in.ts only.
    assert.ok(page.includes("timer.update(travelSummary)"))
    assert.ok(page.includes("checkInHasPriority(\n    travelSummary,"))
    assert.ok(!/auth_time|authTime/.test(page))
    const lib = read("src", "lib", "api", "travel-check-in.ts")
    assert.ok(!/auth_time|authTime|access_token|refresh_token|document\.cookie/.test(lib))
  })

  it("the claim request still carries no body, query, id or timestamp", () => {
    const api = read("service", "http", "identity-verification.ts")
    assert.match(api, /claimTravelReminder:\s*\(\)\s*=>\s*AxiosRequest\.post\("\/v1\/identity-verification\/travel-reminder\/claim", null\)/)
  })
})
