// Run like detected-location.test.ts (from the frontend/ directory).
//
// Didit finishes a hosted verification "In Review" and keeps the browser on its own
// "under review" page: no redirect, and the signed webhook may not have arrived. What
// brings the application to "Your verification has been submitted" is the return: the
// awaiting flag written before leaving, the reconcile POST (the server asks Didit for
// its own decision for the caller's session) and the GET /me that follows. These tests
// run that real mechanism against a fake backend that only changes on the reconcile POST.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  clearAwaitingResult,
  hasAwaitingResult,
  markAwaitingResult,
} from "./identity-verification-status"
import {
  createReturnReconciler,
  shouldShowPendingModal,
  shouldShowSuccessModal,
} from "./identity-verification-state"
import {
  hasReviewedResult,
  markReviewedResult,
  resolveReviewedResult,
  shouldMarkReviewedResult,
} from "./reviewed-approval-result"

const page = readFileSync(join(process.cwd(), "app", "(group)", "talent-dashboard", "page.tsx"), "utf8")
const flowOf = (name: string) => {
  const start = page.indexOf(name)
  return page.slice(start, start + 6000)
}

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

// Didit's view vs ours. Only reconcile() (or a webhook, which this scenario lacks) moves
// the local record to what Didit already has.
function world(kind: "first-time" | "home-country", diditStatus: "In Review" | "Approved" | "Declined" | "Abandoned") {
  const claim = kind === "home-country" ? { pendingHomeCountry: "US", verifiedHomeCountry: "CA" } : {}
  const started = { nextAction: "continue_identity", hasActiveSession: true, fullyVerified: false, ...claim }
  const after: Record<string, Record<string, unknown>> = {
    "In Review": { nextAction: "await_review", hasActiveSession: true, fullyVerified: false, ...claim },
    Approved: { nextAction: "complete", fullyVerified: true, hasActiveSession: false },
    Declined: { nextAction: "retry_identity", fullyVerified: false, ...claim },
    Abandoned: { nextAction: "start_identity", fullyVerified: false, ...claim },
  }
  let reconciled = false
  const calls = { reconcile: 0, status: 0 }
  return {
    calls,
    approveLater: () => {
      reconciled = true
      after["In Review"] = { nextAction: "complete", fullyVerified: true, hasActiveSession: false }
    },
    deps: {
      reconcile: async () => {
        calls.reconcile += 1
        reconciled = true
        return { outcome: "updated" }
      },
      fetchStatus: async () => {
        calls.status += 1
        return reconciled ? after[diditStatus] : started
      },
    },
  }
}

// What the page's return effect does with a reconciled summary (pinned against the source
// below): the success modal, or the submitted modal plus the reviewed-approval marker.
function applyLikeThePage(summary: ReturnType<typeof Object>, user: string, storage: ReturnType<typeof memoryStorage>) {
  const s = summary as Parameters<typeof shouldShowPendingModal>[0]
  if (shouldShowSuccessModal(s)) return "success-modal"
  if (shouldShowPendingModal(s)) {
    if (shouldMarkReviewedResult(s)) markReviewedResult(storage, user)
    return "submitted-modal"
  }
  return "neither"
}

for (const kind of ["first-time", "home-country"] as const) {
  describe(`${kind}: Didit says In Review, no redirect, no webhook`, () => {
    it("returning to the dashboard reconciles once and shows the submitted modal, writing the reviewed-approval marker", async () => {
      const awaiting = memoryStorage()
      const marker = memoryStorage()
      const reviewed = memoryStorage()
      markAwaitingResult(awaiting) // written just before the browser leaves for Didit
      const w = world(kind, "In Review")

      const result = await createReturnReconciler({
        awaitingStorage: awaiting,
        markerStorage: marker,
        ...w.deps,
      }).run()

      assert.equal(w.calls.reconcile, 1, "the server was asked for Didit's decision, once")
      assert.equal(result.summary?.flowState, "await-review")
      assert.equal(applyLikeThePage(result.summary as never, "u1", reviewed), "submitted-modal")
      assert.equal(hasReviewedResult(reviewed, "u1"), true)
    })

    it("without the return (the user never comes back) nothing is shown and nothing is written", async () => {
      const reviewed = memoryStorage()
      const awaiting = memoryStorage()
      markAwaitingResult(awaiting)
      assert.equal(hasAwaitingResult(awaiting), true) // it waits, up to a day, for the return
      assert.equal(hasReviewedResult(reviewed, "u1"), false)
    })

    it("until the local record is reconciled, /me alone still says the session is running", async () => {
      const w = world(kind, "In Review")
      const before = await w.deps.fetchStatus()
      assert.equal((before as { nextAction: string }).nextAction, "continue_identity")
    })

    it("a later approval shows the one-time alert, once", async () => {
      const awaiting = memoryStorage()
      const reviewed = memoryStorage()
      markAwaitingResult(awaiting)
      const w = world(kind, "In Review")
      const result = await createReturnReconciler({ awaitingStorage: awaiting, markerStorage: memoryStorage(), ...w.deps }).run()
      applyLikeThePage(result.summary as never, "u1", reviewed)

      assert.equal(
        await resolveReviewedResult({ storage: reviewed, userId: "u1", fetchSummary: async () => result.summary }),
        "waiting"
      )
      w.approveLater()
      const approved = async () => {
        const body = await w.deps.fetchStatus()
        const { parseIdentityVerificationSummary } = await import("./identity-verification-state")
        return parseIdentityVerificationSummary(body)
      }
      assert.equal(await resolveReviewedResult({ storage: reviewed, userId: "u1", fetchSummary: approved }), "approved")
      assert.equal(await resolveReviewedResult({ storage: reviewed, userId: "u1", fetchSummary: approved }), "none")
    })

    it("a refresh after the submitted modal reconciles nothing more (the awaiting flag was cleared)", async () => {
      const awaiting = memoryStorage()
      markAwaitingResult(awaiting)
      const w = world(kind, "In Review")
      await createReturnReconciler({ awaitingStorage: awaiting, markerStorage: memoryStorage(), ...w.deps }).run()
      clearAwaitingResult(awaiting) // what the page does when it shows the submitted modal
      assert.equal(hasAwaitingResult(awaiting), false)
    })
  })
}

describe("the other returns are unchanged", () => {
  it("immediate approval: the success modal, and no reviewed-approval marker", async () => {
    const awaiting = memoryStorage()
    const reviewed = memoryStorage()
    markAwaitingResult(awaiting)
    const w = world("home-country", "Approved")
    const result = await createReturnReconciler({ awaitingStorage: awaiting, markerStorage: memoryStorage(), ...w.deps }).run()
    assert.equal(applyLikeThePage(result.summary as never, "u1", reviewed), "success-modal")
    assert.equal(hasReviewedResult(reviewed, "u1"), false)
  })

  for (const [diditStatus, nextAction] of [
    ["Declined", "retry_identity"],
    ["Abandoned", "start_identity"],
  ] as const) {
    it(`${diditStatus}: neither modal, no marker (${nextAction})`, async () => {
      const awaiting = memoryStorage()
      const reviewed = memoryStorage()
      markAwaitingResult(awaiting)
      const w = world("home-country", diditStatus)
      const result = await createReturnReconciler({ awaitingStorage: awaiting, markerStorage: memoryStorage(), ...w.deps }).run()
      assert.equal(result.summary?.nextAction, nextAction)
      assert.equal(applyLikeThePage(result.summary as never, "u1", reviewed), "neither")
      assert.equal(hasReviewedResult(reviewed, "u1"), false)
    })
  }

  it("a forged status in the URL is not an input: the reconciler takes nothing from the page URL", () => {
    const body = readFileSync(join(process.cwd(), "src", "lib", "api", "identity-verification-state.ts"), "utf8")
    const reconciler = body.slice(body.indexOf("export function createReturnReconciler"))
    assert.ok(!/location\.(search|href)|URLSearchParams|verificationSessionId/.test(reconciler))
  })
})

describe("the dashboard's return handling (source-pinned)", () => {
  const effect = flowOf("let attempts = 0")
  it("a fresh load with the awaiting flag reconciles through the shared reconciler and applies the summary", () => {
    assert.ok(effect.includes("if (hasAwaitingResult(window.localStorage))"))
    assert.ok(effect.includes("void returnReconcilerRef.current.run().then((result) => apply(result.summary))"))
  })
  it("the submitted modal clears the awaiting flag and marks either kind for the later approval", () => {
    const pending = page.slice(page.indexOf("if (shouldShowPendingModal(summary))"), page.indexOf("// The banner or gate may have opened"))
    assert.ok(pending.includes("clearAwaitingResult(window.localStorage)"))
    assert.ok(pending.includes("if (shouldMarkReviewedResult(summary))"))
    assert.ok(pending.includes("setPendingModalOpen(true)"))
  })
  it("pressing Back from the provider (a page restored from the back/forward cache) reconciles too", () => {
    assert.ok(page.includes('window.addEventListener("pageshow", onPageShow)'))
    assert.ok(page.includes('window.removeEventListener("pageshow", onPageShow)'))
    const handler = page.slice(page.indexOf("const onPageShow"), page.indexOf('document.addEventListener("visibilitychange", onVisible)\n    window.addEventListener("pageshow"'))
    assert.ok(handler.includes("!event.persisted || !hasAwaitingResult(window.localStorage)"))
    assert.ok(handler.includes("returnReconcilerRef.current.run()"))
    assert.ok(handler.includes("apply(result.summary)"))
  })
})
