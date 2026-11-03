// Run: npx tsc src/lib/api/didit-overlay-result.test.ts --outDir <tmp> --module commonjs
//   --target es2020 --skipLibCheck --esModuleInterop --types node && node --test <tmp>
// (the frontend has no test runner; node:test needs none.)
//
// What the in-page Didit result selects. The SDK result is only a hint; the surface is chosen
// from the backend's own state by the same functions the redirect return uses.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  cooldownRetryAt,
  shouldShowProfileBanner,
  verifyActionFor,
} from "./identity-next-step"
import {
  parseIdentityVerificationSummary,
  shouldShowPendingModal,
  shouldShowSuccessModal,
} from "./identity-verification-state"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const summary = (over: Record<string, unknown>) =>
  parseIdentityVerificationSummary({
    maxAttempts: 3,
    locationVerificationStatus: "verified",
    ...over,
  })

describe("backend state selects the surface after Didit closes", () => {
  it("first decline (2 left): Didit-only retry via the banner, nothing starts by itself", () => {
    const s = summary({ nextAction: "retry_identity", attemptsUsed: 1, attemptsRemaining: 2, canRetry: true })
    assert.deepEqual(verifyActionFor(s), { kind: "didit" })
    assert.equal(shouldShowProfileBanner(s), true)
    assert.equal(cooldownRetryAt(s), null)
    assert.equal(shouldShowPendingModal(s), false)
    assert.equal(shouldShowSuccessModal(s), false)
  })

  it("second decline (1 left): the same Didit-only retry, one attempt left", () => {
    const s = summary({ nextAction: "retry_identity", attemptsUsed: 2, attemptsRemaining: 1, canRetry: true })
    assert.deepEqual(verifyActionFor(s), { kind: "didit" })
    assert.equal(shouldShowProfileBanner(s), true)
  })

  it("third decline: the three-attempt dialog with the backend's retry time; Didit is never started", () => {
    const s = summary({
      nextAction: "wait_for_retry", attemptsUsed: 3, attemptsRemaining: 0, canRetry: false,
      retryAvailableAt: "2026-10-30T20:25:00.000Z",
    })
    assert.deepEqual(verifyActionFor(s), { kind: "limit", retryAt: "2026-10-30T20:25:00.000Z" })
    assert.equal(cooldownRetryAt(s), "2026-10-30T20:25:00.000Z")
    assert.equal(shouldShowProfileBanner(s), false)
  })

  it("a wait with no retry time is a silent close today (no screen exists for it)", () => {
    const s = summary({ nextAction: "wait_for_retry", retryAvailableAt: null })
    assert.deepEqual(verifyActionFor(s), { kind: "close" })
  })

  it("in review → the Submitted dialog; approved → the Verified dialog", () => {
    assert.equal(shouldShowPendingModal(summary({ nextAction: "await_review", identityVerificationStatus: "pending" })), true)
    assert.equal(shouldShowSuccessModal(summary({ nextAction: "complete", identityVerificationStatus: "verified", fullyVerified: true })), true)
  })

  it("the SDK's own status never reaches the host: only 'completed' is emitted", () => {
    const src = read("src/lib/api/didit-overlay.ts")
    assert.match(src, /settle\(\{ type: "completed" \}\)/)
    assert.doesNotMatch(src, /result\??\.session/)
  })

  it("completion re-reads the backend through a fresh reconciler, never the SDK value", () => {
    const host = read("contexts/identity-verification-host.tsx")
    const i = host.indexOf('if (event.type === "completed")')
    const block = host.slice(i, i + 1100)
    assert.match(block, /returnReconcilerRef\.current = null/)
    assert.match(block, /setReturnGen/)
    assert.doesNotMatch(block, /startFreeKyc|startIdentityOnly|openDiditOverlay/)
  })
})
