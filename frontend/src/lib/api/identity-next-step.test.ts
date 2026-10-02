// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  decideGate,
  gateRouteForFlowState,
  startIdentityOnly,
  type StartIdentityOnlyDeps,
} from "./identity-next-step"
import { NEXT_ACTIONS, mapNextActionToFlowState, parseIdentityVerificationSummary } from "./identity-verification-state"

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

describe("when the box opens on the dashboard", () => {
  it("opens (existing 'not public' copy) whenever the user has something to do", () => {
    for (const action of ["confirm_location", "start_identity", "continue_identity", "retry_identity", "reverify_identity"]) {
      assert.deepEqual(decideGate(summaryFor(action)), { kind: "open", reason: "unstarted" }, action)
    }
  })

  it("stays closed while in review, waiting for a retry window, or complete", () => {
    for (const action of ["await_review", "wait_for_retry", "complete"]) {
      assert.deepEqual(decideGate(summaryFor(action)), { kind: "closed" }, action)
    }
  })

  it("an unreachable status opens the existing neutral 'status unavailable' copy", () => {
    assert.deepEqual(decideGate(null), { kind: "open", reason: "status_unavailable" })
  })

  it("an answer with no usable nextAction falls back to the pre-existing status check", () => {
    for (const bad of [undefined, null, "", "something_new", 7]) {
      assert.deepEqual(decideGate(summaryFor(bad)), { kind: "fallback" })
    }
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

describe("the third-rejection regression: a stale box must not open the location flow", () => {
  it("failed_final / wait_for_retry resolves to a closed box, so neither the load check nor the button can open a flow", () => {
    const s = summaryFor("wait_for_retry")
    assert.deepEqual(decideGate(s), { kind: "closed" })
    assert.equal(gateRouteForFlowState(s!.flowState), null)
  })
  it("an unreadable or unrecognised answer is not 'closed', so the old behavior still applies there", () => {
    assert.notDeepEqual(decideGate(null), { kind: "closed" })
    assert.notDeepEqual(decideGate(summaryFor("some_future_value")), { kind: "closed" })
  })
})

describe("dashboard wiring and boundaries (source guards)", () => {
  const page = read("app", "(group)", "talent-dashboard", "page.tsx")
  const check = page.slice(page.indexOf("const runIdentityVerificationCheck"), page.indexOf("// A start attempt rejected as not startable"))
  const handler = page.slice(page.indexOf("const handleVerifyMyAccount"), page.indexOf("}, [runIdentityVerificationCheck])"))

  it("the load-time check decides from the backend nextAction and keeps the old status check only as a fallback", () => {
    assert.ok(check.includes("const summary = await fetchIdentityVerificationSummary()"))
    assert.ok(check.includes("const decision = decideGate(summary)"))
    assert.ok(check.indexOf("decision.kind === \"open\"") < check.indexOf("checkIdentityVerificationStatus()"))
    assert.ok(check.includes('decision.kind === "closed"'))
  })

  it("the button reads the CURRENT nextAction after the connection check, not a value from when the box opened", () => {
    const vpn = handler.indexOf("await checkVpnProxy()")
    const fresh = handler.indexOf("await fetchIdentityVerificationSummary()")
    const didit = handler.indexOf("await startIdentityOnlyForDashboard()")
    const location = handler.indexOf("getDetectedLocation({ useBrowserLocation: true })")
    assert.ok(vpn > -1 && fresh > vpn && didit > fresh && location > didit)
    assert.ok(handler.includes('gateRouteForFlowState(summary.flowState) === "identity"'))
  })

  it("nothing due (in review, waiting for a retry window, complete) closes the box and never opens the location flow", () => {
    const closed = handler.indexOf('decideGate(summary).kind === "closed"')
    const flow = handler.indexOf("setIdentityFlowOpen(true)")
    assert.ok(closed > -1 && closed < handler.indexOf("startIdentityOnlyForDashboard") && closed < flow)
    assert.match(handler, /decideGate\(summary\)\.kind === "closed"\) \{[\s\S]*?setConnectionCheckState\("idle"\)\s+setVerificationGateOpen\(false\)\s+setCooldownRetryTime\(cooldownRetryAt\(summary\)\)\s+return\s+\}/)
  })

  it("after a result arrives from the return reconcile or the polling, a stale box closes itself", () => {
    const effect = page.slice(page.indexOf("const returnReconcilerRef"), page.indexOf("Real required check"))
    assert.ok(effect.includes('if (decideGate(summary).kind === "closed") setVerificationGateOpen(false)'))
    // success still wins first, and the polling bound is unchanged
    assert.ok(effect.indexOf("shouldShowSuccessModal(summary)") < effect.indexOf('decideGate(summary).kind === "closed"'))
    assert.ok(effect.includes("attempts < RESULT_POLL_MAX_ATTEMPTS"))
  })

  it("the location step is still reached for location, an unreadable status, and a stale confirmation", () => {
    assert.ok(handler.includes('// "needs_location": fall through to the normal location step below'))
    assert.ok(handler.includes("setIdentityFlowOpen(true)"))
    assert.equal((handler.match(/setIdentityFlowOpen\(true\)/g) ?? []).length, 1)
  })

  it("not_startable re-checks the real state; failed stays on the box; a redirect leaves the button on its existing 'Checking...' state", () => {
    assert.match(handler, /started === "not_startable"\) \{\s+setConnectionCheckState\("idle"\)\s+void runIdentityVerificationCheck\(\)/)
    assert.match(handler, /started === "failed"\) \{\s+setConnectionCheckState\("idle"\)\s+return/)
    assert.ok(handler.includes('if (started === "redirected") return'))
  })

  it("the VPN/proxy check still runs first and its failure paths are unchanged", () => {
    assert.ok(handler.includes('if (outcome === "unavailable")'))
    assert.ok(handler.includes("setVpnProxyModalOpen(true)"))
    assert.ok(handler.indexOf("checkVpnProxy()") < handler.indexOf("startIdentityOnlyForDashboard"))
  })

  it("no routing rule is recreated in the frontend: no status, attempt, clock or confirmation-age logic", () => {
    // The routing and Didit-start code. The retry-time formatter below the marker only
    // displays a backend-supplied timestamp, so it is covered by cooldown-screen.test.ts.
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
