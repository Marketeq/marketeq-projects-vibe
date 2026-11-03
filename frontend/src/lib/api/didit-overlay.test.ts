// Run: npx tsc src/lib/api/didit-overlay.test.ts --outDir <tmp> --module commonjs
//   --target es2020 --skipLibCheck --esModuleInterop --types node && node --test <tmp>
// (the frontend has no test runner; node:test needs none.)
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, it } from "node:test"
import {
  closeDiditOverlay,
  DIDIT_OVERLAY_Z_INDEX,
  isDiditOverlayActive,
  openDiditOverlay,
  subscribeDiditOverlay,
  type DiditOverlayEvent,
} from "./didit-overlay"

const URL_OK = "https://verify.didit.me/session/SECRET-TOKEN-123"
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface FakeSdk {
  onComplete: ((r: unknown) => void) | undefined
  onEvent: ((e: unknown) => void) | undefined
  onStateChange: ((s: string) => void) | undefined
  startCalls: Array<{ url: string; configuration: Record<string, unknown> }>
  destroyed: number
  failStart?: boolean
  startVerification: (o: {
    url: string
    configuration: Record<string, unknown>
  }) => Promise<void>
  destroy: () => void
}

function fakeSdk(): FakeSdk {
  const sdk: FakeSdk = {
    onComplete: undefined,
    onEvent: undefined,
    onStateChange: undefined,
    startCalls: [],
    destroyed: 0,
    async startVerification(o) {
      sdk.startCalls.push(o)
      if (sdk.failStart) throw new Error("boom")
    },
    destroy() {
      sdk.destroyed += 1
    },
  }
  return sdk
}

let events: DiditOverlayEvent[] = []
let unsubscribe: () => void = () => {}
let redirects: string[] = []
const logs: string[] = []
const realConsole = { log: console.log, error: console.error, warn: console.warn }

beforeEach(() => {
  closeDiditOverlay()
  events = []
  redirects = []
  logs.length = 0
  unsubscribe = subscribeDiditOverlay((e) => events.push(e))
  const capture = (...a: unknown[]) => logs.push(a.map(String).join(" "))
  console.log = capture
  console.error = capture
  console.warn = capture
  ;(globalThis as { window?: unknown }).window = {}
})
afterEach(() => {
  unsubscribe()
  closeDiditOverlay()
  Object.assign(console, realConsole)
  delete (globalThis as { window?: unknown }).window
})

const open = (sdk: FakeSdk, timeout = 40) =>
  openDiditOverlay(URL_OK, {
    loadSdk: async () => sdk,
    redirect: (u) => redirects.push(u),
    readyTimeoutMs: timeout,
  })

describe("didit overlay adapter", () => {
  it("loads the SDK only when a session starts", async () => {
    let loads = 0
    assert.equal(loads, 0)
    await openDiditOverlay(URL_OK, {
      loadSdk: async () => {
        loads += 1
        return fakeSdk()
      },
      redirect: (u) => redirects.push(u),
    })
    assert.equal(loads, 1)
    const src = readFileSync(join(process.cwd(), "src/lib/api/didit-overlay.ts"), "utf8")
    assert.match(src, /await import\("@didit-protocol\/sdk-web"\)/)
    assert.doesNotMatch(src, /^import .*sdk-web/m)
  })

  it("uses the exact explicit configuration", async () => {
    const sdk = fakeSdk()
    assert.equal(await open(sdk), "overlay")
    assert.equal(sdk.startCalls.length, 1)
    assert.equal(sdk.startCalls[0].url, URL_OK)
    assert.deepEqual(sdk.startCalls[0].configuration, {
      closeModalOnComplete: true,
      showCloseButton: true,
      showExitConfirmation: true,
      zIndex: DIDIT_OVERLAY_Z_INDEX,
      loggingEnabled: false,
    })
  })

  it("completion reports 'completed' once, destroys the SDK, never trusts the status", async () => {
    const sdk = fakeSdk()
    await open(sdk)
    sdk.onEvent?.({ type: "didit:ready" })
    sdk.onComplete?.({ type: "completed", session: { status: "Approved" } })
    sdk.onComplete?.({ type: "completed", session: { status: "Declined" } })
    assert.deepEqual(events, [{ type: "completed" }])
    assert.equal(sdk.destroyed, 1)
    assert.equal(isDiditOverlayActive(), false)
    assert.deepEqual(redirects, [])
  })

  it("cancellation dismisses without a result", async () => {
    const sdk = fakeSdk()
    await open(sdk)
    sdk.onEvent?.({ type: "didit:ready" })
    sdk.onComplete?.({ type: "cancelled" })
    assert.deepEqual(events, [{ type: "dismissed", reason: "cancelled" }])
    assert.equal(sdk.destroyed, 1)
  })

  it("a failure after the page answered is a dismissal with its reason", async () => {
    for (const kind of ["cameraAccessDenied", "networkError", "sessionExpired", "weird"]) {
      events = []
      const sdk = fakeSdk()
      await open(sdk)
      sdk.onEvent?.({ type: "didit:ready" })
      sdk.onComplete?.({ type: "failed", error: { type: kind, message: "x" } })
      assert.deepEqual(events, [
        { type: "dismissed", reason: kind === "weird" ? "unknown" : kind },
      ])
      assert.deepEqual(redirects, [])
    }
  })

  it("SDK start failure falls back to the redirect exactly once", async () => {
    const sdk = fakeSdk()
    sdk.failStart = true
    assert.equal(await open(sdk), "redirect")
    assert.deepEqual(redirects, [URL_OK])
    assert.equal(sdk.destroyed, 1)
    assert.deepEqual(events, [])
    assert.equal(isDiditOverlayActive(), false)
  })

  it("import failure falls back to the redirect", async () => {
    const out = await openDiditOverlay(URL_OK, {
      loadSdk: async () => {
        throw new Error("chunk failed")
      },
      redirect: (u) => redirects.push(u),
    })
    assert.equal(out, "redirect")
    assert.deepEqual(redirects, [URL_OK])
  })

  it("failure before the page ever answered falls back instead of dismissing", async () => {
    const sdk = fakeSdk()
    await open(sdk)
    sdk.onComplete?.({ type: "failed", error: { type: "unknown" } })
    assert.deepEqual(redirects, [URL_OK])
    assert.deepEqual(events, [])
  })

  it("readiness timeout destroys the SDK BEFORE the redirect, once", async () => {
    const sdk = fakeSdk()
    let destroyedAtRedirect = -1
    await openDiditOverlay(URL_OK, {
      loadSdk: async () => sdk,
      redirect: (u) => {
        destroyedAtRedirect = sdk.destroyed
        redirects.push(u)
      },
      readyTimeoutMs: 20,
    })
    await sleep(60)
    assert.deepEqual(redirects, [URL_OK])
    assert.equal(destroyedAtRedirect, 1)
    assert.equal(sdk.onComplete, undefined)
    assert.equal(sdk.onEvent, undefined)
    assert.equal(isDiditOverlayActive(), false)
  })

  it("the local didit:started event does not count as ready", async () => {
    const sdk = fakeSdk()
    await open(sdk, 20)
    sdk.onEvent?.({ type: "didit:started" })
    await sleep(60)
    assert.deepEqual(redirects, [URL_OK])
  })

  it("a message from the page cancels the timer (no fallback later)", async () => {
    const sdk = fakeSdk()
    await open(sdk, 20)
    sdk.onEvent?.({ type: "didit:ready" })
    await sleep(60)
    assert.deepEqual(redirects, [])
    assert.equal(isDiditOverlayActive(), true)
  })

  it("completion just before the timeout wins; the timer never redirects", async () => {
    const sdk = fakeSdk()
    await open(sdk, 20)
    sdk.onComplete?.({ type: "completed" }) // before any page message
    await sleep(60)
    assert.deepEqual(events, [{ type: "completed" }])
    assert.deepEqual(redirects, [])
  })

  it("timeout just before a late completion wins; the late callback is ignored", async () => {
    const sdk = fakeSdk()
    await open(sdk, 20)
    const lateComplete = sdk.onComplete
    await sleep(60)
    lateComplete?.({ type: "completed" })
    assert.deepEqual(redirects, [URL_OK])
    assert.deepEqual(events, [])
  })

  it("double click starts one SDK instance", async () => {
    const sdk = fakeSdk()
    const [a, b] = await Promise.all([open(sdk), open(sdk)])
    assert.deepEqual([a, b].sort(), ["busy", "overlay"])
    assert.equal(sdk.startCalls.length, 1)
  })

  it("logout / account switch closes it silently and ignores stale callbacks", async () => {
    const sdk = fakeSdk()
    await open(sdk)
    const stale = sdk.onComplete
    closeDiditOverlay()
    assert.equal(sdk.destroyed, 1)
    assert.equal(sdk.onComplete, undefined)
    stale?.({ type: "completed" })
    assert.deepEqual(events, [])
    assert.deepEqual(redirects, [])
    // the next account can launch immediately
    const next = fakeSdk()
    assert.equal(await open(next), "overlay")
  })

  it("closing while the SDK is still loading never starts it", async () => {
    const sdk = fakeSdk()
    let release: (s: FakeSdk) => void = () => {}
    const pending = openDiditOverlay(URL_OK, {
      loadSdk: () => new Promise<FakeSdk>((r) => (release = r)),
      redirect: (u) => redirects.push(u),
    })
    closeDiditOverlay()
    release(sdk)
    await pending
    assert.equal(sdk.startCalls.length, 0)
    assert.deepEqual(redirects, [])
  })

  it("rejects a non-Didit URL by redirecting without loading the SDK", async () => {
    let loads = 0
    const out = await openDiditOverlay("https://evil.example/x", {
      loadSdk: async () => {
        loads += 1
        return fakeSdk()
      },
      redirect: (u) => redirects.push(u),
    })
    assert.equal(out, "redirect")
    assert.equal(loads, 0)
  })

  it("never logs the session URL or token", async () => {
    const a = fakeSdk()
    await open(a)
    a.onComplete?.({ type: "failed", error: { type: "unknown", message: URL_OK } })
    const b = fakeSdk()
    b.failStart = true
    await open(b)
    await sleep(10)
    assert.equal(logs.filter((l) => l.includes("SECRET-TOKEN")).length, 0)
    const src = readFileSync(join(process.cwd(), "src/lib/api/didit-overlay.ts"), "utf8")
    assert.doesNotMatch(src, /console\.(log|warn|error)\([^)]*url/)
  })
})
