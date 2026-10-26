// Run like status-alerts.test.ts (from the frontend/ directory).
//
// Regression (PMCM-651): Update on "You are in Travel Mode" > "Temporarily traveling" made the
// flow open its own temporary "Travel mode is on." toast on top of the persistent alert stack.
// For a Travel Mode that is already in force that choice is a no-op: the ongoing card stays,
// nothing is saved, and no toast shows. The flow (components/identity-verification-flow.tsx)
// is read-only, so the dashboard page replaces the flow instance when it closes.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = read("app", "(group)", "talent-dashboard", "page.tsx")
const flow = read("components", "identity-verification-flow.tsx")

const handler = page.slice(
  page.indexOf("const handleIdentityFlowOpenChange = useCallback("),
  page.indexOf("[markTravelerPromptCompleted]")
)
const closeBranch = handler.slice(
  handler.indexOf("if (!open) {"),
  handler.indexOf("const kind = mismatchFlowKindRef.current")
)
// The "Temporarily traveling" button on "Tell us more about you current location".
const temporarilyButton = flow.slice(
  flow.indexOf("if (activeTravelModeUpdate) {"),
  flow.indexOf('send("NEXT")', flow.indexOf("if (activeTravelModeUpdate) {"))
)

describe("the flow's behaviour this fix depends on (read-only file)", () => {
  it("for an Update on an in-force Travel Mode, 'Temporarily traveling' only opens the toast and closes: nothing is saved or sent", () => {
    assert.match(
      temporarilyButton,
      /if \(activeTravelModeUpdate\) \{\s+setTravelModeNotificationOpen\(true\)\s+onOpenChange\(false\)\s+return\s+\}/
    )
    assert.doesNotMatch(
      temporarilyButton,
      /send\(|persistTravelClassification|recordTravelDuration|fetch\(|API\./
    )
  })

  it("the page does not edit the flow: its toast is still its own", () => {
    assert.match(
      flow,
      /const \[travelModeNotificationOpen, setTravelModeNotificationOpen\] =/
    )
  })
})

describe("Update > Temporarily traveling closes with no toast and keeps the ongoing card", () => {
  it("closing a flow launched with activeTravelModeUpdate replaces the flow instance (new key) in the same update, so the toast never mounts", () => {
    assert.match(
      closeBranch,
      /setFlowLaunch\(\(prev\) =>\s+prev\.activeTravelModeUpdate \? \{ \.\.\.prev, key: prev\.key \+ 1 \} : prev\s+\)/
    )
    assert.ok(page.includes("key={flowLaunch.key}"))
  })

  it("only an Update-style launch is reset: a first-time activation keeps its own confirmation, because its launch has no activeTravelModeUpdate flag", () => {
    assert.match(closeBranch, /prev\.activeTravelModeUpdate \?/)
    // The first-time entry points never set the flag.
    const verify = page.slice(
      page.indexOf("const handleVerifyMyAccount = useCallback("),
      page.indexOf("}, [runIdentityVerificationCheck])")
    )
    assert.match(
      verify,
      /\.\.\.\(activeTravelModeUpdate \? \{ activeTravelModeUpdate \} : \{\}\)/
    )
  })

  it("the close branch dismisses nothing, saves nothing and publishes nothing", () => {
    assert.doesNotMatch(
      closeBranch,
      /dismiss|StatusAlertsAPI|setStatusAlertDismissal|recordTravel|startStillTraveling|fetch\w*\(|localStorage|reconcile/i
    )
  })

  it("the ongoing card stays eligible: it is derived from the summary, and a re-read of an unchanged period is not a new activation", async () => {
    const { isNewTravelActivation } = await import("./status-alert-reconcile")
    const inForce = {
      travelModeEndsAt: "2026-11-02T01:50:00.000Z",
      travelModeExpired: false,
    }
    // After the no-op the re-read returns the same period: the live card stays, and no
    // reconciliation (so no extra alert-list reads) starts.
    assert.equal(isNewTravelActivation(inForce, { ...inForce }), false)
  })

  it("the existing unfinished-flow behaviour is intact: any close still re-reads /me", () => {
    assert.match(
      handler,
      /if \(!open && kind === null\) \{[\s\S]*fetchIdentityVerificationSummary\(\)/
    )
  })
})
