// Run like travel-check-in.test.ts (from the frontend/ directory).
// The confirmation's Back: return to the duration screen with the saved option selected, edit
// the same answer (no extra check-in counted), and show the confirmation again.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  type CheckInConfirmation,
  applyCheckInRevision,
  confirmationBack,
  reviseCheckIn,
  showCheckInConfirmation,
} from "./travel-check-in"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = read("app", "(group)", "talent-dashboard", "page.tsx")
const http = read("service", "http", "identity-verification.ts")
const stories = read("stories", "identity-verification-check-in.stories.tsx")
const between = (source: string, from: string, to: string) => {
  const start = source.indexOf(from)
  assert.ok(start >= 0, `missing: ${from}`)
  return source.slice(start, source.indexOf(to, start))
}
const failWith = (status: number, code?: string) => ({
  post: async () => {
    throw { response: { status, data: code ? { code } : {} } }
  },
})

const saved = (): CheckInConfirmation => {
  const flow = showCheckInConfirmation("1–2 weeks", 2)
  assert.ok(flow)
  return flow
}

describe("the flow starts on the confirmation with the saved duration", () => {
  it("remembers the saved option and the copy count, on the confirmation screen", () => {
    assert.deepEqual(saved(), {
      saved: "1–2 weeks",
      answerCount: 2,
      screen: "confirmation",
    })
  })

  it("an unknown label opens nothing", () => {
    assert.equal(showCheckInConfirmation("Whenever", 1), null)
  })
})

describe("Back returns to the duration screen; it never closes the flow", () => {
  it("confirmation → duration screen, with the saved option still the saved one", () => {
    const back = confirmationBack(saved())
    assert.equal(back.screen, "revise")
    assert.equal(back.saved, "1–2 weeks")
    assert.equal(back.answerCount, 2)
  })

  it("Back on the duration screen returns to the confirmation", () => {
    assert.equal(confirmationBack(confirmationBack(saved())).screen, "confirmation")
  })

  it("the page's Back handler only toggles the screen and sends nothing", () => {
    const handler = between(
      page,
      "const handleCheckInConfirmationBack",
      "// A different duration chosen"
    )
    assert.ok(handler.includes("confirmationBack(current)"))
    assert.ok(!/IdentityVerificationAPI|fetch|await|setCheckInConfirmation\(null\)/.test(handler))
  })
})

describe("the saved option is preselected on the duration screen", () => {
  it("the radio group's value is the saved duration unless a new choice is being saved", () => {
    const screen = between(page, 'checkInConfirmation?.screen === "revise"', "</DialogContent>")
    assert.ok(screen.includes("value={checkInSelected ?? checkInConfirmation.saved}"))
    assert.ok(screen.includes("durationCopyFor(checkInConfirmation.answerCount)"))
  })

  it("the same four options and the same later-check-in copy and full-width Skip, no Confirm", () => {
    const screen = between(page, 'checkInConfirmation?.screen === "revise"', "</DialogContent>")
    assert.ok(screen.includes("CHECK_IN_DURATION_LABELS.map("))
    assert.ok(screen.includes('<div className="mt-6 grid">'))
    assert.ok(screen.includes("{CHECK_IN_COPY.skip}"))
    assert.ok(!/>\s*Confirm\s*</.test(screen))
  })

  it("choosing the option that is already saved sends nothing", () => {
    const handler = between(
      page,
      "const handleCheckInRevise",
      "const outcome = await reviseCheckIn("
    )
    assert.ok(handler.includes("if (label === checkInConfirmation.saved) return"))
  })

  it("the story preselects it too", () => {
    const story = between(stories, "export const TravelModeActive", "</Dialog>\n    </>")
    assert.ok(story.includes("value={flow.saved}"))
    assert.ok(story.includes("{CHECK_IN_DURATION_LABELS.map((label, index) => ("))
    assert.ok(story.includes("setFlow(confirmationBack(flow))")) // Back never closes
  })
})

describe("changing the option saves a revision, not a new check-in", () => {
  it("posts the new duration and NO checkInAt", async () => {
    const calls: unknown[][] = []
    const outcome = await reviseCheckIn(
      {
        post: async (...args: unknown[]) => {
          calls.push(args)
        },
      },
      "More than 2 weeks"
    )
    assert.equal(outcome, "saved")
    assert.deepEqual(calls, [["more_than_two_weeks"]])
  })

  it("the HTTP client's revision posts exactly { duration } to the same update endpoint", () => {
    assert.match(
      http,
      /reviseActiveTravelDuration:[\s\S]*?AxiosRequest\.post\("\/v1\/identity-verification\/travel-duration\/update", \{\s*duration,\s*\}\)/
    )
    assert.ok(!/reviseActiveTravelDuration:[\s\S]{0,400}checkInAt,/.test(http))
  })

  it("an unknown label sends nothing", async () => {
    let sent = 0
    const outcome = await reviseCheckIn({ post: async () => void sent++ }, "Whenever")
    assert.equal(outcome, "failed")
    assert.equal(sent, 0)
  })

  it("saved: the new duration becomes the saved one and the confirmation is shown again", () => {
    const next = applyCheckInRevision(confirmationBack(saved()), "Not sure", "saved")
    assert.deepEqual(next, {
      saved: "Not sure",
      answerCount: 2,
      screen: "confirmation",
    })
  })

  it("the count is not touched: the revision path never records an answer or an occurrence", () => {
    const handler = between(page, "const handleCheckInRevise", "// \"Update my home country\"")
    assert.ok(!/answerCheckIn|recordCheckInAnswerOutcome|markAnswered|checkInDismissalsRef/.test(handler))
    assert.ok(handler.includes("reviseCheckIn("))
    assert.ok(handler.includes("IdentityVerificationAPI.reviseActiveTravelDuration(duration)"))
    // the copy count the screens use stays what it was
    assert.equal(
      applyCheckInRevision(confirmationBack(saved()), "Not sure", "saved")?.answerCount,
      2
    )
  })

  it("after a saved revision /me is read again, so the restarted schedule is what the page holds", () => {
    const handler = between(page, "const handleCheckInRevise", "// \"Update my home country\"")
    assert.ok(handler.includes("await readTravelSummary(false)"))
  })
})

describe("a failed revision stays on the duration screen", () => {
  for (const [name, error] of [
    ["a network error", { post: async () => Promise.reject(new Error("Network Error")) }],
    ["a server error", failWith(500)],
  ] as const) {
    it(`${name}: nothing changes and the saved option stays selected`, async () => {
      const outcome = await reviseCheckIn(error, "Not sure")
      assert.equal(outcome, "failed")
      const flow = confirmationBack(saved())
      const next = applyCheckInRevision(flow, "Not sure", outcome)
      assert.equal(next, flow)
      assert.equal(next?.screen, "revise")
      assert.equal(next?.saved, "1–2 weeks")
    })
  }

  it("the page puts the selection back (value falls back to the saved option) and does not re-read /me", () => {
    const handler = between(page, "const handleCheckInRevise", "// \"Update my home country\"")
    assert.ok(handler.includes("setCheckInSelected(undefined)"))
    assert.ok(handler.includes('} else if (outcome !== "failed") {'))
  })

  it("an edit the server no longer takes (409: ended, lost a race, home-country change) ends the flow and reads /me", async () => {
    for (const code of [
      "TRAVEL_CHECK_IN_ALREADY_ANSWERED",
      "TRAVEL_MODE_NOT_ACTIVE",
      "HOME_COUNTRY_CHANGE_IN_PROGRESS",
    ]) {
      const outcome = await reviseCheckIn(failWith(409, code), "Not sure")
      assert.notEqual(outcome, "saved")
      assert.notEqual(outcome, "failed")
      assert.equal(applyCheckInRevision(confirmationBack(saved()), "Not sure", outcome), null)
    }
  })
})

describe("every submission is guarded: one request at a time, all options disabled meanwhile", () => {
  it("the revise handler refuses a second call while one is in flight", () => {
    const handler = between(
      page,
      "const handleCheckInRevise",
      "const outcome = await reviseCheckIn("
    )
    assert.ok(handler.includes("if (!checkInConfirmation || checkInSavingRef.current) return"))
    assert.ok(handler.includes("checkInSavingRef.current = true"))
  })

  it("the options, Skip and Back are disabled while saving", () => {
    const screen = between(page, 'checkInConfirmation?.screen === "revise"', "</DialogContent>")
    assert.ok(screen.includes("disabled={checkInSaving}"))
    assert.ok((screen.match(/disabled=\{checkInSaving\}/g) ?? []).length >= 3) // Back, group, Skip
  })
})

describe("Done, X, Skip: the whole flow closes and the saved duration stays", () => {
  it("Skip and X on the duration screen use the close handler, which sends nothing", () => {
    const screen = between(page, 'checkInConfirmation?.screen === "revise"', "</DialogContent>")
    assert.equal(
      (screen.match(/onClick=\{handleCheckInConfirmationClose\}/g) ?? []).length,
      2 // X and Skip
    )
    const close = between(
      page,
      "const handleCheckInConfirmationClose",
      "// Back toggles"
    )
    assert.ok(!/IdentityVerificationAPI|reviseCheckIn|answerCheckIn|fetch|await/.test(close))
    assert.ok(close.includes("setCheckInConfirmation(null)"))
  })

  it("Back → Skip: the flow only held the saved duration, and closing sends nothing, so the server keeps it", () => {
    const flow = confirmationBack(saved()) // Back
    assert.equal(flow.screen, "revise")
    assert.equal(flow.saved, "1–2 weeks") // unchanged until a revision is saved
  })

  it("the small alert and the location-mismatch popup stay suppressed through every screen of the flow", () => {
    assert.ok(page.includes("checkIn !== null || checkInConfirmation !== null"))
    assert.ok(page.includes("{!checkInHasPriorityNow && ("))
  })
})
