// Run like travel-check-in.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { parseIdentityVerificationSummary } from "./identity-verification-state"
import {
  CHECK_IN_COPY,
  answerCheckIn,
  checkInHasPriority,
  shouldShowCheckInConfirmation,
} from "./travel-check-in"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = read("app", "(group)", "talent-dashboard", "page.tsx")
const story = read("stories", "identity-verfication.stories.tsx")
const between = (source: string, from: string, to: string) => {
  const start = source.indexOf(from)
  assert.ok(start >= 0, `missing: ${from}`)
  return source.slice(start, source.indexOf(to, start))
}

const AT = "2026-10-21T12:00:00.000Z"
const due = (over: Record<string, unknown> = {}) =>
  parseIdentityVerificationSummary({
    nextAction: "none",
    travelModeEndsAt: "2026-11-21T12:00:00.000Z",
    travelModeExpired: false,
    travelReminderDue: true,
    travelReminderAvailableAt: AT,
    loginSessionKey: "a".repeat(64),
    ...over,
  })
const httpError = (status: number, code?: string) =>
  Object.assign(new Error(`HTTP ${status}`), {
    response: { status, data: code ? { code } : {} },
  })
const answer = (post: () => Promise<unknown>) =>
  answerCheckIn({ post }, "1–2 weeks", AT)

describe("the confirmation copy is the Storybook TravelMode copy", () => {
  it("title, body, information box and button", () => {
    assert.equal(CHECK_IN_COPY.confirmation.title, "Travel Mode is now active!")
    assert.equal(
      CHECK_IN_COPY.confirmation.body,
      "You’re marked as temporarily traveling. You can now use the platform without restrictions."
    )
    assert.equal(
      CHECK_IN_COPY.confirmation.alert,
      "You’ll remain in Travel Mode until you return to your home country or update your location."
    )
    assert.equal(CHECK_IN_COPY.confirmation.done, "Done")
  })

  it("the story still says the same thing (copy is not drifting)", () => {
    const flat = story.replace(/\s+/g, " ")
    assert.ok(flat.includes(CHECK_IN_COPY.confirmation.title))
    assert.ok(flat.includes(CHECK_IN_COPY.confirmation.body))
    assert.ok(flat.includes(CHECK_IN_COPY.confirmation.alert))
  })
})

describe("a saved answer (200) shows it after the first, second and third check-in", () => {
  for (const [n, count] of [
    ["first", 0],
    ["second", 1],
    ["third", 2],
  ] as const) {
    it(`${n} check-in (travelCheckInCount ${count})`, async () => {
      const calls: unknown[] = []
      const outcome = await answerCheckIn(
        {
          post: async (duration, at) => {
            calls.push([duration, at])
            return { status: 200 }
          },
        },
        "A few days",
        due(count ? { travelCheckInCount: count } : {})?.travelReminderAvailableAt ?? null
      )
      assert.equal(calls.length, 1)
      assert.equal(outcome, "saved")
      assert.equal(shouldShowCheckInConfirmation(outcome), true)
    })
  }

  it("every duration answer, 'Not sure' included, shows it", async () => {
    for (const label of ["A few days", "1–2 weeks", "More than 2 weeks", "Not sure"]) {
      const outcome = await answerCheckIn(
        { post: async () => ({ status: 200 }) },
        label,
        AT
      )
      assert.equal(shouldShowCheckInConfirmation(outcome), true, label)
    }
  })
})

describe("it is never shown without a saved answer", () => {
  it("a failed request (network or 500) does not show it", async () => {
    for (const err of [new Error("Network Error"), httpError(500)]) {
      const outcome = await answer(async () => Promise.reject(err))
      assert.equal(outcome, "failed")
      assert.equal(shouldShowCheckInConfirmation(outcome), false)
    }
  })

  it("409 does not show it (already answered, not active, or a home-country change)", async () => {
    for (const code of [
      "TRAVEL_CHECK_IN_ALREADY_ANSWERED",
      "TRAVEL_MODE_NOT_ACTIVE",
      "HOME_COUNTRY_CHANGE_IN_PROGRESS",
    ]) {
      const outcome = await answer(async () => Promise.reject(httpError(409, code)))
      assert.notEqual(outcome, "saved")
      assert.equal(shouldShowCheckInConfirmation(outcome), false, code)
    }
  })

  it("an unknown label or a missing occurrence sends nothing and shows nothing", async () => {
    let sent = 0
    const post = async () => void sent++
    for (const outcome of [
      await answerCheckIn({ post }, "Whenever", AT),
      await answerCheckIn({ post }, "A few days", null),
    ]) {
      assert.equal(shouldShowCheckInConfirmation(outcome), false)
    }
    assert.equal(sent, 0)
  })

  it("Skip, X / outside close and 'Update my home country' never open it", () => {
    const dismiss = between(page, "const handleCheckInDismiss", "// \"I'm still traveling\"")
    const update = between(
      page,
      "const handleCheckInUpdateHomeCountry",
      "return (\n    <>"
    )
    for (const handler of [dismiss, update]) {
      assert.ok(!handler.includes("setCheckInConfirmationOpen"))
    }
  })

  it("the page opens it in exactly one place: when the outcome is saved", () => {
    const opens =
      page.match(/setCheckInConfirmation\(showCheckInConfirmation\(/g) ?? []
    assert.equal(opens.length, 1)
    assert.ok(
      page.includes(
        'if (outcome === "saved") {\n          setCheckInConfirmation(showCheckInConfirmation(label, checkIn.answerCount))'
      )
    )
  })

  it("a refresh never shows it again: memory only, no storage, not derived from /me", () => {
    const state = between(
      page,
      "const [checkInConfirmation,",
      "const checkInHasPriorityNow"
    )
    assert.ok(state.includes("useState<CheckInConfirmation | null>(null)"))
    assert.ok(!/localStorage|sessionStorage/.test(state))
    const close = between(
      page,
      "const handleCheckInConfirmationClose",
      "// Back toggles"
    )
    assert.ok(!/localStorage|sessionStorage|document\.cookie/.test(close))
  })
})

describe("while it is open, the small alert and the mismatch popup stay suppressed", () => {
  it("it holds the check-in's priority even though /me no longer calls it due", () => {
    const answered = due({ travelReminderDue: false })
    assert.equal(checkInHasPriority(answered, false), false)
    assert.equal(checkInHasPriority(answered, true), true)
    assert.ok(page.includes("checkIn !== null || checkInConfirmation !== null"))
  })

  it("the mismatch popup and the small alert are both gated on that priority", () => {
    assert.ok(page.includes("{!checkInHasPriorityNow && ("))
    assert.ok(
      page.includes("open={travelPopup !== null && !checkInHasPriorityNow}")
    )
  })

  it("it opens in the same batch that closes the question, before /me is re-read", () => {
    const answerHandler = between(
      page,
      "const outcome = await answerCheckIn(",
      "checkInSavingRef.current = false"
    )
    const open = answerHandler.indexOf("setCheckInConfirmation(showCheckInConfirmation(")
    assert.ok(open > 0)
    assert.ok(open < answerHandler.indexOf("setCheckIn(null)"))
    assert.ok(open < answerHandler.indexOf("await readTravelSummary(false)"))
  })
})

describe("Done and X close it, then a pending mismatch is evaluated again", () => {
  const dialog = between(
    page,
    "open={checkInConfirmation !== null}",
    "{/* Not rendered while the check-in is due or open"
  )

  it("Done, X and the dialog's own close share one handler (on both screens)", () => {
    assert.ok(dialog.includes("{CHECK_IN_COPY.confirmation.done}"))
    assert.match(dialog, /if \(!open\) handleCheckInConfirmationClose\(\)/)
    // confirmation: X + Done; duration screen: X + Skip
    assert.equal(
      (dialog.match(/onClick=\{handleCheckInConfirmationClose\}/g) ?? []).length,
      4
    )
    // the two back arrows never close
    assert.equal(
      (dialog.match(/onClick=\{handleCheckInConfirmationBack\}/g) ?? []).length,
      2
    )
  })

  it("closing releases the priority and re-evaluates the location mismatch", () => {
    const close = between(
      page,
      "const handleCheckInConfirmationClose",
      "// Back toggles"
    )
    assert.ok(close.includes("setCheckInConfirmation(null)"))
    assert.ok(
      close.includes(
        "setLocationMismatchOpen(shouldShowLocationMismatchPrompt(travelSummary))"
      )
    )
  })

  it("built from design-system parts only, no raw controls", () => {
    assert.ok(!/<(button|input|textarea|select|dialog|label)\b/.test(dialog))
    assert.ok(dialog.includes("<Alert"))
    assert.ok(dialog.includes("<DialogContent"))
  })
})
