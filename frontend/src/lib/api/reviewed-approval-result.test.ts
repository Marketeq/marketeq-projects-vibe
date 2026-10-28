// Run like detected-location.test.ts (from the frontend/ directory).
//
// PMCM-653: a first-time verification shown as "submitted" and approved later shows the
// existing success alert once. Two kinds of test, kept apart on purpose:
//   - RUNTIME: the marker, the decision and the check against a faked backend are
//     executed, including the refresh / tab-focus / duplicate / other-account cases.
//   - SOURCE-PINNED: the dashboard page cannot be rendered here, so its wiring is
//     asserted against the page source. These prove what is written, not how it
//     behaves in a browser.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { parseIdentityVerificationSummary } from "./identity-verification-state"
import {
  REVIEWED_RESULT_TTL_MS,
  type ReviewedResultStorage,
  clearReviewedResult,
  consumeReviewedResult,
  decideReviewedResult,
  hasReviewedResult,
  markReviewedResult,
  resolveReviewedResult,
  reviewedResultKey,
  shouldMarkReviewedResult,
} from "./reviewed-approval-result"
import { readDashboardWithHost } from "./dashboard-host-source"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = readDashboardWithHost()

function memoryStorage(): ReviewedResultStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

const summary = (body: Record<string, unknown>) =>
  parseIdentityVerificationSummary(body)
const REVIEW = { nextAction: "await_review", fullyVerified: false }
const APPROVED = { nextAction: "complete", fullyVerified: true }
const A = "user-a"
const B = "user-b"

// A fake backend whose answer the test moves along, with a call log.
function backend(initial: Record<string, unknown>) {
  let body: Record<string, unknown> = initial
  const calls = { fetch: 0, reconcile: 0 }
  return {
    calls,
    set: (next: Record<string, unknown>) => {
      body = next
    },
    deps: (storage: ReviewedResultStorage, userId: string, withReconcile = false) => ({
      storage,
      userId,
      fetchSummary: async () => {
        calls.fetch += 1
        return summary(body)
      },
      reconcile: withReconcile
        ? async () => {
            calls.reconcile += 1
          }
        : undefined,
    }),
  }
}

describe("when the submitted modal is shown", () => {
  it("marks an in-review result of either kind: first-time, or a home-country change", () => {
    assert.equal(shouldMarkReviewedResult(summary(REVIEW)), true)
    assert.equal(
      shouldMarkReviewedResult(summary({ ...REVIEW, pendingHomeCountry: "CA" })),
      true,
      "a submitted home-country change is followed by the same alert once approved"
    )
    assert.equal(shouldMarkReviewedResult(summary(APPROVED)), false)
    assert.equal(shouldMarkReviewedResult(summary({ nextAction: "retry_identity" })), false)
    assert.equal(shouldMarkReviewedResult(null), false)
  })
})

describe("the decision comes from the backend summary alone", () => {
  const decide = (body: Record<string, unknown> | null) =>
    decideReviewedResult(body === null ? null : summary(body))

  it("approves only on nextAction complete AND fullyVerified true", () => {
    assert.equal(decide(APPROVED), "approved")
    assert.equal(decide({ nextAction: "complete", fullyVerified: false }), "waiting")
    assert.equal(decide({ nextAction: "complete" }), "waiting")
    assert.equal(decide({ fullyVerified: true }), "waiting", "fullyVerified alone is not enough")
  })

  it("does not approve while a home-country claim exists or a session is still running", () => {
    assert.equal(decide({ ...APPROVED, pendingHomeCountry: "CA" }), "waiting")
    assert.equal(decide({ ...APPROVED, hasActiveSession: true }), "waiting")
    assert.equal(decide({ ...APPROVED, pendingHomeCountry: "CA", hasActiveSession: true }), "waiting")
    assert.equal(decide({ ...APPROVED, hasActiveSession: false }), "approved")
  })

  it("keeps waiting while the review continues or the answer is unreadable or unknown", () => {
    assert.equal(decide(REVIEW), "waiting")
    assert.equal(decide(null), "waiting")
    assert.equal(decide({ nextAction: "something_newer" }), "waiting")
    assert.equal(decide({}), "waiting")
  })

  it("ends the wait, with no success, for a decline, abandonment, expiry or anything else", () => {
    for (const nextAction of [
      "retry_identity",
      "wait_for_retry",
      "start_identity",
      "continue_identity",
      "confirm_location",
      "reverify_identity",
    ]) {
      assert.equal(decide({ nextAction }), "ended", nextAction)
    }
  })
})

describe("pending → approved shows the success alert once", () => {
  it("shows it on approval, then never again for that marker", async () => {
    const storage = memoryStorage()
    const b = backend(REVIEW)
    markReviewedResult(storage, A)

    assert.equal(await resolveReviewedResult(b.deps(storage, A)), "waiting")
    b.set(APPROVED)
    assert.equal(await resolveReviewedResult(b.deps(storage, A)), "approved")
    assert.equal(hasReviewedResult(storage, A), false, "cleared once handled")
    assert.equal(await resolveReviewedResult(b.deps(storage, A)), "none")
  })

  it("two concurrent checks (load and tab focus) show it exactly once", async () => {
    const storage = memoryStorage()
    const b = backend(APPROVED)
    markReviewedResult(storage, A)

    const outcomes = await Promise.all([
      resolveReviewedResult(b.deps(storage, A, true)),
      resolveReviewedResult(b.deps(storage, A)),
      resolveReviewedResult(b.deps(storage, A)),
    ])

    assert.equal(outcomes.filter((o) => o === "approved").length, 1)
  })

  it("the marker is cleared only when the approval is handled, not while waiting", async () => {
    const storage = memoryStorage()
    const b = backend(REVIEW)
    markReviewedResult(storage, A)
    await resolveReviewedResult(b.deps(storage, A, true))
    assert.equal(storage.data.has(reviewedResultKey(A)), true)
  })
})

describe("home-country change: in review → approved", () => {
  const HC_REVIEW = { ...REVIEW, pendingHomeCountry: "CA", hasActiveSession: true }
  const HC_LANDED_BUT_CLAIM_OPEN = { ...APPROVED, pendingHomeCountry: "CA" }
  const HC_APPROVED = { ...APPROVED, verifiedHomeCountry: "CA" } // the claim is gone

  it("the submitted modal's marker, then silence while it is pending, then the alert once on approval", async () => {
    const storage = memoryStorage()
    const be = backend(HC_REVIEW)
    // The submitted modal is shown for this home-country change: the marker is written.
    assert.equal(shouldMarkReviewedResult(summary(HC_REVIEW)), true)
    markReviewedResult(storage, A)

    assert.equal(await resolveReviewedResult(be.deps(storage, A)), "waiting")
    assert.equal(await resolveReviewedResult(be.deps(storage, A, true)), "waiting")
    assert.equal(hasReviewedResult(storage, A), true)

    be.set(HC_APPROVED)
    assert.equal(await resolveReviewedResult(be.deps(storage, A)), "approved")
    assert.equal(hasReviewedResult(storage, A), false)
  })

  it("a complete-looking answer with the pending claim still open shows nothing and keeps the wait", async () => {
    const storage = memoryStorage()
    markReviewedResult(storage, A)
    const be = backend(HC_LANDED_BUT_CLAIM_OPEN)
    assert.equal(await resolveReviewedResult(be.deps(storage, A)), "waiting")
    assert.equal(hasReviewedResult(storage, A), true)
    be.set({ ...APPROVED, hasActiveSession: true })
    assert.equal(await resolveReviewedResult(be.deps(storage, A)), "waiting")
    be.set(HC_APPROVED)
    assert.equal(await resolveReviewedResult(be.deps(storage, A)), "approved")
  })

  it("once granted, a refresh, a second tab or a later check shows nothing", async () => {
    const storage = memoryStorage()
    markReviewedResult(storage, A)
    const be = backend(HC_APPROVED)
    assert.equal(await resolveReviewedResult(be.deps(storage, A, true)), "approved")
    for (let i = 0; i < 3; i += 1) {
      assert.equal(await resolveReviewedResult(be.deps(storage, A, true)), "none")
    }
    assert.equal(be.calls.fetch, 1, "after the grant the backend is not even asked")
  })

  it("two concurrent checks of the same approval show it once", async () => {
    const storage = memoryStorage()
    markReviewedResult(storage, A)
    const be = backend(HC_APPROVED)
    const [one, two] = await Promise.all([
      resolveReviewedResult(be.deps(storage, A)),
      resolveReviewedResult(be.deps(storage, A)),
    ])
    assert.deepEqual([one, two].sort(), ["approved", "none"])
  })

  it("decline, abandonment or expiry of the claim's session ends the wait with no success", async () => {
    for (const body of [
      { nextAction: "retry_identity", pendingHomeCountry: "CA" }, // declined, attempts left
      { nextAction: "wait_for_retry", pendingHomeCountry: "CA" }, // declined, cooling down
      { nextAction: "start_identity", pendingHomeCountry: "CA" }, // abandoned or expired
      { nextAction: "reverify_identity", pendingHomeCountry: "CA" }, // verification expired
      { nextAction: "confirm_location", pendingHomeCountry: "CA" },
    ]) {
      const storage = memoryStorage()
      markReviewedResult(storage, A)
      assert.equal(await resolveReviewedResult(backend(body).deps(storage, A)), "ended", body.nextAction)
      assert.equal(hasReviewedResult(storage, A), false)
    }
  })

  it("an immediate approval shows only the success modal: its summary never leaves a marker", async () => {
    const storage = memoryStorage()
    // The immediate result is the success modal, never the submitted one, so nothing is marked...
    assert.equal(shouldMarkReviewedResult(summary(HC_APPROVED)), false)
    assert.equal(await resolveReviewedResult(backend(HC_APPROVED).deps(storage, A)), "none")
    // ...and a stale marker is cleared by the handler (pinned below), so no second alert follows.
    markReviewedResult(storage, A)
    clearReviewedResult(storage, A)
    assert.equal(await resolveReviewedResult(backend(HC_APPROVED).deps(storage, A)), "none")
  })

  it("an unrelated already-verified account, or another account's marker, gets nothing", async () => {
    const storage = memoryStorage()
    markReviewedResult(storage, A)
    const be = backend(HC_APPROVED)
    assert.equal(await resolveReviewedResult(be.deps(storage, B)), "none")
    assert.equal(hasReviewedResult(storage, A), true, "B cannot consume A's marker")
    assert.equal(await resolveReviewedResult(backend(APPROVED).deps(memoryStorage(), B)), "none")
  })

  it("a marker older than seven days is ignored and removed even when the claim is approved", async () => {
    const storage = memoryStorage()
    const t0 = 1_000_000_000_000
    markReviewedResult(storage, A, t0)
    const later = t0 + REVIEWED_RESULT_TTL_MS + 1
    const be = backend(HC_APPROVED)
    assert.equal(await resolveReviewedResult({ ...be.deps(storage, A), now: later }), "none")
    assert.equal(storage.data.size, 0)
    assert.equal(be.calls.fetch, 0)
    // At exactly seven days it is still valid.
    markReviewedResult(storage, A, t0)
    assert.equal(await resolveReviewedResult({ ...be.deps(storage, A), now: t0 + REVIEWED_RESULT_TTL_MS }), "approved")
  })
})

describe("pending remains pending", () => {
  it("shows nothing and keeps waiting on every check, however many", async () => {
    const storage = memoryStorage()
    const b = backend(REVIEW)
    markReviewedResult(storage, A)
    for (let i = 0; i < 5; i += 1) {
      assert.equal(await resolveReviewedResult(b.deps(storage, A, i === 0)), "waiting")
    }
    assert.equal(hasReviewedResult(storage, A), true)
  })

  it("an unreadable answer does not show success or lose the wait", async () => {
    const storage = memoryStorage()
    markReviewedResult(storage, A)
    const outcome = await resolveReviewedResult({
      storage,
      userId: A,
      fetchSummary: async () => {
        throw new Error("503")
      },
    })
    assert.equal(outcome, "waiting")
    assert.equal(hasReviewedResult(storage, A), true)
  })

  it("a failing reconcile is ignored and the summary still decides", async () => {
    const storage = memoryStorage()
    const b = backend(APPROVED)
    markReviewedResult(storage, A)
    const outcome = await resolveReviewedResult({
      ...b.deps(storage, A),
      reconcile: async () => {
        throw new Error("503")
      },
    })
    assert.equal(outcome, "approved")
  })
})

describe("pending → declined (or abandoned, expired)", () => {
  it("shows no success, ends the wait, and a later approval of a NEW attempt is not this marker's", async () => {
    const storage = memoryStorage()
    const b = backend(REVIEW)
    markReviewedResult(storage, A)

    b.set({ nextAction: "retry_identity", fullyVerified: false })
    assert.equal(await resolveReviewedResult(b.deps(storage, A)), "ended")
    assert.equal(hasReviewedResult(storage, A), false)

    // An immediate approval of a later attempt is the ordinary success modal's job.
    b.set(APPROVED)
    assert.equal(await resolveReviewedResult(b.deps(storage, A)), "none")
  })
})

describe("refresh and tab focus", () => {
  it("refresh during review: shows nothing and keeps the marker, so no false success", async () => {
    const storage = memoryStorage()
    const b = backend(REVIEW)
    markReviewedResult(storage, A)
    // each "refresh" is a fresh load check: one reconcile, then GET
    assert.equal(await resolveReviewedResult(b.deps(storage, A, true)), "waiting")
    assert.equal(await resolveReviewedResult(b.deps(storage, A, true)), "waiting")
    assert.equal(hasReviewedResult(storage, A), true)
  })

  it("refresh after the approval alert: nothing is shown again", async () => {
    const storage = memoryStorage()
    const b = backend(APPROVED)
    markReviewedResult(storage, A)
    assert.equal(await resolveReviewedResult(b.deps(storage, A, true)), "approved")
    for (let i = 0; i < 3; i += 1) {
      assert.equal(await resolveReviewedResult(b.deps(storage, A, true)), "none")
    }
  })

  it("tab focus after an approval that landed meanwhile shows it, with a GET only (no reconcile)", async () => {
    const storage = memoryStorage()
    const b = backend(REVIEW)
    markReviewedResult(storage, A)
    assert.equal(await resolveReviewedResult(b.deps(storage, A, true)), "waiting")

    b.set(APPROVED) // the webhook landed while the tab was in the background
    const reconcilesBefore = b.calls.reconcile
    assert.equal(await resolveReviewedResult(b.deps(storage, A, false)), "approved")
    assert.equal(b.calls.reconcile, reconcilesBefore)
  })

  it("a load check reconciles at most once per check", async () => {
    const storage = memoryStorage()
    const b = backend(REVIEW)
    markReviewedResult(storage, A)
    await resolveReviewedResult(b.deps(storage, A, true))
    assert.equal(b.calls.reconcile, 1)
    assert.equal(b.calls.fetch, 1)
  })
})

describe("who can be shown it", () => {
  it("an account with no marker never gets the alert, even when verified, and the backend is not even asked", async () => {
    const storage = memoryStorage()
    const b = backend(APPROVED) // an unrelated, already verified account
    assert.equal(await resolveReviewedResult(b.deps(storage, A, true)), "none")
    assert.equal(b.calls.fetch, 0)
    assert.equal(b.calls.reconcile, 0)
  })

  it("an immediate approval leaves no marker, so the success modal's own flow is not duplicated", async () => {
    const storage = memoryStorage()
    // the page marks only an in-review result; an immediate approval is complete
    assert.equal(shouldMarkReviewedResult(summary(APPROVED)), false)
    const b = backend(APPROVED)
    assert.equal(await resolveReviewedResult(b.deps(storage, A, true)), "none")
  })

  it("another account on the same browser cannot read or consume the marker", async () => {
    const storage = memoryStorage()
    const b = backend(APPROVED)
    markReviewedResult(storage, A)

    assert.equal(hasReviewedResult(storage, B), false)
    assert.equal(consumeReviewedResult(storage, B), false)
    assert.equal(await resolveReviewedResult(b.deps(storage, B, true)), "none")
    clearReviewedResult(storage, B)

    assert.equal(hasReviewedResult(storage, A), true, "A's marker is untouched")
    assert.equal(await resolveReviewedResult(b.deps(storage, A)), "approved")
  })

  it("no user id, no marker and no alert", async () => {
    const storage = memoryStorage()
    markReviewedResult(storage, undefined)
    markReviewedResult(storage, "")
    assert.equal(storage.data.size, 0)
    assert.equal(consumeReviewedResult(storage, null), false)
  })
})

describe("the marker", () => {
  it("expires after a week, and a future or malformed value is ignored and removed", () => {
    const storage = memoryStorage()
    markReviewedResult(storage, A, 1_000)
    assert.equal(hasReviewedResult(storage, A, 1_000 + REVIEWED_RESULT_TTL_MS), true)
    assert.equal(hasReviewedResult(storage, A, 1_000 + REVIEWED_RESULT_TTL_MS + 1), false)
    assert.equal(storage.data.has(reviewedResultKey(A)), false)

    storage.data.set(reviewedResultKey(A), "9999999999999")
    assert.equal(hasReviewedResult(storage, A, 1_000), false)
    storage.data.set(reviewedResultKey(A), "not-a-number")
    assert.equal(hasReviewedResult(storage, A, 1_000), false)
    assert.equal(storage.data.has(reviewedResultKey(A)), false)
  })

  it("unavailable storage never throws and never grants the alert", () => {
    const broken: ReviewedResultStorage = {
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
    assert.doesNotThrow(() => markReviewedResult(broken, A))
    assert.equal(hasReviewedResult(broken, A), false)
    assert.equal(consumeReviewedResult(broken, A), false)
    assert.doesNotThrow(() => clearReviewedResult(broken, A))
    assert.equal(hasReviewedResult(undefined, A), false)
  })
})

describe("dashboard wiring (source-pinned)", () => {
  const block = page.slice(
    page.indexOf("const reviewedCheckStartedRef"),
    page.indexOf("// The Identity Verification check (which may open AccountVerificationGate)")
  )

  it("the submitted modal marks the wait for either kind, and keeps clearing the home-country flag", () => {
    const pending = page.slice(
      page.indexOf("if (shouldShowPendingModal(summary))"),
      page.indexOf("// The banner or gate may have opened")
    )
    assert.ok(pending.includes("clearHomeCountryChange(window.localStorage)"))
    assert.ok(pending.includes("if (shouldMarkReviewedResult(summary))"))
    assert.ok(pending.includes("markReviewedResult(window.localStorage, user.id)"))
    assert.ok(pending.includes("setPendingModalOpen(true)"))
  })

  it("an immediate success clears any review marker and still opens the existing modal", () => {
    const success = page.slice(
      page.indexOf("if (shouldShowSuccessModal(summary))"),
      page.indexOf("if (shouldShowPendingModal(summary))")
    )
    assert.ok(success.includes("clearReviewedResult(window.localStorage, user.id)"))
    assert.ok(success.includes("setVerifiedModalOpen(true)"))
  })

  it("the check rechecks on load (one reconcile) and on tab focus (GET only), with no timer", () => {
    assert.ok(block.includes("resolveReviewedResult({"))
    assert.ok(block.includes("reconcile: withReconcile ? reconcileReviewedSession : undefined"))
    assert.ok(block.includes("void check(true)"))
    assert.ok(block.includes('document.addEventListener("visibilitychange", onVisible)'))
    assert.ok(block.includes("void check(false)"))
    assert.ok(block.includes("removeEventListener"))
    assert.ok(!/setInterval|setTimeout/.test(block), "no polling")
  })

  it("it no longer opens the temporary success alert: the persistent Verified card (reloaded after the approval) is the notification, and no new markup is built", () => {
    assert.ok(block.includes('startAlertReconcile(["verified", "home_country_updated"])'))
    assert.ok(!block.includes("setSuccessAlertOpen"))
    assert.ok(!block.includes("<"), "no JSX in the effect")
    assert.equal(
      page.split("All set! Your identity and location are verified.").length - 1,
      1,
      "one alert, reused"
    )
    assert.ok(page.includes("You now have full access to all features."))
  })

  it("it runs for talents only and never sets the alert from the marker alone", () => {
    assert.ok(block.includes("resolveDashboardRole(user) !== ROLE.TALENT"))
    assert.ok(block.includes('if (outcome !== "approved") return'))
    assert.ok(!block.includes("hasReviewedResult"), "the page never decides from the marker")
  })

  it("a home-country result keeps its own flow: the generic alert swap and notification are untouched", () => {
    assert.ok(page.includes('successAlertKind === "home-country-updated"'))
    assert.ok(page.includes("setHomeCountryUpdatedOpen(true)"))
  })
})
