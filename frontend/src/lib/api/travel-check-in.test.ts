// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { parseIdentityVerificationSummary } from "./identity-verification-state"
import {
  CHECK_IN_COPY,
  CHECK_IN_DURATION_LABELS,
  answerCheckIn,
  checkInAnswerCount,
  checkInHasPriority,
  checkInScope,
  checkInToShow,
  createCheckInDismissals,
  createCheckInTimer,
  dueCheckInOccurrence,
  durationCopyFor,
  isCheckInStale,
  shouldRecheckOnVisibility,
} from "./travel-check-in"
import {
  createTravelerPromptHandled,
  shouldOpenTravelerPrompt,
} from "./travel-location-prompt"
import {
  MAX_EARLY_RETRIES,
  MAX_TIMER_MS,
  MIN_RETRY_DELAY_MS,
} from "./travel-reminder"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = read("app", "(group)", "talent-dashboard", "page.tsx")
const http = read("service", "http", "identity-verification.ts")
const between = (source: string, from: string, to: string) => {
  const start = source.indexOf(from)
  assert.ok(start >= 0, `missing: ${from}`)
  return source.slice(start, source.indexOf(to, start))
}

const KEY_A = "a".repeat(64)
const KEY_B = "b".repeat(64)
const AT = "2026-10-21T12:00:00.000Z"

const summary = (over: Record<string, unknown> = {}) =>
  parseIdentityVerificationSummary({
    nextAction: "none",
    travelModeEndsAt: "2026-11-21T12:00:00.000Z",
    travelModeExpired: false,
    travelReminderDue: true,
    travelReminderAvailableAt: AT,
    loginSessionKey: KEY_A,
    ...over,
  })

describe("copy: first time versus asked before", () => {
  it("no answer yet (absent, null, 0) uses the first-time duration copy", () => {
    for (const body of [
      {},
      { travelCheckInCount: null },
      { travelCheckInCount: 0 },
    ]) {
      const count = checkInAnswerCount(summary(body))
      assert.equal(count, 0)
      assert.equal(durationCopyFor(count).title, "How long are you traveling?")
      assert.ok(
        durationCopyFor(count).body.startsWith(
          "You’re marked as temporarily traveling."
        )
      )
    }
  })

  it("from the first saved answer on (1, 2, 3, ...) it uses the supplied 'asked before' copy", () => {
    for (const n of [1, 2, 3, 10]) {
      const count = checkInAnswerCount(summary({ travelCheckInCount: n }))
      assert.equal(count, n)
      assert.equal(
        durationCopyFor(count).body,
        "We’ve asked before, answering helps reduce these reminders."
      )
    }
  })

  it("an unusable count is treated as no answer, never as 'asked before'", () => {
    for (const bad of [-1, 1.5, "2", true, NaN, {}]) {
      assert.equal(checkInAnswerCount(summary({ travelCheckInCount: bad })), 0)
    }
  })

  it("the four duration options, in order, with 'Not sure' among them", () => {
    assert.deepEqual(
      [...CHECK_IN_DURATION_LABELS],
      ["A few days", "1–2 weeks", "More than 2 weeks", "Not sure"]
    )
  })

  it("the check-in modal body is the confirmed Figma sentence", () => {
    assert.equal(
      CHECK_IN_COPY.prompt.body,
      "You’re logging in from a location outside your usual one. Just checking if you’re still away."
    )
  })

  it("the information box: reminder copy the first time, 'won’t be asked again' from the first answer on", () => {
    assert.equal(
      durationCopyFor(0).alert,
      "We’ll remind you later to check if your status has changed."
    )
    for (const n of [1, 2, 5]) {
      assert.equal(
        durationCopyFor(n).alert,
        "You won’t be asked again for a while based on your selection."
      )
    }
  })

  it("the check-in modal copy and the two actions", () => {
    assert.equal(CHECK_IN_COPY.prompt.title, "Still traveling?")
    assert.equal(CHECK_IN_COPY.prompt.stillTraveling, "I’m still traveling")
    assert.equal(
      CHECK_IN_COPY.prompt.updateHomeCountry,
      "Update my home country"
    )
    assert.equal(CHECK_IN_COPY.skip, "Skip")
  })
})

describe("the summary parser carries travelCheckInCount", () => {
  it("absent or malformed is null; a non-negative number is kept exactly", () => {
    assert.equal(
      parseIdentityVerificationSummary({ nextAction: "none" })
        ?.travelCheckInCount,
      null
    )
    assert.equal(summary({ travelCheckInCount: "x" })?.travelCheckInCount, null)
    assert.equal(summary({ travelCheckInCount: -1 })?.travelCheckInCount, null)
    assert.equal(summary({ travelCheckInCount: 0 })?.travelCheckInCount, 0)
    assert.equal(summary({ travelCheckInCount: 2 })?.travelCheckInCount, 2)
  })
})

describe("which occurrence is due", () => {
  it("only travelReminderDue with a real time, for a Travel Mode that has not ended", () => {
    assert.equal(dueCheckInOccurrence(summary()), AT)
    assert.equal(
      dueCheckInOccurrence(summary({ travelReminderDue: false })),
      null
    )
    assert.equal(
      dueCheckInOccurrence(summary({ travelReminderDue: undefined })),
      null
    )
    assert.equal(
      dueCheckInOccurrence(summary({ travelReminderAvailableAt: null })),
      null
    )
    assert.equal(
      dueCheckInOccurrence(summary({ travelReminderAvailableAt: "garbage" })),
      null
    )
    assert.equal(
      dueCheckInOccurrence(summary({ travelModeExpired: true })),
      null
    )
    assert.equal(dueCheckInOccurrence(null), null)
  })
})

describe("answering: all four durations, with the captured checkInAt", () => {
  const record = () => {
    const calls: Array<[string, string]> = []
    return {
      calls,
      deps: {
        post: async (duration: string, checkInAt: string) => {
          calls.push([duration, checkInAt])
          return {}
        },
      },
    }
  }

  for (const [label, duration] of [
    ["A few days", "a_few_days"],
    ["1–2 weeks", "one_to_two_weeks"],
    ["More than 2 weeks", "more_than_two_weeks"],
    ["Not sure", "not_sure"],
  ] as const) {
    it(`"${label}" is sent as ${duration} with the occurrence captured when the modal opened`, async () => {
      const { calls, deps } = record()
      assert.equal(await answerCheckIn(deps, label, AT), "saved")
      assert.deepEqual(calls, [[duration, AT]])
    })
  }

  it("'Not sure' is a duration answer: it is sent like the others", async () => {
    const { calls, deps } = record()
    await answerCheckIn(deps, "Not sure", AT)
    assert.equal(calls.length, 1)
    assert.equal(calls[0][0], "not_sure")
  })

  it("an unknown label, 'Skip' or a missing occurrence sends nothing", async () => {
    for (const [label, at] of [
      ["Skip", AT],
      ["", AT],
      ["Forever", AT],
      ["Not sure", null],
    ] as const) {
      const { calls, deps } = record()
      assert.equal(await answerCheckIn(deps, label, at), "failed")
      assert.deepEqual(calls, [])
    }
  })

  it("checkInAt is whatever the caller captured: this function never reads /me", () => {
    const source = read("src", "lib", "api", "travel-check-in.ts")
    const fn = between(source, "export async function answerCheckIn", "\n}\n")
    assert.ok(
      !/fetchIdentityVerificationSummary|fetch\(|travelReminderAvailableAt/.test(
        fn
      )
    )
  })

  it("the HTTP client posts exactly { duration, checkInAt } to travel-duration/update", () => {
    assert.match(
      http,
      /updateActiveTravelDuration:[\s\S]*?AxiosRequest\.post\("\/v1\/identity-verification\/travel-duration\/update", \{\s*duration,\s*checkInAt,\s*\}\)/
    )
  })
})

describe("answer outcomes: stale two-tab 409 and a home-country change in progress", () => {
  const failWith = (data: unknown) => ({
    post: async () => {
      throw { response: { status: 409, data } }
    },
  })

  it("TRAVEL_CHECK_IN_ALREADY_ANSWERED (the other tab answered first) is stale", async () => {
    assert.equal(
      await answerCheckIn(
        failWith({ code: "TRAVEL_CHECK_IN_ALREADY_ANSWERED" }),
        "Not sure",
        AT
      ),
      "stale"
    )
    assert.equal(
      await answerCheckIn(
        failWith({ error: { code: "TRAVEL_CHECK_IN_ALREADY_ANSWERED" } }),
        "Not sure",
        AT
      ),
      "stale"
    )
  })

  it("TRAVEL_MODE_NOT_ACTIVE (Travel Mode ended meanwhile) is stale too", async () => {
    assert.equal(
      await answerCheckIn(
        failWith({ code: "TRAVEL_MODE_NOT_ACTIVE" }),
        "Not sure",
        AT
      ),
      "stale"
    )
  })

  it("HOME_COUNTRY_CHANGE_IN_PROGRESS follows the returned state", async () => {
    assert.equal(
      await answerCheckIn(
        failWith({ code: "HOME_COUNTRY_CHANGE_IN_PROGRESS" }),
        "Not sure",
        AT
      ),
      "in_progress"
    )
  })

  it("any other error leaves the screen open to try again", async () => {
    assert.equal(
      await answerCheckIn(failWith({ code: "SOMETHING_ELSE" }), "Not sure", AT),
      "failed"
    )
    assert.equal(
      await answerCheckIn(
        { post: async () => Promise.reject(new Error("network")) },
        "Not sure",
        AT
      ),
      "failed"
    )
    assert.equal(
      await answerCheckIn(failWith(undefined), "Not sure", AT),
      "failed"
    )
  })

  it("the page re-reads /me and closes the modal on stale or saved, and follows the state on in-progress", () => {
    const handler = between(
      page,
      "const handleCheckInAnswer",
      '// "Update my home country" enters'
    )
    assert.ok(handler.includes('if (outcome === "failed")'))
    assert.ok(handler.includes("setCheckIn(null)"))
    assert.ok(handler.includes('if (outcome === "in_progress")'))
    assert.ok(handler.includes("await runIdentityVerificationCheck()"))
    assert.ok(handler.includes("await readTravelSummary(false)"))
  })

  it("a fresh /me that no longer names the open occurrence closes the stale modal", () => {
    assert.equal(isCheckInStale(AT, summary()), false)
    assert.equal(
      isCheckInStale(AT, summary({ travelReminderDue: false })),
      true
    ) // answered elsewhere
    assert.equal(
      isCheckInStale(
        AT,
        summary({ travelReminderAvailableAt: "2026-10-28T12:00:00.000Z" })
      ),
      true
    )
    assert.equal(isCheckInStale(AT, summary({ travelModeExpired: true })), true)
    assert.equal(isCheckInStale(AT, null), true)
    const effect = between(
      page,
      "const next = checkInToShow({",
      "}, [travelSummary, checkInScopeKey, identityFlowOpen])"
    )
    assert.ok(
      effect.includes("isCheckInStale(current.occurrence, travelSummary)")
    )
  })
})

describe("Skip, X/close, Escape, refresh and navigation send nothing", () => {
  it("the dismiss handler makes no request and only remembers the close in memory", () => {
    const dismiss = between(
      page,
      "const handleCheckInDismiss",
      '// "I\'m still traveling"'
    )
    assert.ok(
      !/IdentityVerificationAPI|answerCheckIn|updateActiveTravelDuration|fetch|localStorage|sessionStorage/.test(
        dismiss
      )
    )
    assert.ok(dismiss.includes("checkInDismissalsRef.current.dismiss("))
  })

  it("Skip, the X and the dialog's own close (Escape, outside click) all go through that handler", () => {
    const dialog = between(
      page,
      "<Dialog\n        open={checkIn !== null}",
      "{/* Not rendered while the check-in is due or open"
    )
    assert.ok(dialog.includes("if (!open) handleCheckInDismiss()"))
    assert.equal(
      (dialog.match(/onClick=\{handleCheckInDismiss\}/g) ?? []).length,
      2
    ) // the X and Skip
    assert.match(dialog, /\{CHECK_IN_COPY\.skip\}/)
  })

  it("there is no Confirm button: a duration choice submits immediately, Skip only closes", () => {
    const duration = between(
      page,
      'checkIn?.phase === "duration"',
      "</DialogContent>"
    )
    assert.ok(!/Confirm/.test(duration))
    assert.equal((duration.match(/<Button\b/g) ?? []).length, 1) // Skip
    assert.match(
      duration,
      /onValueChange=\{\(label\) => void handleCheckInAnswer\(label\)\}/
    )
    const stories = read(
      "stories",
      "identity-verification-check-in.stories.tsx"
    )
    assert.ok(!/Confirm/.test(stories))
  })

  it("only a duration choice reaches the answer handler", () => {
    const dialog = between(
      page,
      "<Dialog\n        open={checkIn !== null}",
      "{/* Not rendered while the check-in is due or open"
    )
    assert.equal((dialog.match(/handleCheckInAnswer\(/g) ?? []).length, 1)
    assert.match(
      dialog,
      /onValueChange=\{\(label\) => void handleCheckInAnswer\(label\)\}/
    )
  })

  it("the answer is submitted with the occurrence captured when the modal opened, never re-read", () => {
    const handler = between(
      page,
      "const handleCheckInAnswer",
      '// "Update my home country" enters'
    )
    assert.ok(
      handler.indexOf("const occurrence = checkIn.occurrence") <
        handler.indexOf("await answerCheckIn(")
    )
    assert.match(handler, /label,\s*occurrence\s*\)/)
    assert.ok(
      !/travelSummary/.test(
        handler.slice(0, handler.indexOf("await answerCheckIn("))
      )
    )
    assert.ok(
      handler.includes("checkInSavingRef.current"),
      "a double submit is ignored"
    )
  })

  it("after a close the occurrence stays due and is not reopened in a render loop, but returns on the next check", () => {
    const dismissals = createCheckInDismissals()
    const scope = checkInScope("user-1", KEY_A)
    const s = summary()
    assert.equal(checkInToShow({ summary: s, scope, dismissals }), AT)

    dismissals.dismiss(scope, AT) // Skip / X / Escape
    for (let i = 0; i < 5; i += 1) {
      assert.equal(
        checkInToShow({ summary: s, scope, dismissals }),
        null,
        "re-evaluating the same summary does not reopen it"
      )
    }
    assert.equal(dueCheckInOccurrence(s), AT, "the backend still calls it due")

    dismissals.clear() // a real check: load, a visible tab or the timer
    assert.equal(checkInToShow({ summary: s, scope, dismissals }), AT)
  })

  it("another dialog on screen holds it back without dismissing it", () => {
    const dismissals = createCheckInDismissals()
    const scope = checkInScope("user-1", KEY_A)
    assert.equal(
      checkInToShow({ summary: summary(), scope, dismissals, busy: true }),
      null
    )
    assert.equal(checkInToShow({ summary: summary(), scope, dismissals }), AT)
  })
})

describe("checks: dashboard load, login, tab visibility and the availableAt timer", () => {
  it("dashboard load and login use the existing /me read that feeds travelSummary", () => {
    const check = between(
      page,
      "const runIdentityVerificationCheck",
      "// A start attempt rejected"
    )
    assert.ok(
      check.includes("const summary = await fetchIdentityVerificationSummary()")
    )
    assert.ok(check.includes("setTravelSummary(summary)"))
    assert.ok(page.includes("void runIdentityVerificationCheck()"))
  })

  it("a tab that becomes visible re-checks, unless a read is already running or one just happened", () => {
    const base = {
      visibilityState: "visible",
      inFlight: false,
      lastCheckAt: null,
      now: 100_000,
    }
    assert.equal(shouldRecheckOnVisibility(base), true)
    assert.equal(
      shouldRecheckOnVisibility({ ...base, visibilityState: "hidden" }),
      false
    )
    assert.equal(shouldRecheckOnVisibility({ ...base, inFlight: true }), false)
    assert.equal(
      shouldRecheckOnVisibility({ ...base, lastCheckAt: 99_000 }),
      false
    )
    assert.equal(
      shouldRecheckOnVisibility({ ...base, lastCheckAt: 97_000 }),
      true
    )
  })

  it("the page listens to visibilitychange, re-reads /me and clears the dismissals", () => {
    assert.ok(
      page.includes('document.addEventListener("visibilitychange", onVisible)')
    )
    assert.ok(
      page.includes(
        'document.removeEventListener("visibilitychange", onVisible)'
      )
    )
    const recheck = between(
      page,
      "const recheckCheckIn",
      "// Opens the modal for the due occurrence"
    )
    assert.ok(recheck.includes("readTravelSummary(true)"))
    const read = between(
      page,
      "const readTravelSummary",
      "const recheckCheckIn"
    )
    assert.ok(read.includes("checkInDismissalsRef.current.clear()"))
    assert.ok(read.includes("setTravelSummary(next)"))
  })

  const fakeClock = () => {
    let nowMs = Date.parse("2026-10-21T12:00:00.000Z")
    const timers: Array<{
      id: number
      ms: number
      cb: () => void
      live: boolean
    }> = []
    return {
      now: () => nowMs,
      advance: (ms: number) => void (nowMs += ms),
      setTimer: (cb: () => void, ms: number) => {
        const t = { id: timers.length, ms, cb, live: true }
        timers.push(t)
        return t
      },
      clearTimer: (h: unknown) => void ((h as { live: boolean }).live = false),
      live: () => timers.filter((t) => t.live),
      fire: (t: { cb: () => void; live: boolean }) => {
        t.live = false
        t.cb()
      },
    }
  }
  const due = (over: Record<string, unknown> = {}) =>
    summary({ travelReminderDue: false, ...over })

  it("one timer for the future availableAt, and firing it re-checks once", () => {
    const clock = fakeClock()
    let fired = 0
    const timer = createCheckInTimer({
      onFire: () => void (fired += 1),
      ...clock,
    })
    const at = new Date(clock.now() + 3 * 60_000).toISOString()
    timer.update(due({ travelReminderAvailableAt: at }))
    assert.equal(clock.live().length, 1)
    assert.equal(clock.live()[0].ms, 3 * 60_000)
    clock.fire(clock.live()[0])
    assert.equal(fired, 1)
  })

  it("update() replaces the timer; dispose() clears it; nothing fires afterwards", () => {
    const clock = fakeClock()
    let fired = 0
    const timer = createCheckInTimer({
      onFire: () => void (fired += 1),
      ...clock,
    })
    timer.update(
      due({
        travelReminderAvailableAt: new Date(clock.now() + 60_000).toISOString(),
      })
    )
    const first = clock.live()[0]
    timer.update(
      due({
        travelReminderAvailableAt: new Date(
          clock.now() + 120_000
        ).toISOString(),
      })
    )
    assert.equal(first.live, false)
    assert.equal(clock.live().length, 1)
    timer.dispose()
    assert.equal(clock.live().length, 0)
    timer.update(
      due({
        travelReminderAvailableAt: new Date(clock.now() + 60_000).toISOString(),
      })
    )
    assert.equal(clock.live().length, 0)
    assert.equal(fired, 0)
  })

  it("no timer when the check-in is already due (the modal owns it), when nothing is scheduled, or after expiry", () => {
    const clock = fakeClock()
    const timer = createCheckInTimer({ onFire: () => undefined, ...clock })
    for (const s of [
      summary(),
      due({ travelReminderAvailableAt: null }),
      due({ travelModeExpired: true }),
      null,
    ]) {
      timer.update(s)
      assert.equal(clock.live().length, 0)
    }
  })

  it("a far-off occurrence is waited for in steps no longer than setTimeout allows", () => {
    const clock = fakeClock()
    let fired = 0
    const timer = createCheckInTimer({
      onFire: () => void (fired += 1),
      ...clock,
    })
    timer.update(
      due({
        travelReminderAvailableAt: new Date(
          clock.now() + 40 * 24 * 60 * 60_000
        ).toISOString(),
      })
    )
    assert.equal(clock.live()[0].ms, MAX_TIMER_MS)
    clock.advance(MAX_TIMER_MS)
    clock.fire(clock.live()[0])
    assert.equal(fired, 0, "it re-arms instead of re-checking early")
    assert.equal(clock.live().length, 1)
  })

  it("a skewed clock cannot loop: later tries wait at least MIN_RETRY_DELAY_MS and stop after MAX_EARLY_RETRIES", () => {
    const clock = fakeClock()
    const retries = new Map<string, number>()
    let fired = 0
    const at = new Date(clock.now() - 1000).toISOString() // the browser thinks it passed, /me says not yet
    const run = () => {
      const timer = createCheckInTimer({
        onFire: () => void (fired += 1),
        retries,
        ...clock,
      })
      timer.update(due({ travelReminderAvailableAt: at }))
      return clock.live()[0]
    }
    const first = run()
    assert.equal(first.ms, 0)
    clock.fire(first)
    for (let i = 1; i < MAX_EARLY_RETRIES; i += 1) {
      const next = run()
      assert.ok(next.ms >= MIN_RETRY_DELAY_MS)
      clock.fire(next)
    }
    assert.equal(fired, MAX_EARLY_RETRIES)
    assert.equal(run(), undefined, "no further timer for that occurrence")
  })

  it("the page builds the timer from the whole summary, shares the retry memory, and cleans it up", () => {
    const effect = between(
      page,
      "const timer = createCheckInTimer({",
      "// A tab that becomes visible"
    )
    assert.ok(effect.includes("retries: checkInRetriesRef.current"))
    assert.ok(effect.includes("timer.update(travelSummary)"))
    assert.ok(effect.includes("return () => timer.dispose()"))
    assert.ok(effect.includes("void recheckCheckIn()"))
  })

  it("the new check-in does not use POST travel-reminder/claim", () => {
    assert.ok(!page.includes("claimTravelReminder"))
    assert.ok(!page.includes("createTravelReminderScheduler"))
    assert.ok(
      !read("src", "lib", "api", "travel-check-in.ts").includes("claim")
    )
  })
})

describe("priority: the check-in goes before the traveler location prompt and the small alert", () => {
  const traveler = (over: Record<string, unknown> = {}) =>
    summary({ travelModeLocationMismatch: true, ...over })
  const memory = () => {
    const map = new Map<string, string>()
    return {
      length: 0,
      key: () => null,
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    }
  }

  it("while the check-in is due or open it has priority; dismissed-but-due still does; resolved it does not", () => {
    assert.equal(checkInHasPriority(summary(), false), true) // due
    assert.equal(
      checkInHasPriority(summary({ travelReminderDue: false }), true),
      true
    ) // open
    assert.equal(checkInHasPriority(summary(), false), true) // closed (dismissed) but still due
    assert.equal(
      checkInHasPriority(summary({ travelReminderDue: false }), false),
      false
    ) // resolved
    assert.equal(checkInHasPriority(null, false), false)
  })

  it("after it is resolved the pending traveler prompt is evaluated again and opens", () => {
    const storage = memory()
    const handled = createTravelerPromptHandled()
    const open = (s: ReturnType<typeof traveler>) =>
      !checkInHasPriority(s, false) &&
      shouldOpenTravelerPrompt({ summary: s, storage, handled })
    assert.equal(open(traveler()), false, "held back while the check-in is due")
    assert.equal(
      open(traveler({ travelReminderDue: false })),
      true,
      "offered once it is resolved"
    )
  })

  it("the page closes the traveler prompt and skips its check while the check-in has priority", () => {
    const effect = between(
      page,
      "if (checkInHasPriorityNow) {",
      "}, [travelSummary, checkInHasPriorityNow])"
    )
    assert.ok(effect.includes("setTravelerPromptOpen(false)"))
    assert.ok(
      effect.indexOf("return") < effect.indexOf("shouldOpenTravelerPrompt({")
    )
    assert.ok(
      page.includes("}, [travelSummary, checkInHasPriorityNow])"),
      "re-evaluated when the check-in is resolved"
    )
  })

  it("the location-mismatch dialog is not rendered while the check-in has priority", () => {
    assert.ok(page.includes("{!checkInHasPriorityNow && ("))
    const wrapped = between(page, "{!checkInHasPriorityNow && (", "      )}\n")
    assert.ok(
      wrapped.includes("open={locationMismatchOpen || travelerPromptOpen}")
    )
  })

  it("the small Travel Mode alert is suppressed while the check-in is due or open", () => {
    assert.match(
      page,
      /open=\{travelPopup !== null && !checkInHasPriorityNow\}/
    )
  })

  it("the check-in modal itself ignores every other dialog's priority except a flow already on screen", () => {
    const effect = between(
      page,
      "const next = checkInToShow({",
      "}, [travelSummary, checkInScopeKey, identityFlowOpen])"
    )
    assert.ok(effect.includes("busy: identityFlowOpen"))
  })
})

describe("home-country transition: the existing PMCM-650 flow, no new location or map flow", () => {
  it("'Update my home country' detects the location and opens the existing change-country flow", () => {
    const handler = between(
      page,
      "const handleCheckInUpdateHomeCountry",
      "return (\n    <>"
    )
    assert.ok(handler.includes("await startChangeHomeCountry()"))
    assert.ok(
      handler.includes('openFlowFromMismatch(launch, "change-country")')
    )
    assert.ok(
      !/recordTravel|confirmHomeCountry|startFreeKyc|startHomeCountryChange|IdentityVerificationAPI/.test(
        handler
      )
    )
  })

  it("the check-in stays due until the flow really starts: it is only kept from reopening while the flow is on screen", () => {
    const handler = between(
      page,
      "const handleCheckInUpdateHomeCountry",
      "return (\n    <>"
    )
    assert.ok(
      handler.includes(
        "checkInDismissalsRef.current.dismiss(checkInScopeKey, checkIn.occurrence)"
      )
    )
    assert.ok(
      handler.indexOf("await startChangeHomeCountry()") <
        handler.indexOf("setCheckIn(null)")
    )
  })

  it("a failed start keeps the modal open to try again", () => {
    const handler = between(
      page,
      "const handleCheckInUpdateHomeCountry",
      "return (\n    <>"
    )
    assert.match(
      handler,
      /catch \(error\) \{[\s\S]*stays open[\s\S]*console\.error\(/
    )
  })

  it("no map, location or document screen is built on the dashboard for it", () => {
    const dialog = between(
      page,
      "<Dialog\n        open={checkIn !== null}",
      "{/* Not rendered while the check-in is due or open"
    )
    assert.ok(!/Map|latitude|detectedLocation|GoogleMap|Leaflet/.test(dialog))
  })
})

describe("account and session isolation", () => {
  it("a close under one account or login never hides the same occurrence under another", () => {
    const dismissals = createCheckInDismissals()
    const a = checkInScope("user-1", KEY_A)
    dismissals.dismiss(a, AT)
    assert.equal(
      checkInToShow({ summary: summary(), scope: a, dismissals }),
      null
    )
    assert.equal(
      checkInToShow({
        summary: summary({ loginSessionKey: KEY_B }),
        scope: checkInScope("user-1", KEY_B),
        dismissals,
      }),
      AT,
      "a new login"
    )
    assert.equal(
      checkInToShow({
        summary: summary(),
        scope: checkInScope("user-2", KEY_A),
        dismissals,
      }),
      AT,
      "another account"
    )
    assert.notEqual(checkInScope("user-1", null), checkInScope("user-1", KEY_A))
    assert.notEqual(
      checkInScope(undefined, KEY_A),
      checkInScope("user-1", KEY_A)
    )
  })

  it("the scope separator cannot be forged by account or login values", () => {
    assert.notEqual(
      checkInScope("a", "b" + "\u0000" + "c"),
      checkInScope("a" + "\u0000" + "b", "c")
    )
  })

  it("nothing about the check-in is persisted: no localStorage or sessionStorage", () => {
    const source = read("src", "lib", "api", "travel-check-in.ts")
    assert.ok(!/localStorage|sessionStorage|document\.cookie/.test(source))
  })

  it("the page forgets the check-in when another account takes over the mounted page", () => {
    const effect = between(page, "const checkInUserRef", "// Closing the popup")
    assert.ok(effect.includes("checkInDismissalsRef.current.clear()"))
    assert.ok(effect.includes("setCheckIn(null)"))
    assert.ok(effect.includes("setTravelSummary(null)"))
    assert.ok(
      page.includes("user?.id,\n    travelSummary?.loginSessionKey ?? null")
    )
  })
})

describe("the two new UI states are composed from design-system parts only", () => {
  const dialog = between(
    page,
    "<Dialog\n        open={checkIn !== null}",
    "{/* Not rendered while the check-in is due or open"
  )

  it("no raw controls", () => {
    assert.ok(!/<(button|input|textarea|select|dialog|label)\b/.test(dialog))
  })

  it("the prompt: warning icon, title, supporting text and the two actions in order", () => {
    assert.ok(dialog.includes('className="w-[405px] pt-[50px]"'))
    assert.ok(dialog.includes("{CHECK_IN_COPY.prompt.title}"))
    assert.ok(
      dialog.indexOf("CHECK_IN_COPY.prompt.stillTraveling") <
        dialog.indexOf("CHECK_IN_COPY.prompt.updateHomeCountry")
    )
    assert.match(dialog, /variant="outlined"\s+visual="gray"\s+size="md"/)
    assert.match(dialog, /variant="light"\s+size="md"/)
  })

  it("'I’m still traveling' only moves to the duration question; nothing is sent", () => {
    const handler = between(
      page,
      "const handleCheckInStillTraveling",
      "const handleCheckInBack"
    )
    assert.ok(
      !/IdentityVerificationAPI|answerCheckIn|await|fetch/.test(handler)
    )
    assert.ok(handler.includes('phase: "duration"'))
  })

  it("the duration question: back, X, title and body by answer count, four options, the reminder alert and Skip", () => {
    assert.ok(dialog.includes("durationCopyFor(checkIn.answerCount).title"))
    assert.ok(dialog.includes("durationCopyFor(checkIn.answerCount).body"))
    assert.ok(dialog.includes("CHECK_IN_DURATION_LABELS.map("))
    assert.ok(dialog.includes("onClick={handleCheckInBack}"))
    assert.ok(dialog.includes("durationCopyFor(checkIn.answerCount).alert"))
  })
})

describe("Storybook: the two supplied states have stories that share the dashboard's copy", () => {
  const stories = read("stories", "identity-verification-check-in.stories.tsx")

  it("exports the check-in and the 'asked before' duration screen", () => {
    assert.ok(stories.includes('title: "Identity Verification Check-In"'))
    assert.ok(stories.includes("export const CheckIn = "))
    assert.ok(stories.includes("export const DurationAskedBefore = "))
  })

  it("uses the same copy module and design-system parts as the page, and no raw controls", () => {
    assert.ok(stories.includes('from "@/src/lib/api/travel-check-in"'))
    assert.ok(stories.includes("durationCopyFor(1)"))
    assert.ok(stories.includes("{copy.alert}"))
    assert.ok(stories.includes("CHECK_IN_COPY.prompt.updateHomeCountry"))
    assert.ok(!/<(button|input|textarea|select|dialog|label)\b/.test(stories))
  })
})
