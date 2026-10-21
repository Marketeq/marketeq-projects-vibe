// Run like detected-location.test.ts (from the frontend/ directory).
//
// PMCM-650, frontend: the "still traveling?" prompt for an active traveler, the
// home-country change started after the detected-location confirmation, and the
// pending result. Two kinds of test, kept apart on purpose:
//   - RUNTIME: the pure rules and the confirm-then-start sequence are executed.
//   - SOURCE-PINNED: the dashboard page cannot be rendered here, so its wiring and
//     copy are asserted against the page source. These prove what is written, not how
//     it behaves in a browser.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { type FreeKycDeps, confirmHomeCountryAndStartFreeKyc } from "./free-kyc"
import {
  parseIdentityVerificationSummary,
  shouldShowPendingModal,
  shouldShowSuccessModal,
} from "./identity-verification-state"
import {
  shouldShowLocationMismatchPrompt,
  shouldShowTravelerLocationPrompt,
  startChangeHomeCountry,
} from "./location-mismatch"
import type { DismissalStorage } from "./travel-expiry-popup"
import {
  TRAVEL_LOCATION_PROMPT_SHOWN_PREFIX,
  markTravelerPromptShown,
  shouldOfferTravelerPrompt,
  travelLocationPromptKey,
} from "./travel-location-prompt"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = read("app", "(group)", "talent-dashboard", "page.tsx")
const flow = read("components", "identity-verification-flow.tsx")
const http = read("service", "http", "identity-verification.ts")

const summary = (body: Record<string, unknown> = {}) =>
  parseIdentityVerificationSummary({ nextAction: "complete", ...body })

class FakeStorage implements DismissalStorage {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null
  }
  getItem(k: string) {
    return this.map.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.map.set(k, v)
  }
  removeItem(k: string) {
    this.map.delete(k)
  }
}

// ---------------------------------------------------------------------------
describe("RUNTIME: the traveler signal from GET /me", () => {
  it("is passed through exactly as sent; absent or non-boolean is null (never inferred)", () => {
    assert.equal(
      summary({ travelModeLocationMismatch: true })?.travelModeLocationMismatch,
      true
    )
    assert.equal(
      summary({ travelModeLocationMismatch: false })
        ?.travelModeLocationMismatch,
      false
    )
    assert.equal(summary({})?.travelModeLocationMismatch, null)
    assert.equal(
      summary({ travelModeLocationMismatch: "true" })
        ?.travelModeLocationMismatch,
      null
    )
  })

  it("offers the traveler prompt only when the backend says so", () => {
    assert.equal(
      shouldShowTravelerLocationPrompt(
        summary({ travelModeLocationMismatch: true })
      ),
      true
    )
    assert.equal(
      shouldShowTravelerLocationPrompt(
        summary({ travelModeLocationMismatch: false })
      ),
      false
    )
    assert.equal(shouldShowTravelerLocationPrompt(summary({})), false)
    assert.equal(shouldShowTravelerLocationPrompt(null), false)
  })

  it("is not offered over a verification surface that owns the screen (retry wait)", () => {
    const waiting = summary({
      nextAction: "wait_for_retry",
      retryAvailableAt: "2026-10-21T00:00:00.000Z",
      travelModeLocationMismatch: true,
    })
    assert.equal(shouldShowTravelerLocationPrompt(waiting), false)
  })

  it("the returning-user prompt is a separate signal: a traveler signal never opens it, and vice versa", () => {
    assert.equal(
      shouldShowLocationMismatchPrompt(
        summary({ travelModeLocationMismatch: true })
      ),
      false
    )
    assert.equal(
      shouldShowTravelerLocationPrompt(summary({ locationMismatch: true })),
      false
    )
  })
})

// ---------------------------------------------------------------------------
describe("RUNTIME: the prompt is offered once per login", () => {
  // Opaque keys, as GET /me returns them (a one-way digest, never the session id).
  const KEY_1 = "a".repeat(64)
  const KEY_2 = "b".repeat(64)
  const travelerOf = (loginSessionKey?: string) =>
    summary({ travelModeLocationMismatch: true, ...(loginSessionKey ? { loginSessionKey } : {}) })

  it("a fresh login is offered the prompt, and marking it keeps a refresh in the same login quiet", () => {
    const storage = new FakeStorage()
    assert.equal(shouldOfferTravelerPrompt({ summary: travelerOf(KEY_1), storage }), true)
    markTravelerPromptShown(KEY_1, storage)
    assert.equal(shouldOfferTravelerPrompt({ summary: travelerOf(KEY_1), storage }), false)
  })

  it("a NEW login (a new key) is offered it again, and only one marker ever exists", () => {
    const storage = new FakeStorage()
    markTravelerPromptShown(KEY_1, storage)
    assert.equal(shouldOfferTravelerPrompt({ summary: travelerOf(KEY_2), storage }), true)
    markTravelerPromptShown(KEY_2, storage)
    assert.equal(storage.length, 1)
    assert.equal(storage.getItem(travelLocationPromptKey(KEY_2)), "1")
    assert.equal(storage.getItem(travelLocationPromptKey(KEY_1)), null)
  })

  it("never touches other keys (the expiry popup's marker is left alone)", () => {
    const storage = new FakeStorage()
    storage.setItem(`travelExpiryDismissed:${KEY_1}`, "1")
    markTravelerPromptShown(KEY_1, storage)
    assert.equal(storage.getItem(`travelExpiryDismissed:${KEY_1}`), "1")
    assert.ok(travelLocationPromptKey(KEY_1).startsWith(TRAVEL_LOCATION_PROMPT_SHOWN_PREFIX))
  })

  it("is not offered at all without the backend signal, whatever the login", () => {
    const storage = new FakeStorage()
    assert.equal(shouldOfferTravelerPrompt({ summary: summary({ loginSessionKey: KEY_1 }), storage }), false)
    assert.equal(shouldOfferTravelerPrompt({ summary: null, storage }), false)
  })

  it("without a key it is offered and nothing is persisted", () => {
    const storage = new FakeStorage()
    assert.equal(shouldOfferTravelerPrompt({ summary: travelerOf(), storage }), true)
    markTravelerPromptShown(null, storage)
    assert.equal(storage.length, 0)
  })

  it("an unavailable storage offers the prompt rather than hiding it, and never throws", () => {
    const broken: DismissalStorage = {
      length: 0,
      key: () => null,
      getItem: () => {
        throw new Error("blocked")
      },
      setItem: () => {
        throw new Error("blocked")
      },
      removeItem: () => undefined,
    }
    assert.equal(shouldOfferTravelerPrompt({ summary: travelerOf(KEY_1), storage: broken }), true)
    assert.doesNotThrow(() => markTravelerPromptShown(KEY_1, broken))
  })
})

// ---------------------------------------------------------------------------
describe("RUNTIME: after the detected-location confirmation the right session is started", () => {
  const DIDIT = "https://verify.didit.me/session/abc"

  const deps = (confirmation: unknown, over: Partial<FreeKycDeps> = {}) => {
    const calls: string[] = []
    const d: FreeKycDeps = {
      confirmHomeCountry: async () => {
        calls.push("confirm")
        return confirmation
      },
      startFreeKyc: async () => {
        calls.push("kyc-sessions")
        return { data: { url: DIDIT } }
      },
      startHomeCountryChange: async () => {
        calls.push("home-country-change")
        return { data: { url: DIDIT } }
      },
      redirect: (url) => void calls.push(`redirect:${url}`),
      markAwaitingResult: () => void calls.push("awaiting"),
      refreshIdentityStatus: async () => {
        calls.push("refresh")
        return "verified"
      },
      publishStatus: () => void calls.push("publish"),
      ...over,
    }
    return { d, calls }
  }

  it("a pending home country calls POST home-country-change, then redirects straight to Didit", async () => {
    const { d, calls } = deps({
      data: { pendingHomeCountry: "CA", verifiedHomeCountry: "US" },
    })
    const outcome = await confirmHomeCountryAndStartFreeKyc(d)

    assert.equal(outcome, "redirected")
    assert.deepEqual(calls, [
      "confirm",
      "home-country-change",
      "awaiting",
      `redirect:${DIDIT}`,
    ])
  })

  it("no pending home country (first-time verification) still calls the ordinary kyc-sessions, exactly as before", async () => {
    const { d, calls } = deps({ data: { verifiedHomeCountry: "US" } })
    assert.equal(await confirmHomeCountryAndStartFreeKyc(d), "redirected")
    assert.deepEqual(calls, [
      "confirm",
      "kyc-sessions",
      "awaiting",
      `redirect:${DIDIT}`,
    ])
  })

  // node:test has no table helper: the cases are listed explicitly.
  for (const [label, confirmation] of [
    ["an empty confirmation", undefined],
    ["a null body", { data: null }],
    ["a non-string pending value", { data: { pendingHomeCountry: 1 } }],
    ["an empty pending value", { data: { pendingHomeCountry: "" } }],
  ] as const) {
    it(`${label} is never treated as a home-country change`, async () => {
      const { d, calls } = deps(confirmation)
      await confirmHomeCountryAndStartFreeKyc(d)
      assert.deepEqual(calls.slice(0, 2), ["confirm", "kyc-sessions"])
      assert.ok(!calls.includes("home-country-change"))
    })
  }

  it("a URL that is not a Didit page is refused: no awaiting marker, no redirect", async () => {
    const { d, calls } = deps(
      { data: { pendingHomeCountry: "CA" } },
      {
        startHomeCountryChange: async () => ({
          data: { url: "https://evil.example.com/x" },
        }),
      }
    )
    assert.equal(await confirmHomeCountryAndStartFreeKyc(d), "failed")
    assert.ok(!calls.includes("awaiting"))
    assert.ok(!calls.some((c) => c.startsWith("redirect:")))
  })

  it("a refusal from the backend (not startable) re-reads the status instead of redirecting", async () => {
    const refusal = {
      response: {
        status: 409,
        data: { code: "IDENTITY_VERIFICATION_NOT_STARTABLE" },
      },
    }
    const { d, calls } = deps(
      { data: { pendingHomeCountry: "CA" } },
      {
        startHomeCountryChange: async () => {
          throw refusal
        },
      }
    )
    assert.equal(await confirmHomeCountryAndStartFreeKyc(d), "not_startable")
    assert.ok(calls.includes("refresh"))
    assert.ok(!calls.some((c) => c.startsWith("redirect:")))
  })

  it("any other failure stays on the current screen: no redirect and no awaiting marker", async () => {
    const original = console.error
    console.error = () => undefined
    try {
      const { d, calls } = deps(
        { data: { pendingHomeCountry: "CA" } },
        {
          startHomeCountryChange: async () => {
            throw {
              response: {
                status: 409,
                data: { code: "HOME_COUNTRY_CONFIRMATION_REQUIRED" },
              },
            }
          },
        }
      )
      assert.equal(await confirmHomeCountryAndStartFreeKyc(d), "failed")
      assert.ok(!calls.includes("awaiting"))
    } finally {
      console.error = original
    }
  })
})

// ---------------------------------------------------------------------------
describe("RUNTIME: 'Change my home country' opens the existing detected-location confirmation", () => {
  it("launches the flow from its first screen (the detected-location confirmation) without saving anything", async () => {
    const launch = await startChangeHomeCountry({
      getDetectedLocation: async () => ({ country: "CA" }) as never,
    })
    assert.equal(launch.initialState, undefined) // the flow's own first screen
  })
})

// ---------------------------------------------------------------------------
describe("RUNTIME: the pending and success results", () => {
  it("in review opens the pending modal and nothing else; complete still opens only the success modal", () => {
    const review = summary({ nextAction: "await_review" })
    assert.equal(shouldShowPendingModal(review), true)
    assert.equal(shouldShowSuccessModal(review), false)

    const done = summary({ nextAction: "complete" })
    assert.equal(shouldShowSuccessModal(done), true)
    assert.equal(shouldShowPendingModal(done), false)
  })

  it("every other state, an unknown value and an unreadable status show no pending modal", () => {
    for (const action of [
      "confirm_location",
      "start_identity",
      "continue_identity",
      "retry_identity",
      "wait_for_retry",
      "reverify_identity",
      "something_new",
    ]) {
      assert.equal(
        shouldShowPendingModal(summary({ nextAction: action })),
        false,
        action
      )
    }
    assert.equal(shouldShowPendingModal(null), false)
  })
})

// ---------------------------------------------------------------------------
describe("SOURCE-PINNED: the dashboard wiring and the approved copy", () => {
  const dialogStart = page.indexOf(
    "open={locationMismatchOpen || travelerPromptOpen}"
  )
  const dialog = page.slice(
    page.lastIndexOf("<Dialog", dialogStart),
    page.indexOf("</Dialog>", dialogStart)
  )

  it("one ChangeLocation dialog serves both prompts, with the approved copy and buttons in order", () => {
    assert.ok(dialogStart > 0)
    assert.ok(
      dialog.includes(
        "You’re logging in from a location outside your usual one. Just"
      )
    )
    assert.ok(dialog.includes("checking if you’re still away."))
    assert.ok(
      dialog.indexOf("I’m still traveling") <
        dialog.indexOf("Change my home country")
    )
    assert.ok(!page.includes("I’m currently traveling"))
  })

  it("'I’m still traveling' for a traveler only closes the prompt: no Travel Mode, duration or country change (at most it drops a claim with no live session)", () => {
    const handler = page.slice(
      page.indexOf("const handleTravelerStillTraveling"),
      page.indexOf("const handleChangeHomeCountry")
    )
    assert.ok(/setTravelerPromptOpen\(false\)/.test(handler))
    assert.ok(
      !/recordTravelDuration|confirmHomeCountry|startFreeKyc|startHomeCountryChange/.test(
        handler
      )
    )
    // The one request it may make is dropping a claim, and only when there is one.
    assert.ok(
      /if \(travelSummary\?\.pendingHomeCountry\) \{[\s\S]*recordTravelClassification\(\s*"temporarily_traveling"\s*\)/.test(
        handler
      )
    )
    assert.equal((handler.match(/IdentityVerificationAPI\./g) ?? []).length, 1)
    assert.match(
      dialog,
      /travelerPromptOpen\s*\?\s*void handleTravelerStillTraveling\(\)\s*:\s*void handleStillTraveling\(\)/
    )
  })

  it("'Change my home country' is the existing handler for both prompts and closes the traveler prompt", () => {
    assert.match(dialog, /void handleChangeHomeCountry\(\)/)
    const open = page.slice(
      page.indexOf("const openFlowFromMismatch"),
      page.indexOf("const handleStillTraveling")
    )
    assert.ok(open.includes("setTravelerPromptOpen(false)"))
    assert.ok(open.includes("setIdentityFlowOpen(true)"))
  })

  it("the traveler prompt is offered only through the per-login rule, and marked only when answered", () => {
    const effect = page.slice(
      page.indexOf("shouldOfferTravelerPrompt({"),
      page.indexOf("setTravelerPromptOpen(true)") + 40
    )
    assert.ok(effect.includes("summary: travelSummary"))
    assert.ok(!effect.includes("readSessionId"))
    assert.ok(!effect.includes("markTravelerPromptShown"), "opening marks nothing")
  })

  it("the pending modal uses the approved Storybook copy and a single Done button that only closes it", () => {
    const start = page.indexOf("open={pendingModalOpen}")
    const modal = page.slice(
      page.lastIndexOf("<Dialog", start),
      page.indexOf("</Dialog>", start)
    )
    assert.ok(modal.includes("Your verification has been submitted"))
    assert.ok(
      modal.includes(
        "Once approved, your new location will be confirmed and your profile"
      )
    )
    assert.ok(
      modal.includes(
        "will be updated. You’ll receive a notification when the verification"
      )
    )
    assert.ok(modal.includes("is complete."))
    assert.ok(modal.includes("onClick={() => setPendingModalOpen(false)}"))
    assert.equal((modal.match(/<Button/g) ?? []).length, 1)
  })

  it("coming back from Didit in review shows the pending modal once and stops waiting; success is unchanged", () => {
    const apply = page.slice(
      page.indexOf("const apply = ("),
      page.indexOf("const poll = async")
    )
    assert.ok(
      apply.indexOf("shouldShowSuccessModal(summary)") <
        apply.indexOf("shouldShowPendingModal(summary)")
    )
    const pending = apply.slice(
      apply.indexOf("if (shouldShowPendingModal(summary))"),
      apply.indexOf("// The banner or gate may have opened")
    )
    assert.ok(pending.includes("clearAwaitingResult(window.localStorage)"))
    assert.ok(pending.includes("setPendingModalOpen(true)"))
    assert.ok(pending.includes("return"))
    // the existing success path (modal, then the alert after Done) is untouched
    assert.ok(page.includes("const handleSuccessDone = () => {"))
    assert.ok(
      page.includes("All set! Your identity and location are verified.")
    )
  })

  it("declines and retries reuse the existing Verify My Account and cooldown screens: nothing new for them", () => {
    assert.ok(page.includes("You’ve used all three attempts"))
    assert.ok(page.includes("handleVerifyMyAccount"))
    // Comments are ignored: this is about copy the user can see.
    const rendered = page
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
    for (const forbidden of [
      "Still traveling?",
      "How much longer will you be traveling?",
      "We’ve asked before",
    ]) {
      assert.ok(!rendered.includes(forbidden), forbidden)
    }
  })
})

describe("SOURCE-PINNED: the client, and the components that must stay read-only", () => {
  it("the new start is POST /v1/identity-verification/kyc-sessions/home-country-change with no body fields", () => {
    assert.ok(
      http.includes(
        'AxiosRequest.post("/v1/identity-verification/kyc-sessions/home-country-change", {})'
      )
    )
    assert.ok(
      http.includes(
        'AxiosRequest.post("/v1/identity-verification/kyc-sessions", {})'
      )
    ) // ordinary start untouched
  })

  it("the Storybook-mirrored flow component is not changed to know about the new route", () => {
    assert.ok(!flow.includes("home-country-change"))
    assert.ok(!flow.includes("startHomeCountryChange"))
    assert.ok(flow.includes("Is this your home country?"))
    assert.ok(flow.includes("Yes, this is my home country"))
  })

  it("no Marketeq capture, duration re-ask or Didit loading screen was added to the dashboard", () => {
    for (const forbidden of [
      "Scan your Passport",
      "How long are you traveling?",
      "Taking you to",
      "Redirecting",
    ]) {
      assert.ok(!page.includes(forbidden), forbidden)
    }
  })
})
