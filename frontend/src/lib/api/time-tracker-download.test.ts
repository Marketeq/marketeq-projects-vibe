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

describe("download dialog: downloads are gated, the public release URLs are unchanged", () => {
  // dev-main (#774) moved the installer dialog into a shared component used by
  // /time-tracking and /earnings, so the gate is pinned there, once.
  const dialog = read("components", "download-desktop-tracker-dialog.tsx")
  const client = read("service", "http", "time-tracker-download.ts")
  const start = dialog.indexOf("const triggerDownload = async () => {")
  const startEnd = dialog.indexOf("const otherOsPlatform", start)
  const fn = dialog.slice(start, startEnd)

  it("keeps the existing public installer URLs (direct-URL access is out of scope)", () => {
    for (const f of ["Marketeq-mac-arm64.dmg", "Marketeq-mac-x64.dmg", "Marketeq-Setup-win-x64.exe", "Marketeq-Setup-win-arm64.exe"]) {
      assert.ok(dialog.includes(`downloadUrl: \`\${DTT_RELEASES_BASE}/${f}\``), f)
    }
    assert.ok(dialog.includes("getDesktopDownloadBaseUrl()"))
  })

  it("asks the authenticated backend gate check first", () => {
    assert.ok(client.includes("/time-tracking/downloads/time-tracker/check"))
    assert.ok(start > -1 && startEnd > start)
    assert.ok(fn.indexOf("await checkTimeTrackerDownload()") > -1)
  })

  it("starts the download (anchor click) only after the check passed", () => {
    const check = fn.indexOf("await checkTimeTrackerDownload()")
    for (const marker of ["document.createElement", "a.href = selected.downloadUrl", "a.click()"]) {
      assert.ok(fn.indexOf(marker) > check, marker)
    }
    // every failure path returns before reaching the download code
    const catchBlock = fn.slice(fn.indexOf("} catch (err)"), fn.indexOf("const a = document.createElement"))
    assert.equal((catchBlock.match(/return/g) ?? []).length, 2)
    assert.ok(catchBlock.includes("setVerificationBlock(block)"))
  })

  it("the only download code in the dialog is inside triggerDownload (button and 'click here' both use it)", () => {
    assert.equal(dialog.split("a.href = selected.downloadUrl").length - 1, 1)
    assert.equal(dialog.split("a.click()").length - 1, 1)
    assert.equal(dialog.split("onClick={triggerDownload}").length - 1, 2)
    assert.ok(!dialog.includes("window.location.href = selected.downloadUrl"))
  })

  it("pages use the shared dialog and carry no download code of their own", () => {
    for (const page of [read("app", "(group)", "time-tracking", "page.tsx"), read("app", "(group)", "earnings", "page.tsx")]) {
      assert.ok(page.includes('from "@/components/download-desktop-tracker-dialog"'))
      assert.ok(!page.includes("a.href = selected.downloadUrl"))
      assert.ok(!page.includes("releases/latest/download"))
    }
  })

  it("a block opens the existing AccountVerificationGate, unavailable uses its status-unavailable state, no new copy", () => {
    assert.ok(dialog.includes('import { AccountVerificationGate } from "@/components/account-verification-gate"'))
    assert.ok(dialog.includes("<AccountVerificationGate"))
    assert.ok(dialog.includes('"verification_unavailable" ? "status_unavailable" : "unstarted"'))
    assert.ok(dialog.includes('router.push("/talent-dashboard")'))
    const gate = read("components", "account-verification-gate.tsx")
    assert.ok(gate.includes("Your profile is not public"))
    assert.ok(gate.includes("We couldn't check your verification status"))
  })
})
