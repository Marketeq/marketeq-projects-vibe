// Run like detected-location.test.ts (from the frontend/ directory).
//
// The returning-user popups' recovery rules: what marks a login as answered, what an
// unfinished flow leaves behind, and what a new login or an unlocked claim changes.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  shouldShowLocationMismatchPrompt,
  shouldShowTravelerLocationPrompt,
} from "./location-mismatch"
import { parseIdentityVerificationSummary } from "./identity-verification-state"
import {
  createTravelerPromptHandled,
  markTravelerPromptShown,
  mismatchFlowCompleted,
  shouldOfferTravelerPrompt,
  travelLocationPromptKey,
} from "./travel-location-prompt"
import type { DismissalStorage } from "./travel-expiry-popup"

function memoryStorage(): DismissalStorage & { dump: () => Record<string, string> } {
  const map = new Map<string, string>()
  return {
    get length() { return map.size },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    dump: () => Object.fromEntries(map),
  }
}
const KEY_A = "a".repeat(64) // one login
const KEY_B = "b".repeat(64) // the next login, or another account
const summary = (over: Record<string, unknown> = {}) =>
  parseIdentityVerificationSummary({ nextAction: "complete", status: "verified", ...over })
const offered = (over: Record<string, unknown>, storage: DismissalStorage) =>
  shouldOfferTravelerPrompt({ summary: summary({ travelModeLocationMismatch: true, ...over }), storage })

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = read("app", "(group)", "talent-dashboard", "page.tsx")
const between = (source: string, from: string, to: string) =>
  source.slice(source.indexOf(from), source.indexOf(to, source.indexOf(from)))

describe("opening a flow from the popup writes nothing", () => {
  it("'I’m still traveling' (duration flow) and 'Change my home country' write no marker when they open the flow", () => {
    const open = between(page, "const openFlowFromMismatch", "const handleIdentityFlowOpenChange")
    assert.ok(!/markTravelerPromptShown|markTravelerPromptCompleted|localStorage/.test(open))
    const still = between(page, "const handleStillTraveling", "const handleTravelerStillTraveling")
    const change = between(page, "const handleChangeHomeCountry", "const vpnProxyModalCopy")
    for (const handler of [still, change]) {
      assert.ok(!/markTravelerPromptShown|markTravelerPromptCompleted|localStorage|IdentityVerificationAPI|recordTravel/.test(handler))
    }
  })
  it("the only code that writes the marker is the completion helper", () => {
    assert.equal((page.match(/markTravelerPromptShown\(/g) ?? []).length, 1)
    assert.equal((page.match(/markTravelerPromptCompleted\(/g) ?? []).length, 2) // the two completion callers
  })
})

describe("closing the duration flow before choosing a duration", () => {
  it("is not a completion: no marker, the popup is offered again", () => {
    // Backend unchanged by the close: Travel Mode still off, the original mismatch signal.
    const fresh = summary({ locationMismatch: true, loginSessionKey: KEY_A })
    assert.equal(mismatchFlowCompleted("traveling", fresh), false)
    const storage = memoryStorage()
    assert.deepEqual(storage.dump(), {})
    assert.equal(shouldShowLocationMismatchPrompt(fresh), true)
  })
  it("an unreadable /me after the close is not a completion either", () => {
    assert.equal(mismatchFlowCompleted("traveling", null), false)
  })
})

describe("a successful duration save marks the current login", () => {
  const activated = summary({ travelModeLocationMismatch: true, loginSessionKey: KEY_A })
  it("the backend now reports Travel Mode in force at a foreign country: the flow completed", () => {
    assert.equal(mismatchFlowCompleted("traveling", activated), true)
  })
  it("the page marks the login only on completion, and releases the hold otherwise", () => {
    const handler = between(page, "const handleIdentityFlowOpenChange", "const handleStillTraveling")
    assert.ok(/if \(mismatchFlowCompleted\(kind, fresh\)\) \{\s*markTravelerPromptCompleted\(/.test(handler))
    assert.ok(/\} else \{\s*travelerPromptHandledRef\.current\.reset\(\)/.test(handler))
    assert.ok(handler.includes("if (open || kind === null) return"), "flows opened by anything else are untouched")
  })
  it("a refresh after the activation stays quiet; the home country is not part of any write here", () => {
    const storage = memoryStorage()
    assert.equal(offered({ loginSessionKey: KEY_A }, storage), true) // the post-activation state, unmarked
    markTravelerPromptShown(KEY_A, storage) // what the completion writes
    assert.equal(offered({ loginSessionKey: KEY_A }, storage), false)
    assert.deepEqual(Object.keys(storage.dump()), [travelLocationPromptKey(KEY_A)])
  })
})

describe("Change my home country that is closed before confirming", () => {
  it("is never a completion, whatever the backend says afterwards", () => {
    const fresh = summary({ travelModeLocationMismatch: true, loginSessionKey: KEY_A })
    assert.equal(mismatchFlowCompleted("change-country", fresh), false)
    assert.equal(mismatchFlowCompleted(null, fresh), false)
  })
  it("the in-memory hold taken when the flow opened is cleared, so the decision is available again", () => {
    const handled = createTravelerPromptHandled()
    handled.markHandled(KEY_A) // the flow opened
    assert.equal(handled.isHandled(KEY_A), true) // a summary read behind it cannot reopen the popup
    handled.reset() // the flow closed unfinished
    assert.equal(handled.isHandled(KEY_A), false)
  })
  it("no marker was written meanwhile, so a refresh offers the popup again", () => {
    assert.equal(offered({ loginSessionKey: KEY_A }, memoryStorage()), true)
  })
})

describe("the in-memory hold never crosses a login", () => {
  it("a new loginSessionKey drops it (a logout and login that keeps the page mounted)", () => {
    const handled = createTravelerPromptHandled()
    handled.markHandled(KEY_A)
    assert.equal(handled.isHandled(KEY_A), true)
    assert.equal(handled.isHandled(KEY_B), false)
    assert.equal(handled.isHandled(KEY_A), false, "going back does not resurrect the old login's hold")
  })
  it("a key that appears or disappears is a different login too", () => {
    const handled = createTravelerPromptHandled()
    handled.markHandled(null)
    assert.equal(handled.isHandled(null), true)
    assert.equal(handled.isHandled(KEY_A), false)
  })
  it("the page asks the holder with the CURRENT summary's key", () => {
    assert.ok(page.includes("travelerPromptHandledRef.current.isHandled(travelSummary.loginSessionKey)"))
    assert.ok(!/document\.cookie|readSessionId/.test(page))
  })
})

describe("the per-login marker", () => {
  it("a same-login refresh respects it", () => {
    const storage = memoryStorage()
    markTravelerPromptShown(KEY_A, storage)
    assert.equal(offered({ loginSessionKey: KEY_A }, storage), false)
  })
  it("a genuinely new login (new key) is offered again and keeps exactly one marker", () => {
    const storage = memoryStorage()
    markTravelerPromptShown(KEY_A, storage)
    assert.equal(offered({ loginSessionKey: KEY_B }, storage), true)
    markTravelerPromptShown(KEY_B, storage)
    assert.deepEqual(Object.keys(storage.dump()), [travelLocationPromptKey(KEY_B)])
  })
  it("another account cannot reuse it: its key differs, even in the same browser", () => {
    const storage = memoryStorage()
    markTravelerPromptShown(KEY_A, storage)
    assert.equal(offered({ loginSessionKey: KEY_B }, storage), true)
  })
  it("a missing or malformed key fails safely: offered, and nothing is persisted", () => {
    const storage = memoryStorage()
    for (const loginSessionKey of [undefined, "", "not-a-digest", "A".repeat(64), "a".repeat(63), 7]) {
      assert.equal(offered({ loginSessionKey }, storage), true)
    }
    markTravelerPromptShown(null, storage)
    assert.deepEqual(storage.dump(), {})
  })
  it("a stale or corrupt stored value never hides the popup", () => {
    const storage = memoryStorage()
    storage.setItem(travelLocationPromptKey(KEY_A), "true")
    storage.setItem("travelLocationPromptShown:", "1")
    assert.equal(offered({ loginSessionKey: KEY_A }, storage), true)
  })
})

describe("an active traveler's 'I’m still traveling'", () => {
  const handler = between(page, "const handleTravelerStillTraveling", "const handleChangeHomeCountry")
  it("confirms the status and closes: it never opens the duration picker", () => {
    assert.ok(!/setIdentityFlowOpen|openFlowFromMismatch|recordTravelDuration/.test(handler))
  })
  it("drops a claim only when there is one, and marks the login only after that succeeded", () => {
    assert.ok(handler.indexOf("pendingHomeCountry") < handler.indexOf("recordTravelClassification("))
    assert.ok(handler.indexOf("recordTravelClassification(") < handler.indexOf("markTravelerPromptCompleted("))
  })
})

describe("a home-country claim without a live session no longer locks the user out", () => {
  // The backend sends pendingHomeCountry for the claim, and only reaches the prompts when
  // nothing is running or in review. After an abandoned session the next step is a new one.
  const abandoned = (over: Record<string, unknown> = {}) =>
    summary({
      nextAction: "start_identity",
      status: "unstarted",
      pendingHomeCountry: "CA",
      loginSessionKey: KEY_A,
      ...over,
    })
  it("the first-time gate no longer hides the decision for a returning user with a claim", () => {
    assert.equal(shouldShowLocationMismatchPrompt(abandoned({ locationMismatch: true })), true)
    assert.equal(shouldShowTravelerLocationPrompt(abandoned({ travelModeLocationMismatch: true })), true)
  })
  it("a first-time user (no claim) is still left to the gate", () => {
    const firstTime = abandoned({ pendingHomeCountry: undefined, locationMismatch: true, travelModeLocationMismatch: true })
    assert.equal(shouldShowLocationMismatchPrompt(firstTime), false)
    assert.equal(shouldShowTravelerLocationPrompt(firstTime), false)
  })
  it("the 'three attempts' dialog still owns the screen", () => {
    const cooling = abandoned({
      nextAction: "wait_for_retry",
      status: "failed_final",
      retryAvailableAt: new Date(Date.now() + 3600_000).toISOString(),
      locationMismatch: true,
      travelModeLocationMismatch: true,
    })
    assert.equal(shouldShowLocationMismatchPrompt(cooling), false)
    assert.equal(shouldShowTravelerLocationPrompt(cooling), false)
  })
})
