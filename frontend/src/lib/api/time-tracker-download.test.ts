// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { downloadBlockFor } from "./time-tracker-download"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const err = (status: number, error?: string) => ({ response: { status, data: error ? { error } : {} } })

describe("downloadBlockFor (G8 backend gate answers)", () => {
  it("403 VERIFICATION_REQUIRED opens the verification popup", () => {
    assert.equal(downloadBlockFor(err(403, "VERIFICATION_REQUIRED")), "verification_required")
  })
  it("503 IDENTITY_VERIFICATION_UNAVAILABLE shows the existing status-unavailable popup", () => {
    assert.equal(downloadBlockFor(err(503, "IDENTITY_VERIFICATION_UNAVAILABLE")), "verification_unavailable")
  })
  it("anything else is an ordinary failure, never a block and never a download", () => {
    for (const e of [err(403), err(403, "SOMETHING_ELSE"), err(503), err(404, "VERIFICATION_REQUIRED"), err(500, "IDENTITY_VERIFICATION_UNAVAILABLE"), new Error("x"), null, undefined, {}]) {
      assert.equal(downloadBlockFor(e), null)
    }
  })
})

describe("time-tracking page: downloads are gated, the public release URLs are unchanged", () => {
  const page = read("app", "(group)", "time-tracking", "page.tsx")
  const client = read("service", "http", "time-tracker-download.ts")
  const start = page.indexOf("const startDownload = useCallback")
  const startEnd = page.indexOf("const triggerDownload", start)
  const startFn = page.slice(start, startEnd)

  it("keeps the existing public GitHub installer URLs (direct-URL access is out of scope)", () => {
    assert.ok(page.includes('"https://github.com/Marketeq/desktop-time-tracker/releases/latest/download"'))
    for (const f of ["Marketeq-mac-arm64.dmg", "Marketeq-mac-x64.dmg", "Marketeq-Setup-win-x64.exe", "Marketeq-Setup-win-arm64.exe"]) {
      assert.ok(page.includes(`downloadUrl: \`\${DTT_RELEASES_BASE}/${f}\``), f)
    }
  })

  it("asks the authenticated backend gate check first", () => {
    assert.ok(client.includes("/time-tracking/downloads/time-tracker/check"))
    assert.ok(start > -1 && startEnd > start)
    assert.ok(startFn.indexOf("await checkTimeTrackerDownload()") > -1)
  })

  it("starts the download (anchor click and navigation) only after the check passed", () => {
    const check = startFn.indexOf("await checkTimeTrackerDownload()")
    for (const marker of ["document.createElement", "a.href = selected.downloadUrl", "a.click()", "window.location.href = selected.downloadUrl"]) {
      assert.ok(startFn.indexOf(marker) > check, marker)
    }
    // every failure path returns before reaching the download code
    const catchBlock = startFn.slice(startFn.indexOf("} catch (err)"), startFn.indexOf("const a = document.createElement"))
    assert.equal((catchBlock.match(/return/g) ?? []).length, 2)
    assert.ok(catchBlock.includes("setVerificationBlock(block)"))
  })

  it("the only download code in the dialog is inside startDownload (button and automatic start both use it)", () => {
    assert.equal(page.split("a.href = selected.downloadUrl").length - 1, 1)
    assert.equal(page.split("window.location.href = selected.downloadUrl").length - 1, 1)
    assert.ok(page.includes("const triggerDownload = () => {\n    void startDownload()"))
    assert.ok(page.includes("setTimeout(() => void startDownload(), 400)"))
    assert.ok(page.includes("onClick={triggerDownload}"))
    assert.ok(page.includes("if (!open || downloadStarted || verificationBlock) return"))
  })

  it("a block opens the existing AccountVerificationGate, unavailable uses its status-unavailable state, no new copy", () => {
    assert.ok(page.includes('import { AccountVerificationGate } from "@/components/account-verification-gate"'))
    assert.ok(page.includes("<AccountVerificationGate"))
    assert.ok(page.includes('"verification_unavailable" ? "status_unavailable" : "unstarted"'))
    assert.ok(page.includes('router.push("/talent-dashboard")'))
    const gate = read("components", "account-verification-gate.tsx")
    assert.ok(gate.includes("Your profile is not public"))
    assert.ok(gate.includes("We couldn't check your verification status"))
  })
})
