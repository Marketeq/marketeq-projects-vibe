// Run like apply-gate.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { startTimeBlockFrom, startTimeTitleFor } from "./start-time-gate"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const rejected = (status: number, data: Record<string, unknown>) => ({ response: { status, data } })

describe("G8 start-logging-time copy (Figma 13101-47505 / 47514 / location variant)", () => {
  it("identity and location", () => {
    assert.equal(startTimeTitleFor("both"), "To start logging time, you must verify your identity and location")
  })
  it("identity only", () => {
    assert.equal(startTimeTitleFor("identity"), "To start logging time, you must verify your identity")
  })
  it("location only", () => {
    assert.equal(startTimeTitleFor("location"), "To start logging time, you must verify your location")
  })
})

describe("startTimeBlockFrom: only an explicit refusal names a requirement; everything else fails closed", () => {
  it("403 VERIFICATION_REQUIRED carries the missing requirement", () => {
    for (const missing of ["both", "identity", "location"] as const) {
      assert.deepEqual(
        startTimeBlockFrom(rejected(403, { error: "VERIFICATION_REQUIRED", missingRequirements: missing })),
        { kind: "verification", missing }
      )
    }
  })

  it("503 IDENTITY_VERIFICATION_UNAVAILABLE is the unavailable state", () => {
    assert.deepEqual(startTimeBlockFrom(rejected(503, { error: "IDENTITY_VERIFICATION_UNAVAILABLE" })), { kind: "unavailable" })
  })

  it("malformed refusals fail closed to unavailable, never to a guessed copy or to open", () => {
    assert.deepEqual(startTimeBlockFrom(rejected(403, { error: "VERIFICATION_REQUIRED" })), { kind: "unavailable" })
    assert.deepEqual(startTimeBlockFrom(rejected(403, { error: "VERIFICATION_REQUIRED", missingRequirements: "none" })), { kind: "unavailable" })
    assert.deepEqual(startTimeBlockFrom(rejected(403, { error: "VERIFICATION_REQUIRED", missingRequirements: 7 })), { kind: "unavailable" })
    // right body, wrong status
    assert.deepEqual(startTimeBlockFrom(rejected(200, { error: "VERIFICATION_REQUIRED", missingRequirements: "both" })), { kind: "unavailable" })
  })

  it("any other failure (network, 500, 401, unknown 403) is also a closed gate", () => {
    assert.deepEqual(startTimeBlockFrom(new Error("Network Error")), { kind: "unavailable" })
    assert.deepEqual(startTimeBlockFrom(rejected(500, {})), { kind: "unavailable" })
    assert.deepEqual(startTimeBlockFrom(rejected(401, {})), { kind: "unavailable" })
    assert.deepEqual(startTimeBlockFrom(rejected(403, { error: "FORBIDDEN" })), { kind: "unavailable" })
    assert.deepEqual(startTimeBlockFrom(null), { kind: "unavailable" })
    assert.deepEqual(startTimeBlockFrom(undefined), { kind: "unavailable" })
  })
})

describe("every Log Time (start logging time) entry point asks the gate first", () => {
  const tt = read("app", "(group)", "time-tracking", "page.tsx")
  const earn = read("app", "(group)", "earnings", "page.tsx")

  it("time-tracking: its Log Time button runs openDesktopTracker only through runStart", () => {
    assert.ok(tt.includes('import { useStartTimeGate } from "@/utils/useStartTimeGate"'))
    assert.ok(tt.includes("const { runStart, startTimeGateDialog } = useStartTimeGate()"))
    assert.ok(/await runStart\(\(\) =>\s*openDesktopTracker\(/.test(tt))
    assert.equal(tt.split("openDesktopTracker(").length - 1, 1)
    assert.ok(tt.includes("{startTimeGateDialog}"))
  })

  it("earnings: handleLogTime (used by both Log Time buttons) runs openDesktopTracker only through runStart", () => {
    assert.ok(earn.includes("const { runStart, startTimeGateDialog } = useStartTimeGate()"))
    assert.ok(/await runStart\(\(\) =>\s*openDesktopTracker\(/.test(earn))
    assert.equal(earn.split("openDesktopTracker(").length - 1, 1)
    assert.equal(earn.split("onClick={handleLogTime}").length - 1, 2)
    assert.ok(earn.includes("{startTimeGateDialog}"))
  })

  it("openDesktopTracker has no other caller in the app", () => {
    const callers: string[] = []
    const walk = (dir: string) => {
      for (const e of require("node:fs").readdirSync(join(process.cwd(), dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`
        if (e.isDirectory()) { if (!/node_modules|\.next/.test(e.name)) walk(rel) }
        else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) && read(rel).includes("openDesktopTracker(")) callers.push(rel)
      }
    }
    for (const d of ["app", "components", "utils", "src", "lib", "hooks"]) { try { walk(d) } catch { /* absent */ } }
    assert.deepEqual(callers.sort(), [
      "app/(group)/earnings/page.tsx",
      "app/(group)/time-tracking/page.tsx",
      "components/download-desktop-tracker-dialog.tsx",
    ])
  })
})

describe("the hook: gate first, nothing is created while blocked", () => {
  const hook = read("utils", "useStartTimeGate.tsx")
  const check = hook.slice(hook.indexOf("const runStart"), hook.indexOf("const goVerify"))

  it("talents only, fresh check every click, proceed() only after the check resolved", () => {
    assert.ok(hook.includes("resolveDashboardRole(user) === ROLE.TALENT"))
    assert.ok(check.includes("if (!isTalent) {\n        await proceed()\n        return\n      }"))
    const checkAt = check.indexOf("await checkTimeTrackerDownload()")
    const catchAt = check.indexOf("catch (error) {\n        setBlock(startTimeBlockFrom(error))\n        return")
    const proceedAt = check.lastIndexOf("await proceed()")
    assert.ok(checkAt > 0 && catchAt > checkAt && proceedAt > catchAt)
  })

  it("the only API it can call is the read-only G8 check: no session, entry, break, idle, manual-time or launch call", () => {
    assert.ok(hook.includes('import { checkTimeTrackerDownload } from "@/service/http/time-tracker-download"'))
    assert.ok(!/manual-time|desktop-launch|sessions|time-entries|breaks|idles|marketeq:\/\/|localStorage|sessionStorage/.test(hook))
    assert.ok(!hook.includes("openDesktopTracker"))
  })

  it("Cancel and Esc only close: no navigation, API, launch, download or stored state", () => {
    assert.ok(/<DialogClose asChild>\s*<Button variant="outlined" size="md">\s*Cancel\s*<\/Button>\s*<\/DialogClose>/.test(hook))
    const onOpenChange = hook.slice(hook.indexOf("onOpenChange={"), hook.indexOf("<DialogContent"))
    assert.ok(onOpenChange.includes("if (!open) setBlock(null)"))
    assert.ok(!/router|fetch|check|proceed|localStorage|sessionStorage/i.test(onOpenChange))
  })

  it("Start Verification closes the modal and uses the G3 startVerification hand-off", () => {
    assert.ok(/<Button size="md" onClick=\{goVerify\}>\s*Start Verification\s*<\/Button>/.test(hook))
    assert.ok(hook.includes("const goVerify = () => {\n    setBlock(null)\n    router.push(START_VERIFICATION_HREF)\n  }"))
  })

  it("unavailable reuses the existing status-unavailable popup", () => {
    assert.ok(hook.includes('open={block?.kind === "unavailable"}'))
    assert.ok(hook.includes('reason="status_unavailable"'))
  })
})

describe("other G8 actions keep their existing handling", () => {
  it("the installer Download still uses the default Verify My Account popup and its own check", () => {
    const dialog = read("components", "download-desktop-tracker-dialog.tsx")
    assert.ok(!dialog.includes("useStartTimeGate") && !dialog.includes("start-time-gate"))
    assert.ok(dialog.includes("await checkTimeTrackerDownload()"))
    assert.ok(dialog.includes("<AccountVerificationGate"))
    assert.ok(dialog.includes('router.push("/talent-dashboard")'))
    assert.ok(!dialog.includes("startVerification"))
  })

  it("Add Manual Time (POST /manual-time, also G8-gated server side) is untouched", () => {
    const manual = read("components", "add-manual-time-dialog.tsx")
    assert.ok(!manual.includes("useStartTimeGate") && !manual.includes("start-time-gate"))
    assert.ok(!manual.includes("To start logging time"))
  })

  it("the Add Manual Time button on /time-tracking still opens its own dialog directly", () => {
    const tt = read("app", "(group)", "time-tracking", "page.tsx")
    assert.ok(tt.includes("onClick={() => setShowManualTimeDialog(true)}"))
  })
})
