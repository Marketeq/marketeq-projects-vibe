// Run like apply-gate.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { downloadBlockFor } from "./time-tracker-download"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const rejected = (status: number, data: Record<string, unknown>) => ({ response: { status, data } })

describe("Add Manual Time: how a rejected submit is read (backend answer only, no frontend eligibility logic)", () => {
  it("403 VERIFICATION_REQUIRED and 503 IDENTITY_VERIFICATION_UNAVAILABLE are gate answers", () => {
    assert.equal(downloadBlockFor(rejected(403, { error: "VERIFICATION_REQUIRED", missingRequirements: "both" })), "verification_required")
    assert.equal(downloadBlockFor(rejected(503, { error: "IDENTITY_VERIFICATION_UNAVAILABLE" })), "verification_unavailable")
  })

  it("every other error is not a gate answer and keeps its existing handling", () => {
    assert.equal(downloadBlockFor(rejected(400, { message: "Entries cannot exceed 12 hours." })), null)
    assert.equal(downloadBlockFor(rejected(409, { errorCode: "ERR_MANUAL_TIME_OVERLAP" })), null)
    assert.equal(downloadBlockFor(rejected(403, { error: "FORBIDDEN" })), null)
    assert.equal(downloadBlockFor(new Error("Network Error")), null)
    assert.equal(downloadBlockFor(undefined), null)
  })
})

describe("the dialog hands a gate refusal to its caller and keeps every other path", () => {
  const dialog = read("components", "add-manual-time-dialog.tsx")
  const catchBlock = dialog.slice(dialog.indexOf("} catch (e: any) {"), dialog.indexOf("} finally {", dialog.indexOf("} catch (e: any) {")))

  it("only the verification-required refusal calls it, checked first, and only when the caller opted in", () => {
    assert.ok(dialog.includes("onVerificationBlocked,"))
    assert.ok(catchBlock.includes('if (downloadBlockFor(e) === "verification_required" && onVerificationBlocked) {\n        onVerificationBlocked()\n      } else if (errorCode === "ERR_MANUAL_TIME_OVERLAP" && !confirmOverlap) {'))
    // the 503 unavailable answer is not routed to the callback: it keeps the inline error
    assert.ok(!catchBlock.includes("verification_unavailable"))
  })

  it("callers that omit the prop behave exactly as before: the same inline fallback runs", () => {
    assert.ok(dialog.includes("onVerificationBlocked?: () => void"))
    assert.ok(catchBlock.includes("&& onVerificationBlocked)"))
    assert.ok(catchBlock.includes('setSubmitError(e?.response?.data?.message ?? "Could not submit. Please try again.")'))
  })

  it("overlap confirmation and the inline error fallback are unchanged", () => {
    assert.ok(catchBlock.includes("setShowOverlapConfirm(true)"))
    assert.ok(catchBlock.includes('setSubmitError(e?.response?.data?.message ?? "Could not submit. Please try again.")'))
  })

  it("success handling is untouched: the entry is only reported saved after createManualTime resolved", () => {
    const tryAt = dialog.indexOf("await createManualTime(buildPayload(confirmOverlap))")
    assert.ok(tryAt > 0 && dialog.indexOf("onSaved?.()") > tryAt && dialog.indexOf("onSaved?.()") < dialog.indexOf("} catch (e: any) {"))
  })

  it("the dialog itself imports no gate UI and carries no eligibility logic", () => {
    assert.ok(!dialog.includes("AccountVerificationGate"))
    assert.ok(!/gateOpen|fullyVerified|fetchIdentityVerificationSummary/.test(dialog))
  })
})

describe("/time-tracking shows the default Verify your account dialog for it", () => {
  const page = read("app", "(group)", "time-tracking", "page.tsx")
  const handler = page.slice(page.indexOf("const goVerifyManualTime"), page.indexOf("}", page.indexOf("router.push(START_VERIFICATION_HREF)")) + 1)

  it("wires the dialog's prop to state that opens the existing AccountVerificationGate", () => {
    assert.ok(page.includes("onVerificationBlocked={() => setManualTimeBlocked(true)}"))
    assert.ok(page.includes("open={manualTimeBlocked}"))
    assert.ok(page.includes('reason="unstarted"'))
    // the gate does not dismiss itself: no Cancel/Esc/outside handlers are passed to the dialog
    assert.ok(!page.includes("onOpenChange={setManualTimeBlocked"))
  })

  it("Verify My Account closes both dialogs and uses the startVerification hand-off", () => {
    assert.ok(handler.includes("setManualTimeBlocked(false)"))
    assert.ok(handler.includes("setShowManualTimeDialog(false)"))
    assert.ok(handler.includes("router.push(START_VERIFICATION_HREF)"))
    assert.ok(page.includes("onVerify={goVerifyManualTime}"))
    assert.ok(page.includes("onRetryConnectionCheck={goVerifyManualTime}"))
  })

  it("it does not use the Start Logging Time modal, and the Log Time gate is untouched", () => {
    assert.ok(!handler.includes("startTimeGate") && !handler.includes("runStart"))
    assert.ok(/await runStart\(\(\) =>\s*openDesktopTracker\(/.test(page))
    assert.ok(page.includes("{startTimeGateDialog}"))
    const hook = read("utils", "useStartTimeGate.tsx")
    assert.ok(!hook.includes("manual"))
  })

  it("the gate dialog is the shared one, unmodified", () => {
    const gate = read("components", "account-verification-gate.tsx")
    assert.ok(gate.includes('"Your profile is not public"'))
    assert.ok(gate.includes("onEscapeKeyDown={(e) => e.preventDefault()}"))
  })
})
