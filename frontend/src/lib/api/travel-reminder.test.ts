// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  MAX_EARLY_RETRIES,
  MAX_TIMER_MS,
  MIN_RETRY_DELAY_MS,
  claimTravelReminder,
  createTravelReminderScheduler,
  parseTravelReminderClaimResponse,
  type TravelReminderClaimOutcome,
} from "./travel-reminder"
import { parseIdentityVerificationSummary } from "./identity-verification-state"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const flush = () => new Promise((resolve) => setImmediate(resolve))

describe("API contract: the append-only /me Travel Mode fields", () => {
  const AT = "2026-06-04T12:00:00.000Z"
  const END = "2026-06-14T12:00:00.000Z"

  it("parses the four fields exactly as the backend sent them", () => {
    const parsed = parseIdentityVerificationSummary({
      nextAction: "start_identity",
      travelModeEndsAt: END,
      travelModeExpired: false,
      travelReminderDue: true,
      travelReminderAvailableAt: AT,
    })
    assert.ok(parsed)
    assert.equal(parsed.travelModeEndsAt, END)
    assert.equal(parsed.travelModeExpired, false)
    assert.equal(parsed.travelReminderDue, true)
    assert.equal(parsed.travelReminderAvailableAt, AT)
  })

  it("absent fields (an older server) are null, never guessed", () => {
    const parsed = parseIdentityVerificationSummary({ nextAction: "complete" })
    assert.ok(parsed)
    assert.equal(parsed.travelModeEndsAt, null)
    assert.equal(parsed.travelModeExpired, null)
    assert.equal(parsed.travelReminderDue, null)
    assert.equal(parsed.travelReminderAvailableAt, null)
  })

  it("wrong types and unparseable timestamps become null", () => {
    const parsed = parseIdentityVerificationSummary({
      nextAction: "complete",
      travelModeEndsAt: "not a time",
      travelModeExpired: "true",
      travelReminderDue: 1,
      travelReminderAvailableAt: 1_780_000_000_000,
    })
    assert.ok(parsed)
    assert.equal(parsed.travelModeEndsAt, null)
    assert.equal(parsed.travelModeExpired, null)
    assert.equal(parsed.travelReminderDue, null)
    assert.equal(parsed.travelReminderAvailableAt, null)
  })

  it("the existing fields are untouched by the new ones", () => {
    const parsed = parseIdentityVerificationSummary({
      nextAction: "wait_for_retry",
      fullyVerified: false,
      attemptsUsed: 3,
      travelModeExpired: true,
    })
    assert.ok(parsed)
    assert.equal(parsed.flowState, "wait-for-retry")
    assert.equal(parsed.fullyVerified, false)
    assert.equal(parsed.attemptsUsed, 3)
  })
})

describe("the authenticated claim client", () => {
  const client = read("service", "http", "identity-verification.ts")

  it("POSTs the exact path with no body, query, id or timestamp", () => {
    assert.ok(client.includes('AxiosRequest.post("/v1/identity-verification/travel-reminder/claim", null)'))
    const method = client.slice(client.indexOf("claimTravelReminder:"), client.indexOf("// Real R2 presigned"))
    assert.ok(!/\?|userId|profileId|timestamp/.test(method.replace(/\/\/.*$/gm, "")))
  })

  it("accepts only the exact { claimed: boolean } response", () => {
    assert.equal(parseTravelReminderClaimResponse({ claimed: true }), true)
    assert.equal(parseTravelReminderClaimResponse({ claimed: false }), false)
    for (const bad of [
      null, undefined, "", "claimed", 1, true, [], [{ claimed: true }], {},
      { claimed: "true" }, { claimed: 1 }, { claimed: null }, { claimed: undefined },
      { claimed: true, extra: 1 }, { claimed: true, day: 3 }, { Claimed: true }, { claimed: true, claimedAt: "x" },
    ]) {
      assert.equal(parseTravelReminderClaimResponse(bad), null, JSON.stringify(bad))
    }
  })

  it("maps responses to claimed / not_claimed / failed, and never throws", async () => {
    assert.equal(await claimTravelReminder(async () => ({ claimed: true })), "claimed")
    assert.equal(await claimTravelReminder(async () => ({ claimed: false })), "not_claimed")
    assert.equal(await claimTravelReminder(async () => ({ claimed: true, extra: 1 })), "failed")
    assert.equal(await claimTravelReminder(async () => "ok"), "failed")
    assert.equal(await claimTravelReminder(async () => { throw new Error("401") }), "failed")
  })
})

// A scripted environment: a fake clock, fake timers and a scripted claim.
function env(initialNow = 1_000_000) {
  const state = { now: initialNow }
  const timers: Array<{ handle: number; fn: () => void; ms: number; live: boolean }> = []
  const cleared: number[] = []
  const log: string[] = []
  const claims: TravelReminderClaimOutcome[] = []
  let claimCalls = 0
  const deps = () => ({
    now: () => state.now,
    setTimer: (fn: () => void, ms: number) => {
      const handle = timers.length + 1
      timers.push({ handle, fn, ms, live: true })
      return handle
    },
    clearTimer: (handle: unknown) => {
      cleared.push(handle as number)
      const t = timers.find((x) => x.handle === handle)
      if (t) t.live = false
    },
    claim: async () => {
      claimCalls += 1
      log.push("claim")
      return claims.shift() ?? "not_claimed"
    },
    onClaimed: () => log.push("claimed"),
    onSettled: () => log.push("settled"),
    attempted: new Set<string>(),
    retries: new Map<string, number>(),
    inFlight: { current: null } as { current: Promise<TravelReminderClaimOutcome> | null },
  })
  return {
    state, timers, cleared, log, claims,
    deps,
    liveTimers: () => timers.filter((t) => t.live),
    claimCalls: () => claimCalls,
    fire: (i: number) => { const t = timers[i]; t.live = false; t.fn() },
  }
}
const iso = (ms: number) => new Date(ms).toISOString()

describe("due now: claim before showing anything", () => {
  it("claims first and shows only on { claimed: true }", async () => {
    const e = env()
    e.claims.push("claimed")
    const s = createTravelReminderScheduler(e.deps())

    s.update({ due: true, availableAt: iso(e.state.now - 1000) })
    assert.deepEqual(e.log, ["claim"]) // nothing shown yet
    await flush()

    assert.deepEqual(e.log, ["claim", "claimed", "settled"])
  })

  it("{ claimed: false } shows nothing (but the page may re-read /me)", async () => {
    const e = env()
    e.claims.push("not_claimed")
    const s = createTravelReminderScheduler(e.deps())

    s.update({ due: true, availableAt: iso(e.state.now - 1000) })
    await flush()

    assert.deepEqual(e.log, ["claim", "settled"])
  })

  it("a claim failure shows nothing, does not re-read /me and can be retried later", async () => {
    const e = env()
    const d = e.deps()
    const s = createTravelReminderScheduler(d)
    e.claims.push("failed")

    s.update({ due: true, availableAt: iso(e.state.now - 1000) })
    await flush()
    assert.deepEqual(e.log, ["claim"]) // no popup, no settled → no retry loop

    e.claims.push("claimed")
    s.update({ due: true, availableAt: iso(e.state.now - 1000) }) // a later attempt (e.g. next load)
    await flush()
    assert.deepEqual(e.log, ["claim", "claim", "claimed", "settled"])
  })

  it("never shows for an unclaimable schedule (null / invalid availability)", async () => {
    const e = env()
    const s = createTravelReminderScheduler(e.deps())
    s.update({ due: true, availableAt: null })
    s.update({ due: false, availableAt: null })
    s.update({ due: null, availableAt: null })
    s.update({ due: true, availableAt: "garbage" })
    await flush()
    assert.equal(e.claimCalls(), 0)
    assert.equal(e.timers.length, 0)
  })
})

describe("a future availability: one timer, no polling", () => {
  it("schedules exactly one timer for the availability time and claims only when it fires", async () => {
    const e = env()
    e.claims.push("claimed")
    const s = createTravelReminderScheduler(e.deps())

    s.update({ due: false, availableAt: iso(e.state.now + 3_600_000) })

    assert.equal(e.timers.length, 1)
    assert.equal(e.timers[0].ms, 3_600_000)
    assert.equal(e.claimCalls(), 0) // not claimed early
    e.state.now += 3_600_000
    e.fire(0)
    await flush()
    assert.deepEqual(e.log, ["claim", "claimed", "settled"])
  })

  it("never creates a second timer on its own (no polling after it fires)", async () => {
    const e = env()
    const s = createTravelReminderScheduler(e.deps())
    s.update({ due: false, availableAt: iso(e.state.now + 1000) })
    e.state.now += 1000
    e.fire(0)
    await flush()
    assert.equal(e.timers.length, 1)
  })

  it("replaces the pending timer when the status changes (the old one is cleared)", () => {
    const e = env()
    const s = createTravelReminderScheduler(e.deps())

    s.update({ due: false, availableAt: iso(e.state.now + 5000) })
    s.update({ due: false, availableAt: iso(e.state.now + 9000) })

    assert.equal(e.timers.length, 2)
    assert.deepEqual(e.cleared, [1])
    assert.equal(e.liveTimers().length, 1)
    assert.equal(e.liveTimers()[0].ms, 9000)
  })

  it("an update with nothing left clears the timer without arming another", () => {
    const e = env()
    const s = createTravelReminderScheduler(e.deps())
    s.update({ due: false, availableAt: iso(e.state.now + 5000) })
    s.update({ due: false, availableAt: null })
    assert.equal(e.liveTimers().length, 0)
  })

  it("an availability further out than setTimeout allows is re-armed in steps, claiming only at the end", async () => {
    const e = env()
    e.claims.push("claimed")
    const far = MAX_TIMER_MS + 10_000
    const s = createTravelReminderScheduler(e.deps())

    s.update({ due: false, availableAt: iso(e.state.now + far) })
    assert.equal(e.timers[0].ms, MAX_TIMER_MS)
    e.state.now += MAX_TIMER_MS
    e.fire(0)
    assert.equal(e.claimCalls(), 0)
    assert.equal(e.timers[1].ms, 10_000)
    e.state.now += 10_000
    e.fire(1)
    await flush()
    assert.deepEqual(e.log, ["claim", "claimed", "settled"])
  })

  it("an availability already in the past (stale /me) claims now instead of waiting", async () => {
    const e = env()
    e.claims.push("claimed")
    const s = createTravelReminderScheduler(e.deps())
    s.update({ due: false, availableAt: iso(e.state.now - 5000) })
    await flush()
    assert.equal(e.timers.length, 0)
    assert.deepEqual(e.log, ["claim", "claimed", "settled"])
  })
})

describe("timer cleanup", () => {
  it("dispose clears the pending timer and later updates do nothing", () => {
    const e = env()
    const s = createTravelReminderScheduler(e.deps())
    s.update({ due: false, availableAt: iso(e.state.now + 5000) })

    s.dispose()

    assert.equal(e.liveTimers().length, 0)
    s.update({ due: false, availableAt: iso(e.state.now + 5000) })
    s.update({ due: true, availableAt: iso(e.state.now - 1) })
    assert.equal(e.timers.length, 1)
    assert.equal(e.claimCalls(), 0)
  })

  it("an answer that arrives after dispose neither shows nor re-reads", async () => {
    const e = env()
    e.claims.push("claimed")
    const s = createTravelReminderScheduler(e.deps())
    s.update({ due: true, availableAt: iso(e.state.now - 1) })
    s.dispose()
    await flush()
    assert.deepEqual(e.log, ["claim"])
  })
})

describe("duplicate and remount protection", () => {
  it("two instances over one shared state (StrictMode / remount) send ONE claim and show once", async () => {
    const e = env()
    e.claims.push("claimed")
    const d = e.deps()
    const first = createTravelReminderScheduler(d)
    const second = createTravelReminderScheduler(d) // shares attempted / in-flight

    const schedule = { due: true, availableAt: iso(e.state.now - 1) }
    first.update(schedule)
    first.dispose() // the first effect is torn down...
    second.update(schedule) // ...and the second one starts
    await flush()

    assert.equal(e.claimCalls(), 1)
    assert.equal(e.log.filter((x) => x === "claimed").length, 1) // the live instance shows it
  })

  it("an occurrence that already got its answer is never claimed again by a remount", async () => {
    const e = env()
    const d = e.deps()
    e.claims.push("claimed")
    const first = createTravelReminderScheduler(d)
    const slot = iso(e.state.now - 1)
    first.update({ due: true, availableAt: slot })
    await flush()
    first.dispose()

    const remounted = createTravelReminderScheduler(d)
    remounted.update({ due: true, availableAt: slot })
    await flush()

    assert.equal(e.claimCalls(), 1)
  })

  it("after { claimed: false } for a due occurrence the same schedule is not claimed again (no loop)", async () => {
    const e = env()
    const s = createTravelReminderScheduler(e.deps())
    const schedule = { due: true, availableAt: iso(e.state.now - 1) }
    s.update(schedule)
    await flush()
    s.update(schedule) // the re-read /me returns the same thing
    await flush()
    assert.equal(e.claimCalls(), 1)
  })

  it("the next occurrence after a claim is scheduled and claimed on its own", async () => {
    const e = env()
    e.claims.push("claimed", "claimed")
    const s = createTravelReminderScheduler(e.deps())
    s.update({ due: true, availableAt: iso(e.state.now - 1) })
    await flush()

    s.update({ due: false, availableAt: iso(e.state.now + 4 * 86_400_000) }) // day 7 from the next /me
    assert.equal(e.timers.length, 1)
    e.state.now += 4 * 86_400_000
    e.fire(0)
    await flush()

    assert.equal(e.claimCalls(), 2)
    assert.equal(e.log.filter((x) => x === "claimed").length, 2)
  })

  it("concurrent tabs rely on the backend: a { claimed: false } answer shows nothing in the losing tab", async () => {
    const winner = env()
    winner.claims.push("claimed")
    const loser = env()
    loser.claims.push("not_claimed")
    const schedule = { due: true, availableAt: iso(winner.state.now - 1) }

    createTravelReminderScheduler(winner.deps()).update(schedule)
    createTravelReminderScheduler(loser.deps()).update(schedule)
    await flush()

    assert.ok(winner.log.includes("claimed"))
    assert.ok(!loser.log.includes("claimed"))
  })
})

describe("a timer that fires slightly early (client clock ahead of the server)", () => {
  it("is not treated as a final answer: it is retried, spaced out, and gives up after a few tries", async () => {
    const e = env()
    const d = e.deps()
    const s = createTravelReminderScheduler(d)
    const slot = iso(e.state.now + 1000)

    s.update({ due: false, availableAt: slot })
    e.state.now += 1000
    e.fire(0)
    await flush() // backend says "not yet"
    assert.deepEqual(e.log, ["claim", "settled"])
    assert.equal(d.attempted.has(slot), false) // not a final answer

    for (let tries = 1; tries < MAX_EARLY_RETRIES; tries += 1) {
      s.update({ due: false, availableAt: slot }) // the re-read /me, still "not due"
      const last = e.timers[e.timers.length - 1]
      assert.ok(last.ms >= MIN_RETRY_DELAY_MS) // never a tight loop
      e.state.now += last.ms
      e.fire(e.timers.length - 1)
      await flush()
    }
    const before = e.timers.length
    s.update({ due: false, availableAt: slot })
    assert.equal(e.timers.length, before) // gave up: a reload tries again
    assert.equal(e.claimCalls(), MAX_EARLY_RETRIES)
  })
})

describe("no polling anywhere", () => {
  it("none of the Travel Mode files or the page uses setInterval", () => {
    for (const file of [
      ["src", "lib", "api", "travel-reminder.ts"],
      ["src", "lib", "api", "travel-expiry-popup.ts"],
      ["app", "(group)", "talent-dashboard", "page.tsx"],
    ]) {
      assert.ok(!read(...file).includes("setInterval"), file.join("/"))
    }
  })
})
