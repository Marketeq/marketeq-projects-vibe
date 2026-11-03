// Run like apply-gate.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  isStartVerificationRequested,
  startVerificationRequestedInBrowser,
  START_VERIFICATION_HREF,
} from "./start-verification-handoff"
import { readDashboardWithHost } from "./dashboard-host-source"

const dashboard = readDashboardWithHost()

describe("Start Verification hand-off marker", () => {
  it("the href targets the dashboard with the exact one-shot marker", () => {
    assert.equal(START_VERIFICATION_HREF, "/talent-dashboard?startVerification=1")
    assert.equal(isStartVerificationRequested(new URL(START_VERIFICATION_HREF, "http://x").search), true)
  })

  it("only the exact marker counts", () => {
    assert.equal(isStartVerificationRequested(""), false)
    assert.equal(isStartVerificationRequested("?startVerification=0"), false)
    assert.equal(isStartVerificationRequested("?startVerification=true"), false)
    assert.equal(isStartVerificationRequested("?other=1"), false)
  })
})

describe("startVerificationRequestedInBrowser reads the marker from the given window", () => {
  it("true only for the exact marker; false with no window", () => {
    assert.equal(startVerificationRequestedInBrowser({ location: { search: "?startVerification=1" } }), true)
    assert.equal(startVerificationRequestedInBrowser({ location: { search: "" } }), false)
    assert.equal(startVerificationRequestedInBrowser({ location: { search: "?startVerification=2" } }), false)
    assert.equal(startVerificationRequestedInBrowser(undefined), typeof window === "undefined" ? false : false)
  })
})

describe("the dashboard runs its own Verify My Account action once for the marker", () => {
  const start = dashboard.indexOf("const startVerificationHandledRef = useRef(false)")
  const body = dashboard.slice(start, dashboard.indexOf("// Travel Mode expiry popup", start))

  it("reuses handleVerifyMyAccount; no second flow implementation", () => {
    assert.ok(start > 0)
    assert.ok(body.includes("void handleVerifyMyAccount()"))
    assert.ok(!body.includes("setIdentityFlowOpen"))
  })

  it("waits like the status check (talent, no Secure-your-account dialog), runs once, strips the marker", () => {
    assert.ok(body.includes("startVerificationRequestedInBrowser()"))
    // the page itself never reads the URL (its existing source guard)
    assert.ok(!/useSearchParams|location\.search|searchParams|URLSearchParams/.test(dashboard))
    assert.ok(body.includes("shouldStartIdentityCheck({"))
    assert.ok(body.includes("securityDialogOpen: showSecurityModal"))
    assert.ok(body.includes("alreadyStarted: startVerificationHandledRef.current"))
    assert.ok(body.includes("startVerificationHandledRef.current = true"))
    assert.ok(body.includes('router.replace("/talent-dashboard")'))
  })
})
