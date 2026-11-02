// Run: npx tsc src/lib/api/didit-launch-lifecycle.test.ts --outDir <tmp> --module commonjs
//   --target es2020 --skipLibCheck --esModuleInterop --types node && node --test <tmp>
// (the frontend has no test runner; node:test needs none.)
//
// The shared host, modelled: a flow that is open and rendered, the lifecycle that closes it
// before Didit is shown, and the real adapter driving a fake SDK.
import assert from "node:assert/strict"
import { afterEach, beforeEach, describe, it } from "node:test"
import {
  closeDiditOverlay,
  openDiditOverlay,
  setDiditPresentationGate,
  subscribeDiditOverlay,
  waitForClosingDialogsToLeave,
} from "./didit-overlay"
import { createDiditLifecycle } from "./didit-launch-lifecycle"

const URL_OK = "https://verify.didit.me/session/SECRET-TOKEN-123"
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function makeHost() {
  const host = {
    flowOpen: true, // the `open` prop
    flowRendered: true, // Radix keeps it mounted until its exit animation ends
    gateOpen: false,
    gateRendered: false,
    confirmCalls: 0,
    sessionCalls: 0,
    pathname: "/my-jobs",
    renderedAtPresent: [] as boolean[], // flow/gate rendered at each startVerification
    redirects: [] as string[],
    flowOpens: 0,
    exitAnimationTicks: 1,
    stuck: false,
  }
  const lifecycle = createDiditLifecycle({
    getFlowOpen: () => host.flowOpen,
    getGateOpen: () => host.gateOpen,
    setFlowOpen: (open) => {
      if (open) {
        host.flowOpens += 1
        host.flowRendered = true
      }
      host.flowOpen = open
    },
    setGateOpen: (open) => {
      if (open) host.gateRendered = true
      host.gateOpen = open
    },
    waitForExit: async () => {
      // the exit animation: still rendered for a while after the prop went false
      for (let i = 0; i < host.exitAnimationTicks; i += 1) await Promise.resolve()
      if (host.stuck) return false // the dialog never leaves; the cap expired
      if (!host.flowOpen) host.flowRendered = false
      if (!host.gateOpen) host.gateRendered = false
      return true
    },
  })
  return { host, lifecycle }
}

interface FakeSdk {
  onComplete: ((r: unknown) => void) | undefined
  onEvent: ((e: unknown) => void) | undefined
  onStateChange: ((s: string) => void) | undefined
  starts: number
  fail?: boolean
  startVerification: () => Promise<void>
  destroy: () => void
}

let unsubs: Array<() => void> = []
let events: string[] = []

function wire(host: ReturnType<typeof makeHost>) {
  unsubs.push(setDiditPresentationGate(host.lifecycle.beforePresent))
  unsubs.push(
    subscribeDiditOverlay((e) => {
      events.push(e.type === "completed" ? "completed" : `dismissed:${e.reason}`)
      if (e.type === "completed") host.lifecycle.discard()
      else host.lifecycle.reopen()
    })
  )
}

function fakeSdk(host: ReturnType<typeof makeHost>): FakeSdk {
  const sdk: FakeSdk = {
    onComplete: undefined,
    onEvent: undefined,
    onStateChange: undefined,
    starts: 0,
    async startVerification() {
      if (sdk.fail) throw new Error("boom")
      sdk.starts += 1
      host.host.renderedAtPresent.push(host.host.flowRendered || host.host.gateRendered)
    },
    destroy() {},
  }
  return sdk
}

// "Yes, this is my home country": confirm once, create/resume one session, then launch.
async function clickYes(
  h: ReturnType<typeof makeHost>,
  sdk: FakeSdk,
  timeoutMs = 5000
) {
  h.host.confirmCalls += 1
  h.host.sessionCalls += 1
  return openDiditOverlay(URL_OK, {
    loadSdk: async () => sdk,
    redirect: (u) => h.host.redirects.push(u),
    readyTimeoutMs: timeoutMs,
  })
}

beforeEach(() => {
  closeDiditOverlay()
  events = []
  ;(globalThis as { window?: unknown }).window = {}
})
afterEach(() => {
  unsubs.forEach((u) => u())
  unsubs = []
  closeDiditOverlay()
  delete (globalThis as { window?: unknown }).window
})

describe("Didit launch lifecycle", () => {
  it("1+2. Yes closes the location flow before Didit is presented; never both", async () => {
    const h = makeHost()
    wire(h)
    const sdk = fakeSdk(h)
    h.host.exitAnimationTicks = 5
    await clickYes(h, sdk)
    assert.equal(sdk.starts, 1)
    assert.deepEqual(h.host.renderedAtPresent, [false]) // nothing of the flow rendered
    assert.equal(h.host.flowOpen, false)
  })

  it("3. cancellation reopens the flow exactly once, on the same instance", async () => {
    const h = makeHost()
    wire(h)
    const sdk = fakeSdk(h)
    await clickYes(h, sdk)
    sdk.onEvent?.({ type: "didit:ready" })
    sdk.onComplete?.({ type: "cancelled" })
    sdk.onComplete?.({ type: "cancelled" })
    assert.deepEqual(events, ["dismissed:cancelled"])
    assert.equal(h.host.flowOpen, true)
    assert.equal(h.host.flowOpens, 1)
  })

  it("4. completion does not reopen it", async () => {
    const h = makeHost()
    wire(h)
    const sdk = fakeSdk(h)
    await clickYes(h, sdk)
    sdk.onEvent?.({ type: "didit:ready" })
    sdk.onComplete?.({ type: "completed" })
    assert.deepEqual(events, ["completed"])
    assert.equal(h.host.flowOpen, false)
    assert.equal(h.host.flowOpens, 0)
  })

  it("5. failure before presentation falls back with the flow already closed", async () => {
    const h = makeHost()
    wire(h)
    const sdk = fakeSdk(h)
    sdk.fail = true // the SDK throws when started, before anything was shown
    let flowRenderedAtRedirect: boolean | null = null
    const out = await openDiditOverlay(URL_OK, {
      loadSdk: async () => sdk,
      redirect: (u) => {
        flowRenderedAtRedirect = h.host.flowRendered
        h.host.redirects.push(u)
      },
    })
    await sleep(5)
    assert.equal(out, "redirect")
    assert.deepEqual(h.host.redirects, [URL_OK])
    assert.equal(flowRenderedAtRedirect, false)
    assert.equal(h.host.flowOpens, 0) // not reopened, not stacked
  })

  it("5b. an SDK that cannot even load also closes the flow before redirecting", async () => {
    const h = makeHost()
    wire(h)
    let flowRenderedAtRedirect: boolean | null = null
    await openDiditOverlay(URL_OK, {
      loadSdk: async () => {
        throw new Error("chunk failed")
      },
      redirect: (u) => {
        flowRenderedAtRedirect = h.host.flowRendered
        h.host.redirects.push(u)
      },
    })
    await sleep(5)
    assert.deepEqual(h.host.redirects, [URL_OK])
    assert.equal(flowRenderedAtRedirect, false)
  })

  it("5c. the readiness timeout redirects once, flow stays closed, late completion ignored", async () => {
    const h = makeHost()
    wire(h)
    const sdk = fakeSdk(h)
    await clickYes(h, sdk, 20)
    const late = sdk.onComplete
    await sleep(60)
    late?.({ type: "completed" })
    assert.deepEqual(h.host.redirects, [URL_OK])
    assert.deepEqual(events, [])
    assert.equal(h.host.flowOpens, 0)
  })

  it("6. a recoverable failure after presentation reopens the flow", async () => {
    for (const kind of ["cameraAccessDenied", "networkError", "sessionExpired", "unknown"]) {
      closeDiditOverlay()
      events = []
      const h = makeHost()
      wire(h)
      const sdk = fakeSdk(h)
      await clickYes(h, sdk)
      sdk.onEvent?.({ type: "didit:ready" })
      sdk.onComplete?.({ type: "failed", error: { type: kind, message: "x" } })
      assert.deepEqual(events, [`dismissed:${kind}`])
      assert.equal(h.host.flowOpen, true)
      assert.equal(h.host.flowOpens, 1)
      unsubs.forEach((u) => u())
      unsubs = []
    }
  })

  it("7. a double click presents Didit once and closes the flow once", async () => {
    const h = makeHost()
    wire(h)
    const sdk = fakeSdk(h)
    const [a, b] = await Promise.all([clickYes(h, sdk), clickYes(h, sdk)])
    assert.deepEqual([a, b].sort(), ["busy", "overlay"])
    assert.equal(sdk.starts, 1)
    sdk.onEvent?.({ type: "didit:ready" })
    sdk.onComplete?.({ type: "cancelled" })
    assert.equal(h.host.flowOpens, 1)
  })

  it("8. logout / account switch while Didit is open never reopens the old flow", async () => {
    const h = makeHost()
    wire(h)
    const sdk = fakeSdk(h)
    await clickYes(h, sdk)
    sdk.onEvent?.({ type: "didit:ready" })
    const stale = sdk.onComplete
    closeDiditOverlay() // the host's reset
    h.lifecycle.discard()
    stale?.({ type: "cancelled" })
    stale?.({ type: "completed" })
    assert.deepEqual(events, [])
    assert.equal(h.host.flowOpen, false)
    assert.equal(h.host.flowOpens, 0)
  })

  it("9+10. the route is untouched, and no second session or confirmation is made", async () => {
    const h = makeHost()
    wire(h)
    const sdk = fakeSdk(h)
    await clickYes(h, sdk)
    sdk.onEvent?.({ type: "didit:ready" })
    sdk.onComplete?.({ type: "cancelled" })
    assert.equal(h.host.pathname, "/my-jobs")
    assert.deepEqual(h.host.redirects, [])
    assert.equal(h.host.confirmCalls, 1)
    assert.equal(h.host.sessionCalls, 1)
    assert.equal(sdk.starts, 1)
  })

  it("a gate-launched Didit (no flow) closes and restores the gate instead", async () => {
    const h = makeHost()
    h.host.flowOpen = false
    h.host.flowRendered = false
    h.host.gateOpen = true
    h.host.gateRendered = true
    wire(h)
    const sdk = fakeSdk(h)
    await clickYes(h, sdk)
    assert.deepEqual(h.host.renderedAtPresent, [false])
    sdk.onEvent?.({ type: "didit:ready" })
    sdk.onComplete?.({ type: "cancelled" })
    assert.equal(h.host.gateOpen, true)
    assert.equal(h.host.flowOpens, 0)
  })

  it("a dialog that stays mounted past the cap: Didit is never presented, one redirect, no reopen, no new session", async () => {
    const h = makeHost()
    h.host.stuck = true
    wire(h)
    const sdk = fakeSdk(h)
    const out = await clickYes(h, sdk)
    await sleep(5)
    assert.equal(out, "redirect")
    assert.equal(sdk.starts, 0) // startVerification never called
    assert.deepEqual(h.host.redirects, [URL_OK]) // exactly once
    assert.equal(h.host.flowOpens, 0) // not reopened before leaving
    assert.deepEqual(events, []) // no terminal event: the redirect is the outcome
    assert.equal(h.host.confirmCalls, 1)
    assert.equal(h.host.sessionCalls, 1)
    assert.equal(h.host.redirects.length, 1)
    // a late callback from anything cannot add a second outcome
    sdk.onComplete?.({ type: "completed" })
    assert.deepEqual(events, [])
    assert.equal(h.host.redirects.length, 1)
  })

  it("nothing open at launch: nothing is closed and nothing is reopened", async () => {
    const h = makeHost()
    h.host.flowOpen = false
    h.host.flowRendered = false
    wire(h)
    const sdk = fakeSdk(h)
    await clickYes(h, sdk)
    sdk.onEvent?.({ type: "didit:ready" })
    sdk.onComplete?.({ type: "cancelled" })
    assert.equal(h.host.flowOpens, 0)
    assert.equal(h.host.gateOpen, false)
  })
})

describe("waitForClosingDialogsToLeave", () => {
  it("resolves at once when no dialog is closing (one that is open is not waited on)", async () => {
    const doc = {
      querySelectorAll: (sel: string) =>
        sel.includes('data-state="closed"') ? [] : [{ isConnected: true }],
    } as unknown as Document
    assert.equal(await waitForClosingDialogsToLeave(doc, 1000), true)
  })

  it("the cap expiring with the dialog still mounted resolves false, not as success", async () => {
    const dialog = { isConnected: true }
    ;(globalThis as { MutationObserver?: unknown }).MutationObserver = class {
      constructor(_cb: () => void) {}
      observe() {}
      disconnect() {}
    }
    const doc = { querySelectorAll: () => [dialog], body: {} } as unknown as Document
    assert.equal(await waitForClosingDialogsToLeave(doc, 20), false)
    delete (globalThis as { MutationObserver?: unknown }).MutationObserver
  })

  it("waits for the closing dialog to leave the DOM, then resolves true", async () => {
    const dialog = { isConnected: true }
    let notify: () => void = () => {}
    ;(globalThis as { MutationObserver?: unknown }).MutationObserver = class {
      constructor(cb: () => void) {
        notify = cb
      }
      observe() {}
      disconnect() {}
    }
    const doc = {
      querySelectorAll: () => [dialog],
      body: {},
    } as unknown as Document
    let resolved = false
    const p = waitForClosingDialogsToLeave(doc, 5000).then((ok) => {
      assert.equal(ok, true)
      resolved = true
    })
    await sleep(10)
    assert.equal(resolved, false)
    dialog.isConnected = false
    notify()
    await p
    assert.equal(resolved, true)
    delete (globalThis as { MutationObserver?: unknown }).MutationObserver
  })
})
