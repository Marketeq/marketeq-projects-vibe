// Run like detected-location.test.ts (from the frontend/ directory).
//
// PMCM-650 follow-up: the "Your home country was updated." notification (Figma
// 13101-47577). Two kinds of test, kept apart on purpose:
//   - RUNTIME: the one-shot flag, the copy, and the order of events on the way to Didit
//     are executed.
//   - SOURCE-PINNED: the dashboard page cannot be rendered here, so its wiring is asserted
//     against the page source. These prove what is written, not how it behaves in a
//     browser.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { type FreeKycDeps, confirmHomeCountryAndStartFreeKyc } from "./free-kyc"
import {
  type FlagStorage,
  HOME_COUNTRY_CHANGE_KEY,
  HOME_COUNTRY_CHANGE_TTL_MS,
  HOME_COUNTRY_UPDATED_ALERT,
  clearHomeCountryChange,
  consumeHomeCountryChange,
  markHomeCountryChange,
  successAlertKindFor,
} from "./home-country-change-result"
import { parseIdentityVerificationSummary } from "./identity-verification-state"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = read("app", "(group)", "talent-dashboard", "page.tsx")
const flow = read("components", "identity-verification-flow.tsx")

class FakeStorage implements FlagStorage {
  private map = new Map<string, string>()
  getItem(k: string) {
    return this.map.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.map.set(k, v)
  }
  removeItem(k: string) {
    this.map.delete(k)
  }
  has(k: string) {
    return this.map.has(k)
  }
}

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0)

// ---------------------------------------------------------------------------
describe("RUNTIME: the approved copy", () => {
  it("is exactly the Figma notification: a title and its supporting text", () => {
    assert.equal(
      HOME_COUNTRY_UPDATED_ALERT.title,
      "Your home country was updated."
    )
    assert.equal(
      HOME_COUNTRY_UPDATED_ALERT.description,
      "You can continue using the platform while away from your home country."
    )
    assert.equal(
      `${HOME_COUNTRY_UPDATED_ALERT.title} ${HOME_COUNTRY_UPDATED_ALERT.description}`,
      "Your home country was updated. You can continue using the platform while away from your home country."
    )
  })
})

// ---------------------------------------------------------------------------
describe("RUNTIME: the flag is read once", () => {
  it("a home-country trip is seen once, then never again (duplicate webhook, reconcile, refresh)", () => {
    const storage = new FakeStorage()
    markHomeCountryChange(storage, true, NOW)
    assert.equal(consumeHomeCountryChange(storage, NOW + 1000), true)
    assert.equal(consumeHomeCountryChange(storage, NOW + 2000), false)
    assert.equal(consumeHomeCountryChange(storage, NOW + 3000), false)
    assert.equal(storage.has(HOME_COUNTRY_CHANGE_KEY), false)
  })

  it("an ordinary verification has no flag, so it can never show the home-country notification", () => {
    const storage = new FakeStorage()
    markHomeCountryChange(storage, false, NOW)
    assert.equal(consumeHomeCountryChange(storage, NOW), false)
    assert.equal(
      successAlertKindFor(consumeHomeCountryChange(storage, NOW)),
      "verified"
    )
  })

  it("starting an ordinary trip clears a flag left by an unfinished home-country trip", () => {
    const storage = new FakeStorage()
    markHomeCountryChange(storage, true, NOW)
    markHomeCountryChange(storage, false, NOW + 1000)
    assert.equal(consumeHomeCountryChange(storage, NOW + 2000), false)
  })

  it("approval after an in-review result: the pending modal clears the flag, so nothing opens here later", () => {
    const storage = new FakeStorage()
    markHomeCountryChange(storage, true, NOW)
    clearHomeCountryChange(storage) // what the pending modal does
    assert.equal(consumeHomeCountryChange(storage, NOW + 1000), false)
  })

  it("a flag older than a day, from the future, or unparsable is ignored (and removed)", () => {
    for (const [raw, now] of [
      [String(NOW), NOW + HOME_COUNTRY_CHANGE_TTL_MS + 1],
      [String(NOW + 60_000), NOW],
      ["not-a-number", NOW],
      ["", NOW],
    ] as const) {
      const storage = new FakeStorage()
      if (raw) storage.setItem(HOME_COUNTRY_CHANGE_KEY, raw)
      assert.equal(consumeHomeCountryChange(storage, now), false, raw)
      assert.equal(storage.has(HOME_COUNTRY_CHANGE_KEY), false)
    }
    // exactly at the limit still counts
    const edge = new FakeStorage()
    markHomeCountryChange(edge, true, NOW)
    assert.equal(
      consumeHomeCountryChange(edge, NOW + HOME_COUNTRY_CHANGE_TTL_MS),
      true
    )
  })

  it("an unavailable storage falls back to the generic alert and never throws", () => {
    const broken: FlagStorage = {
      getItem: () => {
        throw new Error("blocked")
      },
      setItem: () => {
        throw new Error("blocked")
      },
      removeItem: () => {
        throw new Error("blocked")
      },
    }
    assert.doesNotThrow(() => markHomeCountryChange(broken, true))
    assert.doesNotThrow(() => clearHomeCountryChange(broken))
    assert.equal(consumeHomeCountryChange(broken), false)
    assert.equal(consumeHomeCountryChange(undefined), false)
    assert.doesNotThrow(() => markHomeCountryChange(undefined, true))
  })

  it("maps the flag to the alert kind", () => {
    assert.equal(successAlertKindFor(true), "home-country-updated")
    assert.equal(successAlertKindFor(false), "verified")
  })
})

// ---------------------------------------------------------------------------
describe("RUNTIME: the trip to Didit records what it is", () => {
  const DIDIT = "https://verify.didit.me/session/abc"

  const run = async (
    confirmation: unknown,
    over: Partial<FreeKycDeps> = {}
  ) => {
    const calls: string[] = []
    const d: FreeKycDeps = {
      confirmHomeCountry: async () => confirmation,
      startFreeKyc: async () => ({ data: { url: DIDIT } }),
      startHomeCountryChange: async () => ({ data: { url: DIDIT } }),
      redirect: (url) => void calls.push(`redirect:${url}`),
      markAwaitingResult: () => void calls.push("awaiting"),
      markHomeCountryChange: (isChange) => void calls.push(`flag:${isChange}`),
      refreshIdentityStatus: async () => "verified",
      publishStatus: () => undefined,
      ...over,
    }
    const outcome = await confirmHomeCountryAndStartFreeKyc(d)
    return { outcome, calls }
  }

  it("a home-country change flags the trip, after the awaiting marker and before the redirect", async () => {
    const { outcome, calls } = await run({ data: { pendingHomeCountry: "CA" } })
    assert.equal(outcome, "redirected")
    assert.deepEqual(calls, ["awaiting", "flag:true", `redirect:${DIDIT}`])
  })

  it("an ordinary verification records that it is NOT a home-country change", async () => {
    const { calls } = await run({ data: { verifiedHomeCountry: "US" } })
    assert.deepEqual(calls, ["awaiting", "flag:false", `redirect:${DIDIT}`])
  })

  it("a refused start or a non-Didit URL records nothing and does not redirect", async () => {
    const original = console.error
    console.error = () => undefined
    try {
      const bad = await run(
        { data: { pendingHomeCountry: "CA" } },
        {
          startHomeCountryChange: async () => ({
            data: { url: "https://evil.example.com/x" },
          }),
        }
      )
      assert.equal(bad.outcome, "failed")
      assert.deepEqual(bad.calls, [])

      const refused = await run(
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
      assert.equal(refused.outcome, "failed")
      assert.deepEqual(refused.calls, [])
    } finally {
      console.error = original
    }
  })

  it("the parsed status carries the pending country only when the backend sent one", () => {
    const parse = (body: Record<string, unknown>) =>
      parseIdentityVerificationSummary({
        nextAction: "start_identity",
        ...body,
      })
    assert.equal(parse({ pendingHomeCountry: "CA" })?.pendingHomeCountry, "CA")
    assert.equal(parse({})?.pendingHomeCountry, null)
    assert.equal(parse({ pendingHomeCountry: "" })?.pendingHomeCountry, null)
    assert.equal(parse({ pendingHomeCountry: 5 })?.pendingHomeCountry, null)
  })
})

// ---------------------------------------------------------------------------
describe("SOURCE-PINNED: the notification markup (Figma 13101-47577)", () => {
  const start = page.indexOf("open={homeCountryUpdatedOpen}")
  const toast = page.slice(
    page.lastIndexOf("<Toast", start),
    page.indexOf("</Toast>", start)
  )

  it("is the success alert's own markup: 400px, p-4, gap-5, rounded-xl, gray-100 border, white, lg shadow", () => {
    for (const c of [
      "w-[400px]",
      "p-4",
      "gap-5",
      "rounded-xl",
      "border border-gray-100",
      "bg-white",
      "shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08),0px_4px_6px_-2px_rgba(16,24,40,0.03)]",
      "items-start",
    ]) {
      assert.ok(toast.includes(c), c)
    }
  })

  it("featured icon: 66px, primary-50 fill, 9.9px primary-25 border, a 24.75px primary-500 map pin with the 0.38/-0.62 offset", () => {
    assert.ok(toast.includes("size-[66px]"))
    assert.ok(
      toast.includes(
        "rounded-full border-[9.9px] border-primary-25 bg-primary-50"
      )
    )
    assert.ok(
      toast.includes(
        '<MarkerPin01 className="size-[24.75px] translate-x-[0.38px] -translate-y-[0.62px] text-primary-500" />'
      )
    )
  })

  it("text: pt-0.5 column with a 4px gap, 14/20 semibold gray-900 title and 14/20 regular gray-600 body, from the approved copy", () => {
    assert.ok(toast.includes("flex min-w-0 flex-1 flex-col gap-1 pt-0.5"))
    assert.ok(
      toast.includes(
        '<ToastTitle className="text-sm font-semibold leading-5 text-gray-900">'
      )
    )
    assert.ok(
      toast.includes(
        '<ToastDescription className="text-sm font-normal leading-5 text-gray-600">'
      )
    )
    assert.ok(toast.includes("{HOME_COUNTRY_UPDATED_ALERT.title}"))
    assert.ok(toast.includes("{HOME_COUNTRY_UPDATED_ALERT.description}"))
  })

  it("close button: 36px at 8px from the top and right, gray-500 X, closes only this notification; auto-closes after 5 seconds", () => {
    assert.ok(
      toast.includes('className="absolute right-2 top-2 size-9 text-gray-500"')
    )
    assert.ok(toast.includes('<X className="size-5" />'))
    assert.ok(
      toast.includes("onClick={() => setHomeCountryUpdatedOpen(false)}")
    )
    assert.ok(toast.includes("duration={5000}"))
  })

  it("lives in an existing toast viewport: the page still has exactly two ToastProviders", () => {
    assert.equal((page.match(/<ToastProvider/g) ?? []).length, 2)
  })
})

describe("SOURCE-PINNED: when it opens, and what stays exactly as it was", () => {
  it("the success modal and the generic alert are untouched, and the generic alert never carries the home-country copy", () => {
    assert.ok(
      page.includes("<Button onClick={handleSuccessDone}>Done</Button>")
    )
    assert.match(
      page,
      /const handleSuccessDone = \(\) => \{\s+setVerifiedModalOpen\(false\)\s+\}/
    )
    const generic = page.slice(
      page.indexOf("open={successAlertOpen}"),
      page.indexOf("</Toast>", page.indexOf("open={successAlertOpen}"))
    )
    assert.ok(
      generic.includes("All set! Your identity and location are verified.")
    )
    assert.ok(!generic.includes("HOME_COUNTRY_UPDATED_ALERT"))
    assert.ok(!generic.includes("MarkerPin01"))
  })

  it("only a flagged approval swaps the alert, in the same commit as the Done click (the generic alert is never painted)", () => {
    const effect = page.slice(
      page.indexOf("useLayoutEffect(() => {"),
      page.indexOf("}, [successAlertOpen, successAlertKind])")
    )
    assert.ok(
      effect.includes(
        'if (successAlertOpen && successAlertKind === "home-country-updated")'
      )
    )
    assert.ok(effect.includes("setSuccessAlertOpen(false)"))
    assert.ok(effect.includes("setHomeCountryUpdatedOpen(true)"))
    // an ordinary approval keeps the default kind, so the swap never fires for it
    assert.ok(page.includes('useState<SuccessAlertKind>("verified")'))
  })

  it("the kind is read once, when the success modal opens, after the frozen sequence", () => {
    const branch = page.slice(
      page.indexOf("if (shouldShowSuccessModal(summary)) {"),
      page.indexOf("if (shouldShowPendingModal(summary))")
    )
    assert.ok(
      branch.indexOf("clearAwaitingResult(window.localStorage)") <
        branch.indexOf("setVerifiedModalOpen(true)")
    )
    assert.ok(
      branch.indexOf("setVerifiedModalOpen(true)") <
        branch.indexOf("consumeHomeCountryChange(window.localStorage)")
    )
    assert.equal((branch.match(/consumeHomeCountryChange/g) ?? []).length, 1)
    assert.ok(!branch.includes("setSuccessAlertOpen"))
  })

  it("the in-review path clears the flag and opens no alert: the approval then arrives as a backend notification", () => {
    const pending = page.slice(
      page.indexOf("if (shouldShowPendingModal(summary))"),
      page.indexOf("// The banner or gate may have opened")
    )
    assert.ok(pending.includes("clearHomeCountryChange(window.localStorage)"))
    assert.ok(pending.includes("setPendingModalOpen(true)"))
    assert.ok(!pending.includes("setHomeCountryUpdatedOpen"))
    assert.ok(!pending.includes("setSuccessAlertOpen"))
  })

  it("Verify My Account records the trip explicitly (true or false) just before it starts Didit", () => {
    const handler = page.slice(
      page.indexOf("const handleVerifyMyAccount"),
      page.indexOf(
        "setVerificationGateOpen(false)\n      // Explicit user action"
      )
    )
    const mark = handler.indexOf("markHomeCountryChange(")
    const start = handler.indexOf("await startIdentityOnlyForDashboard()")
    assert.ok(mark > -1 && start > mark)
    assert.ok(handler.includes("summary?.pendingHomeCountry != null"))
  })

  it("the Storybook-mirrored flow component is not changed", () => {
    assert.ok(!flow.includes("home-country-change-result"))
    assert.ok(!flow.includes("MarkerPin01"))
    assert.ok(!flow.includes("Your home country was updated"))
  })
})
