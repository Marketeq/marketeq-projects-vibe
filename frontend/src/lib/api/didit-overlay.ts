// frontend/src/lib/api/didit-overlay.ts
//
// Opens the backend-created Didit session in Didit's own web SDK modal, above the page the
// talent is on, instead of navigating the browser to verify.didit.me. The SDK is loaded only
// when a session starts. Nothing it reports is trusted: a result here is only a hint that the
// talent is done, and the host reconciles with the backend before showing anything. If the
// overlay cannot be used (SDK fails to load or start, or is not ready in time), the old
// redirect runs instead, with the return-origin handoff the caller already stored.
//
// Never logs the session URL, its token, or anything the SDK reports about the person.
import { isDiditHostedUrl } from "./free-kyc"

export type DiditDismissReason =
  | "cancelled"
  | "cameraAccessDenied"
  | "networkError"
  | "sessionExpired"
  | "unknown"

export type DiditOverlayEvent =
  | { type: "completed" }
  | { type: "dismissed"; reason: DiditDismissReason }

export type DiditOpenOutcome = "overlay" | "redirect" | "busy"

// Above every dialog of the verification flow and the shared alert host.
export const DIDIT_OVERLAY_Z_INDEX = 100000
export const DIDIT_READY_TIMEOUT_MS = 20000

// The SDK's own "ready" state is never reached in 0.4.0, so readiness is the first message the
// Didit page itself sends (didit:started is raised by the SDK locally, before anything loads).
const LOCAL_ONLY_EVENT = "didit:started"

interface SdkResult {
  type?: string
  error?: { type?: string }
}
interface SdkEvent {
  type?: string
}
interface SdkInstance {
  onComplete: ((result: SdkResult) => void) | undefined
  onEvent: ((event: SdkEvent) => void) | undefined
  onStateChange: ((state: string) => void) | undefined
  startVerification: (options: {
    url: string
    configuration: Record<string, unknown>
  }) => Promise<void>
  destroy: () => void
}

export interface DiditOverlayDeps {
  loadSdk?: () => Promise<SdkInstance>
  redirect?: (url: string) => void
  readyTimeoutMs?: number
}

const defaultLoadSdk = async (): Promise<SdkInstance> => {
  const mod = await import("@didit-protocol/sdk-web")
  return mod.DiditSdk.shared as unknown as SdkInstance
}

const listeners = new Set<(event: DiditOverlayEvent) => void>()

export function subscribeDiditOverlay(
  listener: (event: DiditOverlayEvent) => void
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit(event: DiditOverlayEvent): void {
  for (const listener of [...listeners]) {
    try {
      listener(event)
    } catch (error) {
      console.error("[identity-verification] Didit overlay listener failed", error)
    }
  }
}

// What the host does just before anything of Didit is shown (and before a redirect fallback):
// it closes the verification dialogs that launched this, and resolves once they are really
// gone. Didit is never presented over a dialog that is still open.
// Resolves true once they are gone, false if one is still mounted (Didit must not be shown).
type PresentationGate = () => Promise<boolean>
let presentationGate: PresentationGate | null = null

export function setDiditPresentationGate(gate: PresentationGate | null): () => void {
  presentationGate = gate
  return () => {
    if (presentationGate === gate) presentationGate = null
  }
}

// One launch at a time. `epoch` invalidates every callback of a launch that was closed or
// replaced, so a late SDK callback can never reach whoever is signed in now.
let busy = false
let epoch = 0
let teardown: (() => void) | null = null

export function isDiditOverlayActive(): boolean {
  return busy
}

/** Closes and destroys the overlay without telling anyone (logout, account or page change). */
export function closeDiditOverlay(): void {
  epoch += 1
  const run = teardown
  teardown = null
  busy = false
  run?.()
}

export async function openDiditOverlay(
  url: string,
  deps: DiditOverlayDeps = {}
): Promise<DiditOpenOutcome> {
  const redirect = deps.redirect ?? ((to: string) => window.location.assign(to))
  if (busy) return "busy"
  if (typeof window === "undefined" || !isDiditHostedUrl(url)) {
    redirect(url)
    return "redirect"
  }
  busy = true
  const mine = (epoch += 1)
  const live = () => mine === epoch
  // Exactly one terminal outcome per launch: a result, a dismissal or the fallback. Whichever
  // arrives first wins; anything after it (a late callback, the timer) is ignored.
  let done = false
  const finish = (): boolean => {
    if (!live() || done) return false
    done = true
    return true
  }

  let sdk: SdkInstance | null = null
  let ready = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const release = () => {
    if (timer) clearTimeout(timer)
    timer = undefined
    if (sdk) {
      sdk.onComplete = undefined
      sdk.onEvent = undefined
      sdk.onStateChange = undefined
      try {
        sdk.destroy()
      } catch {
        // already torn down
      }
      sdk = null
    }
  }
  teardown = release

  let gateRan = false
  let gateClosed = true
  const runGate = async (): Promise<boolean> => {
    if (gateRan) return gateClosed
    gateRan = true
    try {
      gateClosed = (await presentationGate?.()) !== false
    } catch {
      gateClosed = false // could not close them: never present over them
    }
    return gateClosed
  }

  // The overlay never came up: forget it and let the existing redirect take over.
  const fallBack = (): DiditOpenOutcome => {
    if (!finish()) return "overlay"
    // Whatever the SDK put on screen is destroyed BEFORE the redirect runs.
    closeDiditOverlay()
    if (gateRan || !presentationGate) {
      redirect(url)
      return "redirect"
    }
    // The verification dialogs close before the browser leaves, and only if nothing (logout,
    // account change) replaced this launch in the meantime.
    const after = epoch
    void runGate().then(() => {
      if (epoch === after) redirect(url)
    })
    return "redirect"
  }
  const settle = (event: DiditOverlayEvent) => {
    if (!finish()) return
    closeDiditOverlay()
    emit(event)
  }

  try {
    const loaded = await (deps.loadSdk ?? defaultLoadSdk)()
    if (!live()) return "overlay" // closed while the SDK was loading
    sdk = loaded
    let outcome: DiditOpenOutcome = "overlay"
    // The SDK itself drops any message that is not from a didit.me origin (or the session's
    // own host) before it reaches onEvent; this adds the current-launch check.
    sdk.onEvent = (event) => {
      if (!live() || done || !event?.type || event.type === LOCAL_ONLY_EVENT) return
      ready = true
      if (timer) clearTimeout(timer)
      timer = undefined
    }
    sdk.onComplete = (result) => {
      if (!live()) return
      if (result?.type === "completed") return settle({ type: "completed" })
      if (result?.type === "cancelled") {
        return settle({ type: "dismissed", reason: "cancelled" })
      }
      // Failed. Before the page ever answered, the overlay itself is what failed.
      if (!ready) {
        outcome = fallBack()
        return
      }
      const kind = result?.error?.type
      settle({
        type: "dismissed",
        reason:
          kind === "cameraAccessDenied" ||
          kind === "networkError" ||
          kind === "sessionExpired"
            ? kind
            : "unknown",
      })
    }
    // Close the dialogs that launched this and wait until they are gone; only then is
    // Didit presented (and the readiness clock started).
    const closed = await runGate()
    if (!live() || done || !sdk) return "overlay"
    // A launching dialog is still mounted: Didit is never shown over it. The SDK was never
    // started, so there is nothing to tear down but the instance; the redirect takes over.
    if (!closed) return fallBack()
    timer = setTimeout(() => {
      if (live() && !ready) fallBack()
    }, deps.readyTimeoutMs ?? DIDIT_READY_TIMEOUT_MS)
    await sdk.startVerification({
      url,
      // Explicit, never the SDK defaults.
      configuration: {
        closeModalOnComplete: true,
        showCloseButton: true,
        showExitConfirmation: true,
        zIndex: DIDIT_OVERLAY_Z_INDEX,
        loggingEnabled: false,
      },
    })
    return live() ? outcome : "overlay"
  } catch {
    return fallBack()
  }
}

/**
 * Resolves once every dialog that is closing at this moment has left the DOM. Radix keeps a
 * closing dialog mounted until its exit animation ends; this waits for that removal itself
 * (not a delay), looking only at dialogs already marked closed, so a dialog the page has open
 * for its own reasons is never waited on. The bound is a safety net for a dialog that never
 * leaves (it cannot hold a launch forever): it resolves false, never as if they had closed.
 */
export function waitForClosingDialogsToLeave(
  doc: Document = document,
  maxMs = 3000
): Promise<boolean> {
  return new Promise((resolve) => {
    const frame =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : (cb: () => void) => setTimeout(cb, 0)
    // One frame so the commit that closed them has marked them closed (or removed them).
    frame(() => {
      const closing = Array.from(
        doc.querySelectorAll('[role="dialog"][data-state="closed"]')
      )
      const remaining = () => closing.filter((el) => el.isConnected)
      if (remaining().length === 0) return resolve(true)
      const observer = new MutationObserver(() => {
        if (remaining().length === 0) finish()
      })
      const bound = setTimeout(() => finish(), maxMs)
      function finish() {
        observer.disconnect()
        clearTimeout(bound)
        // true only if every one of them is really gone; the cap is a failure, not a success
        resolve(remaining().length === 0)
      }
      observer.observe(doc.body, { childList: true, subtree: true })
    })
  })
}
