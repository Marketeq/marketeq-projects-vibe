// Run: npx tsc src/lib/api/trip-account-guard.test.ts --outDir <tmp> --module commonjs
//   --target es2020 --skipLibCheck --esModuleInterop --types node && node --test <tmp>
// (the frontend has no test runner; node:test needs none.)
//
// The account-switch window: the signed-in account changes while a Didit overlay is open. The real
// overlay adapter and the real watcher / guard are driven with a fake SDK and a fake "who is signed
// in" read; the host's side effects are counted.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, it } from "node:test"
import {
  closeDiditOverlay,
  isDiditOverlayActive,
  openDiditOverlay,
  subscribeDiditOverlay,
  type DiditOverlayEvent,
} from "./didit-overlay"
import { createTripAccountGuard, createTripWatcher } from "./trip-account-guard"

const URL_OK = "https://verify.didit.me/session/qa-token"
const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")

interface FakeSdk {
  onComplete: ((r: unknown) => void) | undefined
  onEvent: ((e: unknown) => void) | undefined
  onStateChange: ((s: string) => void) | undefined
  startVerification: () => Promise<void>
  destroy: () => void
  destroyed: number
}
const fakeSdk = (): FakeSdk => {
  const sdk: FakeSdk = {
    onComplete: undefined, onEvent: undefined, onStateChange: undefined, destroyed: 0,
    async startVerification() {},
    destroy() { sdk.destroyed += 1 },
  }
  return sdk
}

// A host-in-miniature: the same wiring as the real host, with counters for everything it must not do.
function world(initialAccount: string | null) {
  const w = {
    signedIn: initialAccount as string | null,
    authReads: 0,
    reconciles: 0, confirms: 0, sessions: 0, navigations: 0, dialogsOpened: 0,
    markers: { awaiting: true, origin: true, homeChange: true, retryOccurrence: true },
    handled: [] as DiditOverlayEvent[],
    aborted: 0,
    disposed: false,
    visible: true,
    sdk: fakeSdk(),
    now: 10_000,
  }
  const guard = createTripAccountGuard({
    readCurrentAccountId: async () => { w.authReads += 1; return w.signedIn },
    now: () => w.now,
  })
  const abort = () => {
    w.aborted += 1
    closeDiditOverlay()
    w.markers = { awaiting: false, origin: false, homeChange: false, retryOccurrence: false }
  }
  const watcher = createTripWatcher({
    guard, accountId: "A", isOverlayActive: isDiditOverlayActive,
    isTabVisible: () => w.visible, isDisposed: () => w.disposed, abort,
  })
  // what the host does with an accepted result: a reconcile (completed) or a reopen (dismissed)
  const handle = (e: DiditOverlayEvent) => {
    w.handled.push(e)
    if (e.type === "completed") w.reconciles += 1
    else w.dialogsOpened += 1
  }
  const unsub = subscribeDiditOverlay((e) => void watcher.accept(e, handle))
  return { w, watcher, unsub, open: () => openDiditOverlay(URL_OK, { loadSdk: async () => w.sdk, redirect: () => { w.navigations += 1 } }) }
}

let cleanup: Array<() => void> = []
beforeEach(() => { closeDiditOverlay(); (globalThis as { window?: unknown }).window = {} })
afterEach(() => { cleanup.forEach((c) => c()); cleanup = []; closeDiditOverlay(); delete (globalThis as { window?: unknown }).window })

describe("the signed-in account is checked, with one read", () => {
  it("same / changed / signed out / unknown", async () => {
    let id: string | null | Error = "A"
    const g = createTripAccountGuard({ readCurrentAccountId: async () => { if (id instanceof Error) throw id; return id }, minGapMs: 0 })
    assert.equal(await g.check("A", { fresh: true }), "same")
    id = "B"; assert.equal(await g.check("A", { fresh: true }), "changed")
    id = null; assert.equal(await g.check("A", { fresh: true }), "changed")
    id = new Error("down"); assert.equal(await g.check("A", { fresh: true }), "unknown")
  })

  it("6. simultaneous focus and visibility events make one read; repeats inside the gap reuse it", async () => {
    const x = world("A")
    cleanup.push(x.unsub)
    await x.open()
    await Promise.all([x.watcher.onTabReturn(), x.watcher.onTabReturn(), x.watcher.onTabReturn()])
    assert.equal(x.w.authReads, 1)
    await x.watcher.onTabReturn()
    await x.watcher.onTabReturn()
    assert.equal(x.w.authReads, 1) // reused inside the gap
    x.w.now += 1500 // a real later return reads again
    await x.watcher.onTabReturn()
    assert.equal(x.w.authReads, 2)
    assert.equal(x.w.aborted, 0)
  })

  it("no overlay, no read: nothing runs unless a Didit overlay is active, and a hidden tab does nothing", async () => {
    const x = world("A")
    cleanup.push(x.unsub)
    await x.watcher.onTabReturn() // no overlay
    assert.equal(x.w.authReads, 0)
    await x.open()
    x.w.visible = false
    await x.watcher.onTabReturn()
    assert.equal(x.w.authReads, 0)
  })
})

describe("account A opens Didit and the session becomes B's", () => {
  it("1+4. a focus / visibility return closes Didit, clears every marker and retry state, and navigates nowhere", async () => {
    const x = world("A")
    cleanup.push(x.unsub)
    assert.equal(await x.open(), "overlay")
    assert.equal(isDiditOverlayActive(), true)
    x.w.signedIn = "B" // cookies replaced, no sign-out
    await x.watcher.onTabReturn()
    assert.equal(isDiditOverlayActive(), false)
    assert.equal(x.w.sdk.destroyed, 1)
    assert.equal(x.w.aborted, 1)
    assert.deepEqual(x.w.markers, { awaiting: false, origin: false, homeChange: false, retryOccurrence: false })
    assert.equal(x.w.navigations, 0)
  })

  it("2+3. a late callback from A is ignored, and nothing is reconciled, confirmed, started or opened", async () => {
    const x = world("A")
    cleanup.push(x.unsub)
    await x.open()
    const late = x.w.sdk.onComplete
    x.w.signedIn = "B"
    await x.watcher.onTabReturn()
    late?.({ type: "completed" }) // the SDK's own stale handle
    late?.({ type: "cancelled" })
    await new Promise((r) => setTimeout(r, 10))
    assert.deepEqual(x.w.handled, [])
    assert.equal(x.w.reconciles + x.w.confirms + x.w.sessions + x.w.dialogsOpened + x.w.navigations, 0)
  })

  it("a callback that arrives before any focus event is still checked, and dropped if the account changed", async () => {
    const x = world("A")
    cleanup.push(x.unsub)
    await x.open()
    x.w.signedIn = "B"
    x.w.sdk.onEvent?.({ type: "didit:ready" })
    x.w.sdk.onComplete?.({ type: "completed", session: { status: "Approved" } })
    await new Promise((r) => setTimeout(r, 10))
    assert.deepEqual(x.w.handled, []) // never reconciled for the wrong account
    assert.equal(x.w.reconciles, 0)
    assert.equal(x.w.aborted, 1)
    assert.deepEqual(x.w.markers, { awaiting: false, origin: false, homeChange: false, retryOccurrence: false })
  })

  it("signed out (no account) and an unreadable auth read both fail safe: closed, nothing changed", async () => {
    for (const next of [null, "READ_FAILS"] as const) {
      closeDiditOverlay()
      const x = world("A")
      await x.open()
      if (next === null) x.w.signedIn = null
      else (x.w as { signedIn: string | null }).signedIn = "A"
      const failing = createTripAccountGuard({ readCurrentAccountId: async () => { if (next === "READ_FAILS") throw new Error("offline"); return null }, minGapMs: 0 })
      let aborted = 0
      const watcher = createTripWatcher({ guard: failing, accountId: "A", isOverlayActive: isDiditOverlayActive, isTabVisible: () => true, isDisposed: () => false, abort: () => { aborted += 1; closeDiditOverlay() } })
      await watcher.onTabReturn()
      assert.equal(aborted, 1, String(next))
      assert.equal(isDiditOverlayActive(), false)
      assert.equal(x.w.reconciles + x.w.sessions + x.w.confirms, 0)
      x.unsub()
    }
  })

  it("5. account B can start its own verification afterwards", async () => {
    const a = world("A")
    cleanup.push(a.unsub)
    await a.open()
    a.w.signedIn = "B"
    await a.watcher.onTabReturn()
    assert.equal(isDiditOverlayActive(), false)
    const b = world("B") // B's host, B's SDK
    cleanup.push(b.unsub)
    const opened = await openDiditOverlay(URL_OK, { loadSdk: async () => b.w.sdk, redirect: () => {} })
    assert.equal(opened, "overlay")
    assert.equal(isDiditOverlayActive(), true)
  })
})

describe("the same account returning to the tab", () => {
  it("7. keeps Didit open, changes nothing, and still accepts its result", async () => {
    const x = world("A")
    cleanup.push(x.unsub)
    await x.open()
    await x.watcher.onTabReturn()
    assert.equal(isDiditOverlayActive(), true)
    assert.equal(x.w.aborted, 0)
    assert.equal(x.w.sdk.destroyed, 0)
    assert.deepEqual(x.w.markers, { awaiting: true, origin: true, homeChange: true, retryOccurrence: true })
    x.w.sdk.onEvent?.({ type: "didit:ready" })
    x.w.sdk.onComplete?.({ type: "completed" })
    await new Promise((r) => setTimeout(r, 10))
    assert.deepEqual(x.w.handled, [{ type: "completed" }])
    assert.equal(x.w.reconciles, 1)
  })
})

describe("the host wiring", () => {
  const host = read("contexts/identity-verification-host.tsx")
  it("no polling: the checks run only from focus / visibility and before a callback is accepted", () => {
    const block = host.slice(host.indexOf("const watcher = createTripWatcher"), host.indexOf("removeGate()", host.indexOf("const watcher = createTripWatcher")))
    assert.doesNotMatch(block, /setInterval|setTimeout/)
    assert.match(block, /addEventListener\("visibilitychange"/)
    assert.match(block, /addEventListener\("focus"/)
    assert.match(block, /watcher\.accept\(event, handleOverlayEvent\)/)
    assert.match(block, /removeEventListener\("visibilitychange"/)
  })
  it("abort drops the overlay, the markers and the retry occurrence, and touches no backend", () => {
    const abort = host.slice(host.indexOf("const abortDiditTrip = useCallback"), host.indexOf("const abortDiditTrip = useCallback") + 700)
    for (const re of [/closeDiditOverlay\(\)/, /diditLifecycle\.discard\(\)/, /clearAwaitingResult/, /clearHomeCountryChange/, /clearReturnOrigins\(window\.localStorage, userId\)/, /acknowledgeRetryGate\(\)/]) assert.match(abort, re)
    assert.doesNotMatch(abort, /reconcile|confirmHomeCountry|startFreeKyc|startIdentityOnly|openDiditOverlay|router\.|location\./)
  })
  it("the auth read is the canonical GET /user/me", () => {
    assert.match(read("src/lib/api/trip-account-guard.ts"), /import\("@\/service\/http\/user"\)[\s\S]*UserAPI\.me\(\)/)
  })
})
