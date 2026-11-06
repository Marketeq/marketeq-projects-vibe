// Run: npx tsc src/lib/api/retry-gate-presentation.test.ts --outDir <tmp> --module commonjs
//   --target es2020 --skipLibCheck --esModuleInterop --types node && node --test <tmp>
// (the frontend has no test runner; node:test needs none.)
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { verifyActionFor, cooldownRetryAt } from "./identity-next-step"
import { parseIdentityVerificationSummary, shouldShowPendingModal, shouldShowSuccessModal } from "./identity-verification-state"
import { AWAITING_RESULT_KEY } from "./identity-verification-status"
import {
  markRetryGatePresented,
  readAwaitingFlag,
  shouldPresentRetryGate,
} from "./retry-gate-presentation"
import { openDiditOverlay, closeDiditOverlay } from "./didit-overlay"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const host = read("contexts/identity-verification-host.tsx")
const summary = (over: Record<string, unknown>) =>
  parseIdentityVerificationSummary({ maxAttempts: 3, locationVerificationStatus: "verified", ...over })
const retry = (n: number, extra: Record<string, unknown> = {}) =>
  summary({ nextAction: "retry_identity", attemptsUsed: n, attemptsRemaining: 3 - n, canRetry: true, ...extra })

class Store {
  m = new Map<string, string>()
  getItem = (k: string) => this.m.get(k) ?? null
  setItem = (k: string, v: string) => void this.m.set(k, v)
  removeItem = (k: string) => void this.m.delete(k)
}
// What the host does on a reconciled result: the gate is presented; it is consumed only when the
// talent acts on it (Cancel, Escape, outside click, Verify) or the page / account changes.
let pendingKey: string | null = null
function reconciled(store: Store, userId: string, s: ReturnType<typeof summary>, ack = true) {
  const flag = readAwaitingFlag(store)
  const d = shouldPresentRetryGate({ summary: s, userId, flag, storage: store })
  if (d.present && d.key) {
    pendingKey = d.key
    if (ack) acknowledge(store)
  }
  return d.present
}
function acknowledge(store: Store) {
  if (!pendingKey) return
  markRetryGatePresented(store, pendingKey)
  store.removeItem(AWAITING_RESULT_KEY)
  pendingKey = null
}
const trip = (store: Store, at: number) => store.setItem(AWAITING_RESULT_KEY, String(at))

describe("the retry gate after a Didit decline", () => {
  it("1+2. the first and the second decline open it once each", () => {
    const st = new Store()
    trip(st, 1000)
    assert.equal(reconciled(st, "u1", retry(1)), true)
    trip(st, 2000) // the retry is a new trip to Didit
    assert.equal(reconciled(st, "u1", retry(2)), true)
  })

  it("3+10. the third decline is the cooldown dialog only; Didit cannot start", () => {
    const st = new Store()
    trip(st, 1000)
    const third = summary({ nextAction: "wait_for_retry", attemptsUsed: 3, attemptsRemaining: 0, canRetry: false, retryAvailableAt: "2026-10-30T20:25:00.000Z" })
    assert.equal(reconciled(st, "u1", third), false)
    assert.equal(cooldownRetryAt(third), "2026-10-30T20:25:00.000Z")
    assert.deepEqual(verifyActionFor(third), { kind: "limit", retryAt: "2026-10-30T20:25:00.000Z" })
  })

  it("4. the backend decides: In Review or Approved never opens it, whatever the SDK said", () => {
    const st = new Store()
    trip(st, 1000)
    assert.equal(reconciled(st, "u1", summary({ nextAction: "await_review", attemptsUsed: 1 })), false)
    assert.equal(shouldShowPendingModal(summary({ nextAction: "await_review", identityVerificationStatus: "pending" })), true)
    assert.equal(reconciled(st, "u1", summary({ nextAction: "complete", fullyVerified: true })), false)
    assert.equal(shouldShowSuccessModal(summary({ nextAction: "complete", identityVerificationStatus: "verified", fullyVerified: true })), true)
    // the adapter hands the host no SDK status at all
    assert.doesNotMatch(read("src/lib/api/didit-overlay.ts"), /result\??\.session/)
  })

  it("5. repeated /me reads, focus, visibility and reloads never reopen the same decline", () => {
    const st = new Store()
    trip(st, 1000)
    const s = retry(1)
    assert.equal(reconciled(st, "u1", s), true)
    for (let i = 0; i < 5; i += 1) assert.equal(reconciled(st, "u1", s), false) // marker cleared
    // even if the marker were somehow still there, the occurrence is already recorded
    trip(st, 1000)
    assert.equal(reconciled(st, "u1", s), false)
  })

  it("6. a genuinely later decline (new trip) opens it again", () => {
    const st = new Store()
    trip(st, 1000)
    assert.equal(reconciled(st, "u1", retry(1)), true)
    trip(st, 5000)
    assert.equal(reconciled(st, "u1", retry(1)), true) // same count after a cooldown reset, new trip
  })

  it("presented but not yet acted on: a remount or another read shows it again; once acted on, never", () => {
    const st = new Store()
    trip(st, 1000)
    const s1 = retry(1)
    assert.equal(reconciled(st, "u1", s1, false), true) // presented
    assert.equal(reconciled(st, "u1", s1, false), true) // the provider remounted: still there
    acknowledge(st) // Cancel / Escape / outside click / Verify / a page change
    assert.equal(reconciled(st, "u1", s1, false), false)
    trip(st, 1000) // even a stale marker cannot bring the same occurrence back
    assert.equal(reconciled(st, "u1", s1, false), false)
  })

  it("no trip marker means no gate (an ordinary page visit uses the existing action gates)", () => {
    const st = new Store()
    assert.equal(reconciled(st, "u1", retry(1)), false)
  })

  it("13+14. another account never sees it, and the host clears and ignores stale work", () => {
    const st = new Store()
    trip(st, 1000)
    assert.equal(shouldPresentRetryGate({ summary: retry(1), userId: "u2", flag: "1000", storage: st }).key?.startsWith("u2:"), true)
    assert.equal(reconciled(st, "u1", retry(1)), true)
    assert.equal(shouldPresentRetryGate({ summary: retry(1), userId: null, flag: "1000", storage: st }).present, false)
    // reset closes the gate; a callback that outlives its effect is dropped
    assert.match(host, /closeDiditOverlay\(\) \/\/ never outlives its account/)
    const reset = host.slice(host.indexOf("closeDiditOverlay() // never outlives"))
    assert.match(reset.slice(0, 400), /setVerificationGateOpen\(false\)/)
    const apply = host.slice(host.indexOf("const apply = (summary"))
    assert.match(apply.slice(0, 200), /if \(cancelled\) return/)
  })

  it("7+8+9. the retry gate opens its own state, starts nothing; Verify My Account is the explicit retry; a double click is one start", () => {
    const present = host.slice(host.indexOf("shouldPresentRetryGate({"), host.indexOf("shouldPresentRetryGate({") + 900)
    assert.doesNotMatch(present, /startIdentityOnly|startFreeKyc|openDiditOverlay|handleVerifyMyAccount\(/)
    // the gate's button is the existing Verify My Account handler: VPN check, fresh /me, Didit-only start
    assert.match(host, /onVerify=\{\(\) => void handleVerifyMyAccount\(\)\}/)
    assert.match(host, /const started = await startIdentityOnlyForDashboard\(\)/)
    // concurrent starts share one call, so one click can never make two sessions
    const next = read("src/lib/api/identity-next-step.ts")
    assert.match(next, /let startInFlight: Promise<StartIdentityOnlyOutcome> \| null = null/)
    assert.match(next, /if \(startInFlight\) return startInFlight/)
  })

  it("8+9b. the overlay itself is single-flight, so one retry shows one Didit", async () => {
    ;(globalThis as { window?: unknown }).window = {}
    let starts = 0
    const sdk = {
      onComplete: undefined, onEvent: undefined, onStateChange: undefined,
      startVerification: async () => { starts += 1 }, destroy() {},
    }
    const open = () => openDiditOverlay("https://verify.didit.me/session/x", { loadSdk: async () => sdk as never, redirect: () => {} })
    const [a, b] = await Promise.all([open(), open()])
    assert.deepEqual([a, b].sort(), ["busy", "overlay"])
    assert.equal(starts, 1)
    closeDiditOverlay()
    delete (globalThis as { window?: unknown }).window
  })

  it("11+12. it opens on the originating route, and every return path reaches the same apply()", () => {
    const present = host.slice(host.indexOf("shouldPresentRetryGate({"), host.indexOf("shouldPresentRetryGate({") + 900)
    assert.doesNotMatch(present, /router\.|location\.|window\.open|href/)
    // SDK completion, the page-show return and a fresh load all end in apply()
    assert.match(host, /returnReconcilerRef\.current = null \/\/ run\(\) is memoized: this is a new trip\n\s+setReturnGen/)
    assert.equal((host.match(/returnReconcilerRef\.current\.run\(\)\.then\(\(result\) => apply\(result\.summary\)\)/g) ?? []).length, 2)
    assert.match(host, /setReturnGen\(\(g\) => g \+ 1\) \/\/ the Didit-return handling now runs on the origin page/)
  })

  it("15+16. no blocked action is retried and no alert is created for a decline", () => {
    const present = host.slice(host.indexOf("shouldPresentRetryGate({"), host.indexOf("shouldPresentRetryGate({") + 900)
    assert.doesNotMatch(present, /startAlertReconcile|setSuccessAlertKind|setPendingModalOpen|setVerifiedModalOpen/)
    const alerts = read("src/lib/api/status-alerts.ts")
    const types = alerts.slice(alerts.indexOf("submitted_for_review") - 200, alerts.indexOf("submitted_for_review") + 200)
    assert.doesNotMatch(types, /declin|reject|retry/i)
  })

  it("17. a home-country-change decline follows the authoritative state", () => {
    const st = new Store()
    trip(st, 1000)
    assert.equal(reconciled(st, "u1", retry(1, { pendingHomeCountry: "CA" })), true)
    trip(st, 2000)
    const wait = summary({ nextAction: "wait_for_retry", attemptsUsed: 3, pendingHomeCountry: "CA", retryAvailableAt: "2026-10-30T20:25:00.000Z" })
    assert.equal(reconciled(st, "u1", wait), false)
    trip(st, 3000)
    assert.equal(reconciled(st, "u1", summary({ nextAction: "wait_for_retry", retryAvailableAt: null })), false)
  })

  it("the gate never opens beside the old flow or Didit (completion closes the flow first)", () => {
    const completed = host.slice(host.indexOf('if (event.type === "completed")'), host.indexOf('if (event.type === "completed")') + 300)
    assert.match(completed, /diditLifecycle\.discard\(\)/)
    assert.match(completed, /setIdentityFlowOpen\(false\)/)
  })

  // --- Cancel (optional prop of the existing AccountVerificationGate) ---------------------------
  const gateSrc = read("components/account-verification-gate.tsx")

  it("A1. the post-decline presentation is the only caller that passes onCancel", () => {
    const callers = [
      "contexts/identity-verification-host.tsx",
      "app/verify-withdrawal/page.tsx",
      "app/transfer-funds/page.tsx",
      "app/(group)/time-tracking/page.tsx",
      "utils/useApplyGate.tsx",
      "utils/useStartTimeGate.tsx",
      "utils/CreateListingGateHost.tsx",
      "components/withdraw-funds-dialog.tsx",
      "components/download-desktop-tracker-dialog.tsx",
    ]
    for (const f of callers) {
      const src = read(f)
      const gates = src.split("<AccountVerificationGate").slice(1)
      assert.ok(gates.length >= 1, f)
      const withCancel = gates.filter((g) => g.slice(0, 1200).split("/>")[0].includes("onCancel"))
      if (f === "contexts/identity-verification-host.tsx") {
        assert.equal(withCancel.length, 1, "exactly one gate in the host has Cancel")
        assert.match(withCancel[0], /open=\{retryGateOpen\}/)
      } else {
        assert.equal(withCancel.length, 0, `${f} must not pass onCancel`)
      }
    }
  })

  it("A2. without onCancel the gate is exactly as before: no Cancel, Escape and outside click blocked", () => {
    assert.match(gateSrc, /onCancel\?: \(\) => void/)
    assert.match(gateSrc, /onEscapeKeyDown=\{cancel \? undefined : \(e\) => e\.preventDefault\(\)\}/)
    assert.match(gateSrc, /onPointerDownOutside=\{cancel \? undefined : \(e\) => e\.preventDefault\(\)\}/)
    assert.match(gateSrc, /onInteractOutside=\{cancel \? undefined : \(e\) => e\.preventDefault\(\)\}/)
    assert.match(gateSrc, /\? "mt-6 flex justify-center items-center gap-x-3"\n\s+: "mt-6 flex justify-center"/)
    assert.match(gateSrc, /\{cancel && \(\n\s+<Button variant="outlined" onClick=\{cancel\}>/)
    // no onOpenChange at all without it (same as the old `<Dialog open={open}>`)
    assert.match(gateSrc, /onOpenChange=\{\n\s+cancel\n\s+\? \(next\) => \{\n\s+if \(!next\) cancel\(\)\n\s+\}\n\s+: undefined\n\s+\}/)
    // the connection-error Dismiss / Retry row is untouched
    assert.match(gateSrc, /onClick=\{onDismissConnectionError\}/)
    assert.match(gateSrc, /onClick=\{onRetryConnectionCheck\}/)
  })

  it("A3. one dismissal is one cancellation: guarded, and re-armed only when the gate opens", () => {
    assert.match(gateSrc, /if \(cancelFired\.current\) return\n\s+cancelFired\.current = true\n\s+onCancel\(\)/)
    assert.match(gateSrc, /if \(open\) cancelFired\.current = false/)
  })

  it("A4. Cancel only closes the retry gate: no session, confirmation, attempt or blocked action", () => {
    assert.equal(host.split("onCancel=").length - 1, 1)
    // the occurrence is consumed by acting on the gate (Cancel / Escape / outside click / Verify)
    // and by a page or account change, never merely by the gate opening
    const ack = host.slice(host.indexOf("const acknowledgeRetryGate = useCallback"), host.indexOf("const acknowledgeRetryGate = useCallback") + 420)
    assert.match(ack, /markRetryGatePresented\(window\.localStorage, key\)/)
    assert.match(ack, /clearAwaitingResult\(window\.localStorage\)/)
    assert.match(host, /onCancel=\{acknowledgeRetryGate\}/)
    assert.match(host, /acknowledgeRetryGate\(\) \/\/ a page or account change is a decision/)
    const opening = host.slice(host.indexOf("retryGateKeyRef.current = retryGate.key"), host.indexOf("setRetryGateOpen(true)") + 30)
    assert.doesNotMatch(opening, /markRetryGatePresented|clearAwaitingResult/)
  })

  it("A5. the standard gate, the cooldown dialog and Verify's explicit retry are unchanged", () => {
    // (+ the optional `retrying` prop the loading states added, passed only on this standard gate)
    assert.match(host, /open=\{verificationGateOpen\}[\s\S]{0,320}onVerify=\{\(\) => void handleVerifyMyAccount\(\)\}/)
    assert.match(host, /retrying=\{retryingFromUnavailable && connectionCheckState === "checking"\}/)
    assert.equal(host.split("retrying={").length - 1, 1) // the retry gate after a decline does not get it
    assert.match(host, /open=\{cooldownRetryTime !== null\}/)
    assert.match(host, /You’ve used all three attempts/)
    const verify = host.slice(host.indexOf("if (retryVerifyRunningRef.current) return"), host.indexOf("if (retryVerifyRunningRef.current) return") + 900)
    assert.match(verify, /retryLaunchRef\.current = true\n\s+setRetryGateOpen\(false\)/)
    assert.match(verify, /void handleVerifyMyAccount\(\)\.finally/)
  })

  it("A6. logout, account and page changes close the retry gate with everything else", () => {
    const reset = host.slice(host.indexOf("closeDiditOverlay() // never outlives"), host.indexOf("closeDiditOverlay() // never outlives") + 300)
    assert.match(reset, /acknowledgeRetryGate\(\)/) // closes it and consumes the occurrence
    const ack = host.slice(host.indexOf("const acknowledgeRetryGate = useCallback"), host.indexOf("const acknowledgeRetryGate = useCallback") + 520)
    assert.match(ack, /setRetryGateOpen\(false\)/)
  })

  it("A7. closing a live Didit overlay (sign-out, account or page change) also ends its trip, so the next account never sees its result", () => {
    const drop = host.slice(host.indexOf("const dropActiveDiditTrip = useCallback"), host.indexOf("const dropActiveDiditTrip = useCallback") + 520)
    assert.match(drop, /if \(!isDiditOverlayActive\(\)\) return/)
    assert.match(drop, /clearAwaitingResult\(window\.localStorage\)/)
    assert.match(drop, /clearHomeCountryChange\(window\.localStorage\)/)
    assert.match(drop, /clearReturnOrigins\(window\.localStorage, userId\)/)
    // it runs before the overlay is closed, in the page/account reset and in the account effect's cleanup
    assert.match(host, /dropActiveDiditTrip\(user\?\.id\)\n\s+closeDiditOverlay\(\)/)
    assert.match(host, /dropActiveDiditTrip\(returnUserId\)\n\s+closeDiditOverlay\(\)/)
  })

  // --- Didit opened from the retry gate, then cancelled or finished -------------------------
  const events = host.slice(host.indexOf("const handleOverlayEvent = (event: DiditOverlayEvent)"), host.indexOf("const watcher = createTripWatcher"))

  it("B1. Verify closes the gate WITHOUT consuming the decline, and remembers it launched Didit", () => {
    const verify = host.slice(host.indexOf("if (retryVerifyRunningRef.current) return"), host.indexOf("if (retryVerifyRunningRef.current) return") + 900)
    assert.doesNotMatch(verify.split(".finally")[0], /acknowledgeRetryGate|markRetryGatePresented/)
    assert.match(verify, /if \(retryLaunchRef\.current && !isDiditOverlayActive\(\)\) acknowledgeRetryGate\(\)/)
  })

  it("B2. a Didit cancel or dismissal after that reopens the same gate, once, and starts nothing", () => {
    const dismissed = events.slice(events.indexOf("if (retryLaunchRef.current) {\n        // Didit was opened"))
    assert.match(dismissed, /retryLaunchRef\.current = false/) // once per launch
    assert.match(dismissed, /markAwaitingResult\(window\.localStorage, Number\(flag\)\)/) // survives a remount
    assert.match(dismissed, /setRetryGateOpen\(true\)\n\s+return/)
    assert.doesNotMatch(dismissed.split("return")[0], /startIdentityOnly|startFreeKyc|openDiditOverlay|handleVerifyMyAccount|confirmHomeCountry/)
  })

  it("B3. a finished Didit result never reopens it: the decline is consumed and the backend decides", () => {
    const completed = events.slice(events.indexOf('if (event.type === "completed")'), events.indexOf("clearAwaitingResult(window.localStorage)\n      clearHomeCountryChange(window.localStorage)\n      if (retryLaunchRef"))
    assert.doesNotMatch(completed, /setRetryGateOpen\(true\)/)
    assert.match(completed, /markRetryGatePresented\(window\.localStorage, key\)/)
    assert.doesNotMatch(completed, /clearAwaitingResult/) // the marker is left for the reconcile
    assert.match(completed, /setReturnGen/)
  })

  it("B4. Cancel, Escape and outside click on the gate consume it for good, with no request", () => {
    assert.match(host, /onCancel=\{acknowledgeRetryGate\}/)
    const ack = host.slice(host.indexOf("const acknowledgeRetryGate = useCallback"), host.indexOf("const acknowledgeRetryGate = useCallback") + 520)
    assert.match(ack, /markRetryGatePresented\(window\.localStorage, key\)/)
    assert.match(ack, /retryLaunchRef\.current = false/)
    assert.doesNotMatch(ack, /startIdentityOnly|startFreeKyc|handleVerifyMyAccount|router\.|location\./)
  })

  it("B5. sign-out, account, role, page change and unmount drop a live launch and bring nothing back", () => {
    const reset = host.slice(host.indexOf("dropActiveDiditTrip(user?.id)"), host.indexOf("dropActiveDiditTrip(user?.id)") + 360)
    assert.match(reset, /closeDiditOverlay\(\)/)
    assert.match(reset, /acknowledgeRetryGate\(\)/) // consumes it and clears retryLaunchRef
    // closing the overlay on those paths emits nothing, so there is no event to reopen from
    assert.doesNotMatch(read("src/lib/api/didit-overlay.ts").slice(read("src/lib/api/didit-overlay.ts").indexOf("export function closeDiditOverlay"), read("src/lib/api/didit-overlay.ts").indexOf("export async function openDiditOverlay")), /emit\(/)
    assert.match(host, /dropActiveDiditTrip\(returnUserId\)\n\s+closeDiditOverlay\(\)/)
  })
})
