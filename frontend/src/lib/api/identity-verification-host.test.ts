// Run like profile-banner.test.ts (from the frontend/ directory).
// Source-level guards for the shared identity verification host (Phase 1): it is mounted
// around the talent dashboard only, owns the verification hosting that used to live on the
// dashboard page, is the single owner of the Didit-return reconciliation, and the dashboard
// keeps everything that is its own.
import assert from "node:assert/strict"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, it } from "node:test"
import { readDashboardPage, readIdentityHost } from "./dashboard-host-source"

const root = process.cwd()
const SKIP = new Set([
  "node_modules",
  ".next",
  ".storybook",
  "storybook-static",
  "e2e-cucumber",
])

function sources(dir = root, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith(".")) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) sources(path, out)
    else if (/\.(ts|tsx)$/.test(name) && !/\.(test|stories)\.tsx?$/.test(name))
      out.push(path)
  }
  return out
}
const app = sources().map((path) => ({
  file: relative(root, path),
  text: readFileSync(path, "utf8"),
}))
const filesWith = (needle: string | RegExp) =>
  app
    .filter(({ text }) =>
      typeof needle === "string" ? text.includes(needle) : needle.test(text)
    )
    .map(({ file }) => file)
    .sort()

const HOST = "contexts/identity-verification-host.tsx"
const DASHBOARD = "app/(group)/talent-dashboard/page.tsx"
const host = readIdentityHost()
const dashboard = readDashboardPage()

describe("the host is mounted around the talent dashboard only", () => {
  it("only the dashboard page imports the provider or the hooks", () => {
    assert.deepEqual(filesWith("@/contexts/identity-verification-host"), [
      DASHBOARD,
    ])
    assert.deepEqual(
      filesWith("IdentityVerificationHostProvider"),
      [DASHBOARD, HOST].sort()
    )
  })

  it("no layout mounts it: the root layout and the (group) layouts never mention it", () => {
    const layouts = app.filter(({ file }) => /(^|\/)layout\.tsx$/.test(file))
    assert.ok(layouts.length > 0)
    for (const { file, text } of layouts) {
      assert.ok(
        !/identity-verification-host|IdentityVerificationHostProvider/.test(
          text
        ),
        file
      )
    }
  })

  it("the dashboard default export wraps its content in the provider and nothing else", () => {
    assert.match(
      dashboard,
      /export default function TalentDashboard\(\) \{\s+return \(\s+<IdentityVerificationHostProvider>\s+<TalentDashboardContent \/>\s+<\/IdentityVerificationHostProvider>\s+\)\s+\}/
    )
  })

  it("the flow and the gate are rendered by the host only: no verification UI can appear on another page by itself", () => {
    // The dev preview route renders the flow on purpose (simulated, development only).
    assert.deepEqual(
      filesWith("<IdentityVerificationFlow"),
      [HOST, "app/identity-verification-preview/preview-client.tsx"].sort()
    )
    assert.equal(host.split("<IdentityVerificationFlow").length - 1, 1)
    assert.equal(host.split('reason="unstarted"').length - 1, 1)
    assert.ok(!dashboard.includes("<IdentityVerificationFlow"))
    assert.ok(!dashboard.includes('reason="unstarted"'))
  })

  it("the other gate pages are untouched: none of them imports the host", () => {
    for (const file of [
      "utils/useApplyGate.tsx",
      "utils/useStartTimeGate.tsx",
      "utils/CreateListingGateHost.tsx",
      "components/download-desktop-tracker-dialog.tsx",
      "components/withdraw-funds-dialog.tsx",
      "app/transfer-funds/page.tsx",
      "app/verify-withdrawal/page.tsx",
    ]) {
      assert.ok(
        !readFileSync(join(root, file), "utf8").includes(
          "identity-verification-host"
        ),
        file
      )
    }
  })

  it("the Phase 1 handoff is still there: the gates still send the talent to the dashboard marker", () => {
    assert.ok(dashboard.includes("startVerificationRequestedInBrowser"))
    assert.ok(
      readFileSync(join(root, "utils/useApplyGate.tsx"), "utf8").includes(
        "START_VERIFICATION_HREF"
      )
    )
  })
})

describe("one owner for the Didit-return reconciliation, and no duplicates", () => {
  it("createReturnReconciler is created by the host alone", () => {
    assert.deepEqual(
      filesWith("createReturnReconciler("),
      [HOST, "src/lib/api/identity-verification-state.ts"].sort()
    )
    assert.ok(!dashboard.includes("createReturnReconciler"))
    assert.equal(host.split("createReturnReconciler(").length - 1, 2) // the load run and the bfcache restore, sharing one ref
    assert.equal(host.split("returnReconcilerRef.current ??=").length - 1, 2)
    assert.equal(host.split("useRef<ReturnType<").length - 1, 1)
  })

  it("the awaiting-result flag is read, polled and cleared in the host only", () => {
    assert.ok(
      !/hasAwaitingResult|clearAwaitingResult|RESULT_POLL/.test(dashboard)
    )
    assert.equal(
      host.split('document.addEventListener("visibilitychange", onVisible)')
        .length - 1,
      1
    )
    assert.equal(
      host.split('window.addEventListener("pageshow", onPageShow)').length - 1,
      1
    )
  })

  it("exactly one listener for the status-refreshed event handles it on the dashboard, and it is the host's", () => {
    assert.ok(!dashboard.includes("IDENTITY_STATUS_REFRESHED_EVENT"))
    assert.equal(
      host.split("window.addEventListener(IDENTITY_STATUS_REFRESHED_EVENT")
        .length - 1,
      1
    )
  })

  it("each result dialog exists once, in the host", () => {
    for (const marker of [
      "<Dialog open={verifiedModalOpen}",
      "<Dialog open={pendingModalOpen}",
      "open={cooldownRetryTime !== null}",
      "open={vpnProxyModalOpen}",
    ]) {
      assert.equal(host.split(marker).length - 1, 1, marker)
      assert.ok(!dashboard.includes(marker), marker)
    }
  })

  it("the host starts a Didit trip from one place: the Verify My Account handler", () => {
    assert.equal(
      host.split("await startIdentityOnlyForDashboard()").length - 1,
      1
    )
    assert.ok(!dashboard.includes("startIdentityOnlyForDashboard"))
  })
})

describe("the dashboard keeps what is its own", () => {
  it("banner, status alerts, prompts, check-in and Travel Mode popups are not in the host", () => {
    for (const own of [
      "profileBannerShown",
      "StatusAlertsAPI",
      "locationMismatchOpen",
      "travelerPromptOpen",
      "checkIn",
      "travelPopup",
      "shouldShowTravelExpiryPopup",
      "reconcileStatusAlerts",
    ]) {
      assert.ok(
        !host.replace(/\/\/.*$/gm, "").includes(own),
        `${own} must stay on the dashboard`
      )
    }
  })

  it("the dashboard still owns the load-time status read, the banner and the alert stack", () => {
    for (const own of [
      "const runIdentityVerificationCheck = useCallback(",
      "const statusAlertStack = useMemo(",
      "const startAlertReconcile = useCallback(",
      "const reviewedCheckStartedRef = useRef(false)",
    ]) {
      assert.ok(dashboard.includes(own), own)
    }
  })
})

describe("the observer contract between the host and the dashboard", () => {
  const called = [...host.matchAll(/observerRef\.current\?\.([A-Za-z]+)\?\./g)]
    .map((m) => m[1])
    .sort()
  const registered = (() => {
    const start = dashboard.indexOf("useIdentityVerificationObserver({")
    const body = dashboard.slice(start, dashboard.indexOf("})", start))
    return [...body.matchAll(/^\s{4}([A-Za-z]+),?/gm)].map((m) => m[1]).sort()
  })()

  it("every reaction the host calls is registered by the dashboard, and nothing more", () => {
    assert.ok(called.length >= 6)
    assert.deepEqual([...new Set(called)], registered)
  })

  it("the host reaches the page only through the observer and the dashboard reaches the host only through the hook", () => {
    assert.ok(
      !/talent-dashboard/.test(
        host.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")
      )
    )
    assert.match(dashboard, /= useIdentityVerification\(\)/)
  })

  it("the hook fails loudly outside the provider", () => {
    assert.match(
      host,
      /useIdentityVerification must be used inside IdentityVerificationHostProvider/
    )
  })

  it("exposes the future API: start, open the flow, close handling, status-refreshed subscription", () => {
    for (const member of [
      "startVerification: handleVerifyMyAccount",
      "openFlow,",
      "subscribeStatusRefreshed,",
      "handleIdentityFlowOpenChange?: (open: boolean) => void",
      "onClosed?: () => void",
    ]) {
      assert.ok(host.includes(member), member)
    }
  })
})

describe("what was moved did not change", () => {
  it("the Verify My Account handler keeps its order: VPN check, fresh summary, decision, Didit, location", () => {
    const handler = host.slice(
      host.indexOf("const handleVerifyMyAccount = useCallback("),
      host.indexOf("}, [runIdentityVerificationCheck])")
    )
    const order = [
      "await checkVpnProxy()",
      "await fetchIdentityVerificationSummary()",
      "verifyActionFor(summary)",
      "await startIdentityOnlyForDashboard()",
      "getDetectedLocation({ useBrowserLocation: true })",
      "setIdentityFlowOpen(true)",
    ].map((needle) => handler.indexOf(needle))
    assert.ok(order.every((at) => at > -1))
    assert.deepEqual(
      [...order].sort((a, b) => a - b),
      order
    )
  })

  it("the flow close still replaces an Update instance (so its no-op toast never mounts) before the page re-reads", () => {
    const close = host.slice(
      host.indexOf("const handleIdentityFlowOpenChange = useCallback("),
      host.indexOf("const openFlow = useCallback(")
    )
    assert.ok(
      close.indexOf("setIdentityFlowOpen(open)") <
        close.indexOf("prev.activeTravelModeUpdate ?")
    )
    assert.ok(
      close.indexOf("prev.activeTravelModeUpdate ?") <
        close.indexOf("observerRef.current?.handleIdentityFlowOpenChange")
    )
  })

  it("openFlow bumps the remount key, keeps the held location when none is given, and opens", () => {
    const open = host.slice(host.indexOf("const openFlow = useCallback("))
    const body = open.slice(0, open.indexOf("\n  )\n"))
    assert.ok(
      body.includes(
        "if (options.detectedLocation) setDetectedLocation(options.detectedLocation)"
      )
    )
    assert.ok(
      body.includes(
        "setFlowLaunch((prev) => ({ key: prev.key + 1, ...launch }))"
      )
    )
    assert.ok(
      body.indexOf("setFlowLaunch") < body.indexOf("setIdentityFlowOpen(true)")
    )
  })

  it("the host adds no network call of its own and no storage key", () => {
    const code = host.replace(/\/\/.*$/gm, "")
    assert.ok(
      !/\bfetch\(|axios|AxiosRequest|IdentityVerificationAPI/.test(code)
    )
    assert.ok(!/(local|session)Storage\.(get|set|remove)Item\(["'`]/.test(code))
  })
})
