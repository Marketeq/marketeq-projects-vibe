// Run like status-alerts.test.ts (from the frontend/ directory).
//
// Regression (PMCM-651): an account with an active "submitted for review" alert is approved in
// Didit. The page's first alert read can run before the approval is reconciled, so it shows
// Submitted; the page then opened the temporary "All set!" alert and never reloaded the list,
// leaving the stale Submitted card beside that alert (and, after a refresh, beside the new
// persistent Verified card). The fix: reload the list (bounded) once the approval was seen,
// let Verified replace Submitted, and never open the temporary alert.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  hasNewAlertOfType,
  reconcileStatusAlerts,
} from "./status-alert-reconcile"
import { buildAlertStack, selectVisibleAlerts } from "./status-alert-state"
import type { StatusAlert } from "./status-alerts"
import { readDashboardWithHost } from "./dashboard-host-source"

const page = readDashboardWithHost()
const count = (needle: string) => page.split(needle).length - 1

const NOW = Date.parse("2026-10-26T03:00:00.000Z")
const alert = (
  n: number,
  type: StatusAlert["type"],
  sec: number
): StatusAlert => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  type,
  title: type,
  body: "b",
  link: null,
  metadata: null,
  createdAt: new Date(NOW + sec * 1000).toISOString(),
})
const submitted = alert(1, "submitted_for_review", -600)
const verified = alert(2, "verified", 0)
const visible = (persistent: StatusAlert[]) =>
  selectVisibleAlerts(
    buildAlertStack({
      persistent,
      loginSessionKey: "login-1",
      travelModeActive: false,
    })
  ).visible.map((a) => a.type)

describe("approval transition: Submitted gives way to Verified without a refresh", () => {
  it("the first list read returns Submitted; after the approval a later read returns Verified (the server has dismissed Submitted)", async () => {
    let shown: StatusAlert[] = [submitted] // the page's first read, before the reconcile finished
    assert.deepEqual(visible(shown), ["submitted_for_review"])

    // The approval was seen (reviewed check / return from Didit): reconcile for Verified.
    const reads: StatusAlert[][] = [[submitted], [verified]]
    let read = 0
    const outcome = await reconcileStatusAlerts({
      list: async () => reads[Math.min(read++, reads.length - 1)],
      isSettled: (a) =>
        hasNewAlertOfType(a, "verified", new Set()) ||
        hasNewAlertOfType(a, "home_country_updated", new Set()),
      apply: (a) => {
        shown = a
      },
      isCurrent: () => true,
      sleep: async () => undefined,
    })
    assert.equal(outcome, "settled")
    assert.equal(read, 2) // it waited for the consumer: one more read, then stopped
    assert.deepEqual(visible(shown), ["verified"])
  })

  it("even if a read still carries both (Submitted not yet dismissed), Verified replaces it on screen", () => {
    assert.deepEqual(visible([submitted, verified]), ["verified"])
  })

  it("a later, independent submission is not hidden by the older Verified", () => {
    const later = alert(3, "submitted_for_review", 300)
    assert.deepEqual(visible([verified, later]), [
      "submitted_for_review",
      "verified",
    ])
  })

  it("persists across a refresh and a new login: the list is the server's, with nothing stored in the browser for it", () => {
    // After the transition the server list is [verified] (Submitted dismissed in the same
    // transaction); a refresh or another login reads exactly that.
    assert.deepEqual(visible([verified]), ["verified"])
    assert.doesNotMatch(
      page.slice(
        page.indexOf("const startAlertReconcile = useCallback"),
        page.indexOf("// A Travel Mode activation made in this page visit")
      ),
      /localStorage|sessionStorage/
    )
  })
})

describe("the page reloads the list once an approval is seen, and opens no second top-right alert", () => {
  it("the approval seen on return from Didit and the one seen later after review both start the bounded reload", () => {
    assert.equal(
      count('startAlertReconcile(["verified", "home_country_updated"])'),
      2
    )
    const returnPath = page.slice(
      page.indexOf("if (shouldShowSuccessModal(summary))"),
      page.indexOf("// Back from Didit with the session in review")
    )
    assert.match(
      returnPath,
      /setVerifiedModalOpen\(true\)[\s\S]*startAlertReconcile\(\["verified", "home_country_updated"\]\)/
    )
    const reviewed = page.slice(
      page.indexOf("onApproved: () => {"),
      page.indexOf("[startAlertReconcile, setProfileBannerShown]")
    )
    assert.match(
      reviewed,
      /setVerifiedModalOpen\(true\)\s+startAlertReconcile\(\["verified", "home_country_updated"\]\)/
    )
  })

  it("the temporary 'All set!' / home-country alerts are opened from nowhere", () => {
    assert.equal(count("setSuccessAlertOpen(true)"), 0)
    // The only way the home-country toast ever opened was the success alert's conversion.
    assert.equal(count("setHomeCountryUpdatedOpen(true)"), 1)
    assert.match(
      page,
      /if \(successAlertOpen && successAlertKind === "home-country-updated"\) \{[\s\S]*?setHomeCountryUpdatedOpen\(true\)/
    )
  })

  it("the approval modal's Done only closes the modal", () => {
    assert.match(
      page,
      /const handleSuccessDone = \(\) => \{\s+setVerifiedModalOpen\(false\)\s+\}/
    )
  })

  it("the reload is the shared bounded helper (no interval, no fixed 5s wait) and a travel activation still uses it", () => {
    assert.match(page, /startAlertReconcile\(\["travel_mode"\]\)/)
    assert.doesNotMatch(page, /setInterval/)
  })
})
