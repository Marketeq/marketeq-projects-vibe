// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  gateRouteForFlowState,
  shouldOpenFirstTimeGate,
  shouldShowProfileBanner,
  startIdentityOnly,
  verifyActionFor,
  type StartIdentityOnlyDeps,
} from "./identity-next-step"
import { NEXT_ACTIONS, mapNextActionToFlowState, parseIdentityVerificationSummary } from "./identity-verification-state"
import { readDashboardWithHost } from "./dashboard-host-source"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")

const summaryFor = (nextAction: unknown) =>
  parseIdentityVerificationSummary({ nextAction, canRetry: true, attemptsUsed: 1, attemptsRemaining: 2, maxAttempts: 3 })

describe("which step the box asks for (driven only by the backend nextAction)", () => {
  const expected: Record<string, "location" | "identity" | null> = {
    confirm_location: "location",
    start_identity: "identity",
    continue_identity: "identity",
    retry_identity: "identity", // a rejected attempt with attempts left
    reverify_identity: "identity",
    await_review: null,
    wait_for_retry: null,
    complete: null,
  }

  it("covers every nextAction the backend can send", () => {
    assert.deepEqual([...NEXT_ACTIONS].sort(), Object.keys(expected).sort())
  })

  for (const [action, route] of Object.entries(expected)) {
    it(`${action} → ${route ?? "no box step"}`, () => {
      assert.equal(gateRouteForFlowState(mapNextActionToFlowState(action)), route)
    })
  }

  it("an unknown value asks for nothing (fails safe)", () => {
    assert.equal(gateRouteForFlowState("unknown"), null)
  })
})

describe("what Verify My Account does (the backend's CURRENT state only)", () => {
  const withRetry = (nextAction: string, retryAvailableAt: string | null) =>
    parseIdentityVerificationSummary({ nextAction, retryAvailableAt, attemptsUsed: 3, attemptsRemaining: 0, maxAttempts: 3 })

  it("confirm_location → the existing location flow", () => {
    assert.deepEqual(verifyActionFor(summaryFor("confirm_location")), { kind: "location" })
  })
  it("start_identity, continue_identity, retry_identity and reverify_identity → Didit", () => {
    for (const a of ["start_identity", "continue_identity", "retry_identity", "reverify_identity"]) {
      assert.deepEqual(verifyActionFor(summaryFor(a)), { kind: "didit" }, a)
    }
  })
  it("wait_for_retry with a valid retry time → the limit dialog, with that exact time", () => {
    assert.deepEqual(verifyActionFor(withRetry("wait_for_retry", "2026-10-03T14:17:00.000Z")), { kind: "limit", retryAt: "2026-10-03T14:17:00.000Z" })
  })
  it("wait_for_retry WITHOUT a valid retry time → closes (no dialog, no session)", () => {
    for (const bad of [null, "", "garbage"]) assert.deepEqual(verifyActionFor(withRetry("wait_for_retry", bad)), { kind: "close" })
  })
  it("await_review, complete, unknown and unreadable → close the actionable surface and start nothing", () => {
    for (const a of ["await_review", "complete", "something_new", undefined, null, 7]) {
      assert.deepEqual(verifyActionFor(summaryFor(a)), { kind: "close" }, String(a))
    }
    assert.deepEqual(verifyActionFor(null), { kind: "close" })
  })
})

describe("banner visibility table (profile not public)", () => {
  const table: Array<[string, boolean]> = [
    ["confirm_location", true],
    ["start_identity", true],
    ["continue_identity", true],
    ["retry_identity", true],
    ["reverify_identity", true],
    ["await_review", false],
    ["wait_for_retry", false],
    ["complete", false],
  ]
  for (const [action, shown] of table) {
    it(`${action} → ${shown ? "shown" : "hidden"}`, () => {
      assert.equal(shouldShowProfileBanner(summaryFor(action)), shown)
    })
  }
  it("wait_for_retry never shows it, even with a valid retry time", () => {
    const s = parseIdentityVerificationSummary({ nextAction: "wait_for_retry", retryAvailableAt: "2026-10-03T14:17:00.000Z" })
    assert.equal(shouldShowProfileBanner(s), false)
  })
  it("an unknown value, a missing nextAction and an unreadable status hide it", () => {
    for (const bad of ["something_new", undefined, null, ""]) assert.equal(shouldShowProfileBanner(summaryFor(bad)), false)
    assert.equal(shouldShowProfileBanner(null), false)
  })
  it("banner visibility and the Verify action can never disagree: shown exactly when the action is location or didit", () => {
    for (const a of [...NEXT_ACTIONS, "something_new"]) {
      const s = summaryFor(a)
      const kind = verifyActionFor(s).kind
      assert.equal(shouldShowProfileBanner(s), kind === "location" || kind === "didit", a)
    }
  })
})

describe("the first-time modal gate (existing AccountVerificationGate)", () => {
  it("opens on load only for a first verification: confirm_location and start_identity", () => {
    assert.equal(shouldOpenFirstTimeGate(summaryFor("confirm_location")), true)
    assert.equal(shouldOpenFirstTimeGate(summaryFor("start_identity")), true)
  })
  it("is NOT reused for rejected, resumed or re-verifying users (they get the banner)", () => {
    for (const a of ["retry_identity", "continue_identity", "reverify_identity"]) {
      assert.equal(shouldOpenFirstTimeGate(summaryFor(a)), false, a)
      assert.equal(shouldShowProfileBanner(summaryFor(a)), true, a)
    }
  })
  it("never opens for review, the cooldown, complete, unknown or unreadable", () => {
    for (const a of ["await_review", "wait_for_retry", "complete", "something_new", undefined]) assert.equal(shouldOpenFirstTimeGate(summaryFor(a)), false)
    assert.equal(shouldOpenFirstTimeGate(null), false)
  })
})

describe("startIdentityOnly: Didit only, no location step", () => {
  const deps = (over: Partial<StartIdentityOnlyDeps> = {}) => {
    const calls: string[] = []
    const d: StartIdentityOnlyDeps = {
      startFreeKyc: async () => {
        calls.push("start")
        return { data: { url: "https://verify.didit.me/session/abc" } }
      },
      redirect: (url) => void calls.push(`redirect:${url.startsWith("https://verify.didit.me") ? "didit" : "other"}`),
      markAwaitingResult: () => void calls.push("mark"),
      ...over,
    }
    return { d, calls }
  }
  const conflict = (code: string) =>
    Object.assign(new Error("409"), { response: { status: 409, data: { code } } })

  it("starts the session, marks the browser as awaiting a result, then redirects — and never confirms the home country", async () => {
    const { d, calls } = deps()
    assert.equal(await startIdentityOnly(d), "redirected")
    assert.deepEqual(calls, ["start", "mark", "redirect:didit"])
  })

  it("refuses a redirect that is not a Didit https URL (no mark, no redirect)", async () => {
    for (const url of ["http://verify.didit.me/x", "https://evil.example/x", "javascript:alert(1)", "", "https://1.2.3.4/x"]) {
      const { d, calls } = deps({ startFreeKyc: async () => ({ data: { url } }) })
      const quiet = console.error
      console.error = () => undefined
      try {
        assert.equal(await startIdentityOnly(d), "failed", url)
      } finally {
        console.error = quiet
      }
      assert.deepEqual(calls, [])
    }
  })

  it("a stale home-country confirmation (15-minute window) falls back to the location step", async () => {
    const { d } = deps({ startFreeKyc: async () => { throw conflict("HOME_COUNTRY_CONFIRMATION_REQUIRED") } })
    assert.equal(await startIdentityOnly(d), "needs_location")
  })

  it("a not-startable account (e.g. already verified) is reported so the dashboard can re-check", async () => {
    const { d } = deps({ startFreeKyc: async () => { throw conflict("IDENTITY_VERIFICATION_NOT_STARTABLE") } })
    assert.equal(await startIdentityOnly(d), "not_startable")
    const nested = deps({
      startFreeKyc: async () => {
        throw Object.assign(new Error("409"), { response: { status: 409, data: { error: { code: "IDENTITY_VERIFICATION_NOT_STARTABLE" } } } })
      },
    })
    assert.equal(await startIdentityOnly(nested.d), "not_startable")
  })

  it("any other failure stays on the current screen (no invented UI, no redirect)", async () => {
    const quiet = console.error
    console.error = () => undefined
    try {
      for (const error of [new Error("network"), Object.assign(new Error("502"), { response: { status: 502, data: { code: "VENDOR_STAGE_UNAVAILABLE" } } }), Object.assign(new Error("429"), { response: { status: 429, data: { code: "RETRY_LIMIT_EXCEEDED" } } }), conflict("SOMETHING_ELSE")]) {
        const { d, calls } = deps({ startFreeKyc: async () => { throw error } })
        assert.equal(await startIdentityOnly(d), "failed")
        assert.ok(!calls.includes("mark") && !calls.some((c) => c.startsWith("redirect")))
      }
    } finally {
      console.error = quiet
    }
  })
})

describe("dashboard wiring and boundaries (source guards)", () => {
  const page = readDashboardWithHost()
  const check = page.slice(page.indexOf("const runIdentityVerificationCheck"), page.indexOf("// Success alert (Figma node 13101-47566)"))
  const handler = page.slice(page.indexOf("const handleVerifyMyAccount"), page.indexOf("}, [runIdentityVerificationCheck])"))

  it("the load check reads only the backend summary: banner and cooldown dialog come from it, and it never opens the blocking gate", () => {
    assert.ok(check.includes("const summary = await fetchIdentityVerificationSummary()"))
    assert.ok(check.includes("setProfileBannerShown(shouldShowProfileBanner(summary))"))
    assert.ok(!check.includes("setVerificationGateOpen"), "dashboard load must not open the gate")
    assert.ok(!page.includes("shouldOpenFirstTimeGate"))
    assert.ok(check.includes("setCooldownRetryTime(cooldownRetryAt(summary))"))
    assert.ok(!check.includes("checkIdentityVerificationStatus"), "no older status-check fallback")
  })

  it("the button re-reads the backend AFTER the connection check, then acts on verifyActionFor", () => {
    const vpn = handler.indexOf("await checkVpnProxy()")
    const fresh = handler.indexOf("await fetchIdentityVerificationSummary()")
    const decide = handler.indexOf("verifyActionFor(summary)")
    const didit = handler.indexOf("await startIdentityOnlyForDashboard()")
    const location = handler.indexOf("getDetectedLocation({ useBrowserLocation: true })")
    assert.ok(vpn > -1 && fresh > vpn && decide > fresh && didit > decide && location > didit)
  })

  it("limit → the approved dialog; close → closes banner and gate and starts nothing; didit → Didit only", () => {
    assert.match(handler, /action\.kind === "limit"\) \{[\s\S]*?setProfileBannerShown\(false\)\s+setCooldownRetryTime\(action\.retryAt\)\s+return\s+\}/)
    assert.match(handler, /action\.kind === "close"\) \{\s+setConnectionCheckState\("idle"\)\s+setVerificationGateOpen\(false\)\s+setProfileBannerShown\(false\)\s+return\s+\}/)
    assert.ok(handler.includes('action.kind === "didit"'))
    // neither limit nor close can reach a session start or the location flow
    const limitClose = handler.slice(handler.indexOf('action.kind === "limit"'), handler.indexOf('action.kind === "didit"'))
    assert.ok(!limitClose.includes("startIdentityOnlyForDashboard") && !limitClose.includes("setIdentityFlowOpen"))
  })

  it("the location step is still reached for location and for a stale confirmation (needs_location)", () => {
    assert.ok(handler.includes('// "needs_location": fall through to the normal location step below'))
    assert.equal((handler.match(/setIdentityFlowOpen\(true\)/g) ?? []).length, 1)
  })

  it("not_startable re-checks the real state; failed stays put; a redirect leaves the button on its existing 'Checking...' state", () => {
    assert.match(handler, /started === "not_startable"\) \{\s+setConnectionCheckState\("idle"\)\s+void runIdentityVerificationCheck\(\)/)
    assert.match(handler, /started === "failed"\) \{\s+setConnectionCheckState\("idle"\)\s+return/)
    assert.ok(handler.includes('if (started === "redirected") return'))
  })

  it("the VPN/proxy check still runs first and its failure paths are unchanged", () => {
    assert.ok(handler.includes('if (outcome === "unavailable")'))
    assert.ok(handler.includes("setVpnProxyModalOpen(true)"))
    assert.ok(handler.indexOf("checkVpnProxy()") < handler.indexOf("startIdentityOnlyForDashboard"))
  })

  it("after a result arrives from the return reconcile or polling, banner and gate are refreshed from it; success still wins first", () => {
    const effect = page.slice(page.indexOf("const returnReconcilerRef"), page.indexOf("Real required check"))
    assert.ok(effect.includes("setProfileBannerShown(shouldShowProfileBanner(summary))"))
    assert.ok(effect.includes("if (!shouldShowProfileBanner(summary)) setVerificationGateOpen(false)"))
    assert.ok(effect.indexOf("shouldShowSuccessModal(summary)") < effect.indexOf("setProfileBannerShown(shouldShowProfileBanner(summary))"))
    assert.ok(effect.includes("attempts < RESULT_POLL_MAX_ATTEMPTS"))
  })

  it("no routing rule is recreated in the frontend: no status, attempt, clock or confirmation-age logic", () => {
    const full = read("src", "lib", "api", "identity-next-step.ts")
    const src = full.slice(0, full.indexOf("// Waiting for a retry window"))
    const code = src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n")
    assert.ok(!/Date\.now|new Date\(|getTime\(/.test(code))
    assert.ok(!/attemptsRemaining|attemptsUsed|canRetry|retryAvailableAt/.test(code))
    assert.ok(!/=== "(verified|failed|pending|unstarted|in_progress)"/.test(code))
  })

  it("the gate and flow components and free-kyc.ts are not modified by this work", () => {
    assert.ok(!read("components", "account-verification-gate.tsx").includes("identity-next-step"))
    assert.ok(!read("components", "identity-verification-flow.tsx").includes("identity-next-step"))
    assert.ok(!read("src", "lib", "api", "free-kyc.ts").includes("identity-next-step"))
  })
})
