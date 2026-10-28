// Run like apply-gate.test.ts (from the frontend/ directory).
// G8 (Log Time and Add Manual Time) starts verification in place (PMCM-652 phase 4).
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { startTimeBlockFrom, startTimeTitleFor } from "./start-time-gate"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const code = (source: string) =>
  source.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")
const count = (source: string, needle: string) =>
  source.split(needle).length - 1

const hook = read("utils", "useStartTimeGate.tsx")
const timeTracking = read("app", "(group)", "time-tracking", "page.tsx")
const earnings = read("app", "(group)", "earnings", "page.tsx")
const dialog = read("components", "download-desktop-tracker-dialog.tsx")
const manualDialog = read("components", "add-manual-time-dialog.tsx")

describe("G8 Log Time: the dedicated modal starts verification in place", () => {
  it("the hook never navigates or reloads and does not use the dashboard handoff", () => {
    const source = code(hook)
    assert.ok(!/useRouter|router\.|next\/navigation/.test(source))
    assert.ok(
      !/START_VERIFICATION|startVerification=|start-verification-handoff/.test(
        source
      )
    )
    assert.ok(
      !/talent-dashboard|window\.location|location\.(assign|replace|reload|href)|history\./.test(
        source
      )
    )
  })

  it("Start Verification closes the modal, then calls the shared host exactly once, and nothing else", () => {
    const goVerify = hook.slice(
      hook.indexOf("const goVerify = () => {"),
      hook.indexOf("const startTimeGateDialog")
    )
    assert.equal(count(goVerify, "startVerification()"), 1)
    assert.ok(
      goVerify.indexOf("setBlock(null)") <
        goVerify.indexOf("startVerification()")
    )
    assert.ok(!/proceed|runStart|await|fetch|check|setTimeout/.test(goVerify))
    assert.equal(count(hook, "onClick={goVerify}"), 1)
    assert.equal(count(hook, "useIdentityVerification()"), 1)
  })

  it("both popups of the hook (the dedicated modal and the status-unavailable gate) use that one action", () => {
    assert.ok(
      hook.includes("onVerify={goVerify}") &&
        hook.includes("onRetryConnectionCheck={goVerify}")
    )
    assert.ok(hook.includes("onDismissConnectionError={() => setBlock(null)}"))
    assert.ok(hook.includes('reason="status_unavailable"'))
  })

  it("Cancel, Escape and an outside click only close the dedicated modal", () => {
    const modal = hook.slice(
      hook.indexOf('open={block?.kind === "verification"}'),
      hook.indexOf("<DialogContent")
    )
    assert.ok(modal.includes("if (!open) setBlock(null)"))
    assert.ok(
      !/onInteractOutside|onEscapeKeyDown|onPointerDownOutside|proceed|startVerification|router/.test(
        modal
      )
    )
    assert.ok(
      /<DialogClose asChild>\s*<Button variant="outlined" size="md">\s*Cancel/.test(
        hook
      )
    )
  })

  it("the modal's design, copy and CSS are byte-for-byte dev-main's (sha256 of both popups)", () => {
    const block = hook
      .slice(
        hook.indexOf("  const startTimeGateDialog = ("),
        hook.indexOf("  return { runStart, startTimeGateDialog }")
      )
      .replace(/\s+/g, "")
    assert.equal(
      createHash("sha256").update(block).digest("hex"),
      "b9f0c2591bb142e782e8c95d93c0cbe20c977db5ed666d358446d62ba5986d2f"
    )
  })

  it("the three requirement variants keep their copy, and only an explicit refusal names one", () => {
    assert.equal(
      startTimeTitleFor("both"),
      "To start logging time, you must verify your identity and location"
    )
    assert.equal(
      startTimeTitleFor("identity"),
      "To start logging time, you must verify your identity"
    )
    assert.equal(
      startTimeTitleFor("location"),
      "To start logging time, you must verify your location"
    )
    assert.deepEqual(
      startTimeBlockFrom({
        response: {
          status: 403,
          data: {
            error: "VERIFICATION_REQUIRED",
            missingRequirements: "location",
          },
        },
      }),
      { kind: "verification", missing: "location" }
    )
    assert.deepEqual(
      startTimeBlockFrom({ response: { status: 503, data: {} } }),
      { kind: "unavailable" }
    )
    assert.deepEqual(startTimeBlockFrom(new Error("Network Error")), {
      kind: "unavailable",
    })
  })

  it("the gate decision is unchanged: a fresh read per click, proceed only after an allowed check, talents only", () => {
    assert.ok(hook.includes("await checkTimeTrackerDownload()"))
    assert.ok(hook.includes("if (checking.current) return"))
    assert.ok(
      hook.includes(
        "if (!isTalent) {\n        await proceed()\n        return\n      }"
      )
    )
    assert.ok(hook.includes("setBlock(startTimeBlockFrom(error))"))
    const source = code(hook)
    assert.equal(count(source, "await proceed()"), 2) // non-talent, allowed check
    assert.equal((source.match(/useRef\(/g) ?? []).length, 1) // the in-flight click guard only
  })
})

describe("every Log Time entry point goes through the one hook and nothing is retried", () => {
  it("/time-tracking and /earnings each call the hook once and launch only inside runStart", () => {
    for (const page of [timeTracking, earnings]) {
      assert.equal(count(page, "useStartTimeGate()"), 1)
      assert.equal(count(page, "await runStart(() =>"), 1)
      assert.equal(count(page, "openDesktopTracker("), 1) // the one call, inside runStart
      const call = page.indexOf("await runStart(() =>")
      assert.ok(page.indexOf("openDesktopTracker(", call) > call)
      assert.ok(page.includes("{startTimeGateDialog}"))
      assert.equal(count(page, "useIdentityVerification()"), 1)
    }
  })

  it("no page keeps the blocked launch to run after verification: nothing stored, no effect re-runs it", () => {
    for (const page of [timeTracking, earnings]) {
      assert.ok(
        !/pendingLogTime|retryLogTime|resumeLogTime|afterVerification/i.test(
          page
        )
      )
    }
    assert.ok(
      !/setPending|pendingStart|pendingLogTime|savedProceed|retryStart/i.test(
        code(hook)
      )
    )
  })
})

describe("Add Manual Time: the fallback popup starts verification in place and keeps the form", () => {
  const handler = timeTracking.slice(
    timeTracking.indexOf("const goVerifyManualTime"),
    timeTracking.indexOf(
      "}",
      timeTracking.indexOf("void startVerification()")
    ) + 1
  )

  it("Verify My Account closes only the popup and calls the shared host once", () => {
    assert.ok(handler.includes("setManualTimeBlocked(false)"))
    assert.equal(count(handler, "void startVerification()"), 1)
    assert.ok(
      handler.indexOf("setManualTimeBlocked(false)") <
        handler.indexOf("void startVerification()")
    )
    assert.ok(
      !/router|setShowManualTimeDialog|saveManual|createManualTime|finishSubmit|handleSubmit/.test(
        handler
      )
    )
  })

  it("the popup keeps its design and dismissal: it is the shared gate with the same props and no new exits", () => {
    assert.ok(timeTracking.includes("open={manualTimeBlocked}"))
    assert.ok(timeTracking.includes('reason="unstarted"'))
    assert.ok(timeTracking.includes("onVerify={goVerifyManualTime}"))
    assert.ok(
      timeTracking.includes("onRetryConnectionCheck={goVerifyManualTime}")
    )
    assert.ok(
      timeTracking.includes(
        "onDismissConnectionError={() => setManualTimeBlocked(false)}"
      )
    )
    assert.ok(!timeTracking.includes("onOpenChange={setManualTimeBlocked"))
  })

  it("the Add Manual Time dialog is untouched: it only reports the refusal and never retries the save", () => {
    assert.ok(
      manualDialog.includes(
        'downloadBlockFor(e) === "verification_required" && onVerificationBlocked'
      )
    )
    assert.ok(
      !/identity-verification-host|useIdentityVerification|router|talent-dashboard/.test(
        manualDialog
      )
    )
    assert.equal(count(manualDialog, "await createManualTime("), 1)
    assert.equal(count(manualDialog, "finishSubmit()"), 1) // handleSubmit only
    assert.ok(
      timeTracking.includes(
        "onVerificationBlocked={() => setManualTimeBlocked(true)}"
      )
    )
  })

  it("the page no longer uses the dashboard handoff or a router at all", () => {
    assert.ok(
      !/START_VERIFICATION|start-verification-handoff|useRouter|router\./.test(
        code(timeTracking)
      )
    )
  })
})

describe("the installer Download dialog: the fallback popup starts verification in place", () => {
  const goVerify = dialog.slice(
    dialog.indexOf("const goVerify = () => {"),
    dialog.indexOf("return (", dialog.indexOf("const goVerify = () => {"))
  )

  it("it gets the shared host's action from both pages as an optional callback", () => {
    assert.equal(
      count(timeTracking, "onStartVerification={startVerification}"),
      1
    )
    assert.equal(count(earnings, "onStartVerification={startVerification}"), 1)
    assert.ok(
      dialog.includes("onStartVerification?: () => void | Promise<void>")
    )
  })

  it("Verify My Account closes the popup and this dialog, then runs the callback once (the dashboard continuation is only the fallback)", () => {
    assert.ok(
      goVerify.indexOf("setVerificationBlock(null)") <
        goVerify.indexOf("onOpenChange(false)")
    )
    assert.ok(
      goVerify.indexOf("onOpenChange(false)") <
        goVerify.indexOf("void onStartVerification()")
    )
    assert.equal(count(goVerify, "void onStartVerification()"), 1)
    assert.ok(
      goVerify.indexOf("return") <
        goVerify.indexOf('router.push("/talent-dashboard")')
    )
  })

  it("the dialog itself imports no host, keeps its check and popup, and downloads nothing after verification", () => {
    assert.ok(
      !/identity-verification-host|useIdentityVerification/.test(dialog)
    )
    assert.ok(dialog.includes("await checkTimeTrackerDownload()"))
    assert.equal(count(dialog, "a.click()"), 1)
    assert.ok(
      dialog.includes(
        '"verification_unavailable" ? "status_unavailable" : "unstarted"'
      )
    )
    assert.ok(
      dialog.includes(
        "onDismissConnectionError={() => setVerificationBlock(null)}"
      )
    )
  })
})

describe("G2 and G3 are unchanged by G8", () => {
  it("G3 still uses the host through its own hook; G2 keeps its own navigation", () => {
    assert.ok(
      read("utils", "useApplyGate.tsx").includes("void startVerification()")
    )
    assert.ok(
      read("utils", "CreateListingGateHost.tsx").includes(
        "router.push(START_VERIFICATION_HREF)"
      )
    )
  })

  it("the dashboard handoff remains for the gates that still use it", () => {
    assert.ok(
      read("src", "lib", "api", "start-verification-handoff.ts").includes(
        "START_VERIFICATION_HREF"
      )
    )
    assert.ok(
      read("app", "(group)", "talent-dashboard", "page.tsx").includes(
        "startVerificationRequestedInBrowser"
      )
    )
  })
})
