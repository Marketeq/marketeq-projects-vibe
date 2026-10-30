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
import {
  IDENTITY_HOST_PUBLIC_PREFIXES,
  identityHostResetKey,
  isIdentityHostActive,
  isIdentityHostPublicPath,
} from "./identity-host-routes"

const root = process.cwd()
const count = (source: string, needle: string) =>
  source.split(needle).length - 1
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

const ROOT = "app/layout.tsx"
const layoutText = (file: string) => readFileSync(join(root, file), "utf8")

describe("one provider, mounted once in the root layout inside AuthProvider", () => {
  it("only the root layout mounts the provider (exactly one tag in the whole app)", () => {
    assert.deepEqual(filesWith("<IdentityVerificationHostProvider"), [ROOT])
    const open =
      layoutText(ROOT).match(/<IdentityVerificationHostProvider>/g) ?? []
    const close =
      layoutText(ROOT).match(/<\/IdentityVerificationHostProvider>/g) ?? []
    assert.equal(open.length, 1)
    assert.equal(close.length, 1)
  })

  it("it sits inside AuthProvider and wraps the page children", () => {
    const layout = layoutText(ROOT)
    const auth = layout.indexOf("<AuthProvider>")
    const provider = layout.indexOf("<IdentityVerificationHostProvider>")
    const children = layout.indexOf("{children}", provider)
    const providerEnd = layout.indexOf("</IdentityVerificationHostProvider>")
    const authEnd = layout.indexOf("</AuthProvider>")
    assert.ok(
      auth > -1 &&
        auth < provider &&
        provider < children &&
        children < providerEnd &&
        providerEnd < authEnd
    )
  })

  it("no other layout and no page mounts it, and the dashboard no longer carries its own", () => {
    const layouts = app.filter(
      ({ file }) => /(^|\/)layout\.tsx$/.test(file) && file !== ROOT
    )
    assert.ok(layouts.length >= 5)
    for (const { file, text } of layouts) {
      assert.ok(
        !/identity-verification-host|IdentityVerificationHostProvider/.test(
          text
        ),
        file
      )
    }
    assert.ok(
      !/<IdentityVerificationHostProvider|import\s*\{[^}]*IdentityVerificationHostProvider/.test(
        dashboard
      )
    )
    assert.ok(!dashboard.includes("TalentDashboardContent"))
    assert.match(
      dashboard,
      /export default function TalentDashboard\(\) \{\s+const \[isOpen, setIsOpen\]/
    )
  })

  it("only the root layout, the dashboard and the migrated gates (G3 Apply, G8 Log Time / Manual Time) import the host module", () => {
    const migrated = [
      "utils/useApplyGate.tsx",
      "utils/useStartTimeGate.tsx",
      "app/(group)/time-tracking/page.tsx",
      "app/(group)/earnings/page.tsx",
      "components/withdraw-funds-dialog.tsx",
      "app/transfer-funds/page.tsx",
      "app/verify-withdrawal/page.tsx",
      "utils/CreateListingGateHost.tsx",
    ]
    assert.deepEqual(
      filesWith("@/contexts/identity-verification-host"),
      [DASHBOARD, ROOT, ...migrated].sort()
    )
    assert.deepEqual(
      filesWith("= useIdentityVerification()"),
      [DASHBOARD, ...migrated].sort()
    )
  })

  it("the flow and the gate are rendered by the host only: one flow instance, one gate", () => {
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

  it("the heavy flow is lazy: no static import of it anywhere in the host, and the loader is requested when the dashboard mounts or a verification starts", () => {
    assert.ok(
      !/import\s*\{[^}]*IdentityVerificationFlow[^}]*\}\s*from\s*"@\/components\/identity-verification-flow"/.test(
        host
      )
    )
    assert.match(host, /import dynamic from "next\/dynamic"/)
    assert.match(
      host,
      /dynamic\(loadIdentityVerificationFlow,\s*\{\s*ssr: false,?\s*\}\)/
    )
    assert.equal(
      host.split('import("@/components/identity-verification-flow")').length -
        1,
      1
    )
    assert.ok(host.includes("void loadIdentityVerificationFlow()"))
    assert.equal(
      host.split("void loadIdentityVerificationFlow()").length - 1,
      2
    ) // observer mount, startVerification
  })

  it("every gate is migrated: G2 (listing creation), G3 (Apply), G8 (Log Time, Manual Time) and G9 (withdrawals) use the host, and none uses the dashboard handoff", () => {
    for (const file of [
      "utils/CreateListingGateHost.tsx",
      "utils/useApplyGate.tsx",
      "utils/useStartTimeGate.tsx",
      "components/withdraw-funds-dialog.tsx",
      "app/transfer-funds/page.tsx",
    ]) {
      const text = readFileSync(join(root, file), "utf8")
      assert.ok(/useIdentityVerification\(\)/.test(text), file)
      assert.ok(!/START_VERIFICATION_HREF/.test(text), file)
      assert.ok(!/router\.push\("\/talent-dashboard"\)/.test(text), file)
    }
    // nothing builds the dashboard handoff link any more; the module and its dashboard
    // consumer stay (a bookmarked or old link still works), but no gate calls it
    assert.deepEqual(filesWith("START_VERIFICATION_HREF"), [
      "src/lib/api/start-verification-handoff.ts",
    ])
    assert.ok(dashboard.includes("startVerificationRequestedInBrowser"))
  })

  it("the host navigates only to hand a return from Didit back to its origin page: closing a flow leaves the page it was opened over", () => {
    const code = host.replace(/\/\/.*$/gm, "")
    // one router, one call, in the Didit-return hand-off (see verification-return-origin.ts)
    assert.equal(count(code, "useRouter()"), 1)
    assert.equal(count(code, "router.replace(target)"), 1)
    assert.equal(count(code, "router."), 1)
    assert.ok(!/location\.(replace|reload|assign)|history\./.test(code))
    // the host never reads a result, or anything else, from the URL itself
    assert.ok(!/window\.location|useSearchParams|URLSearchParams/.test(code))
  })
})

describe("the host is inert on public and authentication pages, and when nobody is signed in", () => {
  it("is inactive for every public entry page, nested or not, and for a signed-out visitor", () => {
    for (const path of [
      ...IDENTITY_HOST_PUBLIC_PREFIXES,
      "/sign-in/",
      "/sign-up/verify",
      "/reset-password/abc",
    ]) {
      assert.equal(
        isIdentityHostActive({ pathname: path, userId: "u1" }),
        false,
        path
      )
    }
    for (const path of [
      "/talent-dashboard",
      "/earnings",
      "/time-tracking",
      "/my-jobs",
      "/job-details/x",
      "/transfer-funds",
      "/verify-withdrawal",
      "/publish-project",
    ]) {
      assert.equal(
        isIdentityHostActive({ pathname: path, userId: "u1" }),
        true,
        path
      )
      assert.equal(
        isIdentityHostActive({ pathname: path, userId: null }),
        false,
        `${path} signed out`
      )
      assert.equal(
        isIdentityHostActive({ pathname: path, userId: undefined }),
        false,
        `${path} no user`
      )
    }
    assert.equal(isIdentityHostPublicPath("/sign-in-help"), false) // a prefix, not a substring
  })

  it("every public entry page that exists is covered", () => {
    for (const dir of [
      "sign-in",
      "sign-up",
      "forgot-password",
      "reset-password",
      "update-password",
      "recovery-email",
      "accept-invitation",
      "invite",
      "invite-talent",
    ]) {
      assert.ok(IDENTITY_HOST_PUBLIC_PREFIXES.includes(`/${dir}` as never), dir)
      assert.ok(statSync(join(root, "app", dir)).isDirectory(), dir)
    }
  })

  it("renders no verification UI unless active: the dialogs, the gate and the flow sit behind hostActive", () => {
    assert.equal(host.split("{hostActive && (").length - 1, 1)
    const at = host.indexOf("{hostActive && (")
    const rendered = host.slice(
      at,
      host.indexOf("</IdentityVerificationHostContext.Provider>")
    )
    for (const marker of [
      "open={vpnProxyModalOpen}",
      "<Dialog open={verifiedModalOpen}",
      "<Dialog open={pendingModalOpen}",
      "open={cooldownRetryTime !== null}",
      "<AccountVerificationGate",
      "<IdentityVerificationFlow",
    ]) {
      assert.ok(rendered.includes(marker), marker)
      assert.equal(
        host.indexOf(marker) > at ||
          marker === "<IdentityVerificationFlow" ||
          host.indexOf(marker) === host.lastIndexOf(marker),
        true,
        marker
      )
    }
    // the page children are rendered outside that condition, in every case
    assert.ok(host.indexOf("{children}") < at)
  })

  it("the Didit-return reconciliation starts only where the host is active", () => {
    const effectStart = host.indexOf(
      "const apply = (summary: IdentityVerificationSummaryView | null)"
    )
    const guard = host.lastIndexOf("if (!hostActive) return", effectStart)
    const firstRead = host.indexOf(
      "returnReconcilerRef.current ??=",
      effectStart
    )
    assert.ok(guard > -1 && guard < effectStart && effectStart < firstRead)
    assert.ok(
      host.includes("}, [user, startAlertReconcile, hostActive, returnGen])")
    )
  })

  it("makes no request at mount: every identity or alert read is behind a click or a guard that needs an active host and a talent", () => {
    const code = host.replace(/\/\/.*$/gm, "")
    const reads = [
      ...code.matchAll(
        /fetchIdentityVerificationSummary\(|checkVpnProxy\(|getDetectedLocation\(|startIdentityOnlyForDashboard\(|returnReconcilerRef\.current\.run\(|StatusAlertsAPI\.list\(/g
      ),
    ].map((m) => m.index ?? 0)
    const region = (from: string, to: string) => {
      const a = code.indexOf(from)
      assert.ok(a > -1, from)
      return [a, code.indexOf(to, a)] as const
    }
    const regions = [
      region(
        "const handleVerifyMyAccount = useCallback(",
        "}, [runIdentityVerificationCheck])"
      ), // a click
      region("const refreshLocationForRelocation = useCallback(", "}, [])"), // a click
      region(
        "const handleIdentityFlowOpenChange = useCallback(",
        "const openFlow = useCallback("
      ), // a flow closing
      region("const handleLiveTravelUpdate = useCallback(", "}, [openFlow])"), // a click
      region(
        "if (!hostActive) return",
        "}, [user, startAlertReconcile, hostActive, returnGen])"
      ), // the return effect, active host only
      region(
        "if (!user || !hostActive || resolveDashboardRole(user) !== ROLE.TALENT) return",
        "}, [user, travelSummary, hostActive])"
      ), // the alert list
      region(
        "if (!hostActive || !user || resolveDashboardRole(user) !== ROLE.TALENT) return",
        "}, [hostActive, user, travelSummary, accountKey])"
      ), // the summary read
      region("const startAlertReconcile = useCallback(", "    []\n  )"), // a result was just seen
      region(
        "const statusRefresher = useMemo(",
        "[startAlertReconcile, setProfileBannerShown]"
      ), // status refresh: guarded by active() and event-driven
    ]
    assert.ok(reads.length >= 9)
    for (const at of reads) {
      assert.ok(
        regions.some(([from, to]) => at > from && at < to),
        `read at ${at} is outside a click, a flow close or a guarded effect`
      )
    }
  })
})

describe("the host closes and forgets everything when the page, the account or the sign-in changes", () => {
  const key = (
    over: Partial<{
      pathname: string
      userId: string | null
      role: string | null
    }> = {}
  ) =>
    identityHostResetKey({
      pathname: "/talent-dashboard",
      userId: "u1",
      role: "TALENT",
      ...over,
    })

  it("the key is stable for the same page, account and role", () => {
    assert.equal(key(), key())
    assert.equal(key({ pathname: "/talent-dashboard" }), key())
  })

  it("it changes on logout and authentication loss, on an account switch, on a role change and on navigation", () => {
    for (const changed of [
      key({ userId: null }),
      key({ userId: undefined as never }),
      key({ userId: "u2" }),
      key({ role: "CLIENT" }),
      key({ role: null }),
      key({ pathname: "/earnings" }),
      key({ pathname: "/sign-in" }),
    ]) {
      assert.notEqual(changed, key())
    }
  })

  it("every public page and every signed-out state is one 'inactive' kind of key", () => {
    assert.ok(key({ pathname: "/sign-in" }).startsWith("inactive|"))
    assert.ok(key({ userId: null }).startsWith("inactive|"))
    assert.ok(key().startsWith("active|"))
  })

  it("the reset effect closes the gate, the VPN modal, the flow, the held location, the result dialogs and the cooldown, before anything else starts", () => {
    const at = host.indexOf(
      "useLayoutEffect(() => {\n    if (resetKeyRef.current === resetKey) return"
    )
    assert.ok(at > -1)
    const effect = host.slice(at, host.indexOf("}, [resetKey])", at))
    for (const call of [
      "setVerificationGateOpen(false)",
      'setConnectionCheckState("idle")',
      "setVpnProxyResult(null)",
      "setVpnProxyModalOpen(false)",
      "setIdentityFlowOpen(false)",
      "setDetectedLocation(null)",
      "setFlowLaunch({ key: 0 })",
      "setVerifiedModalOpen(false)",
      "setPendingModalOpen(false)",
      "setCooldownRetryTime(null)",
      "openOnClosedRef.current = null",
    ]) {
      assert.ok(effect.includes(call), call)
    }
    assert.ok(
      host.indexOf("resetKeyRef") < host.indexOf("const apply = (summary"),
      "settles before the reconciliation effect"
    )
    assert.match(
      host,
      /const resetKey = identityHostResetKey\(\{\s+pathname,\s+userId: user\?\.id,\s+role: user \? resolveDashboardRole\(user\) : null,\s+\}\)/
    )
  })

  it("the first render is not a reset: the dashboard mounts into exactly the state it always had", () => {
    assert.match(host, /const resetKeyRef = useRef\(resetKey\)/)
  })
})

describe("no duplicate reconciliation, listener or surface across pages", () => {
  it("a results page registers on mount and unregisters on unmount, and the return effect cleans up its listeners", () => {
    assert.match(
      host,
      /setResultsSurfaceMounted\(true\)[\s\S]*return \(\) => setResultsSurfaceMounted\(false\)/
    )
    const effectStart = host.indexOf(
      "const apply = (summary: IdentityVerificationSummaryView | null)"
    )
    const effect = host.slice(
      effectStart,
      host.indexOf("}, [user, startAlertReconcile, hostActive, returnGen])")
    )
    assert.ok(
      effect.includes(
        'document.removeEventListener("visibilitychange", onVisible)'
      )
    )
    assert.ok(
      effect.includes('window.removeEventListener("pageshow", onPageShow)')
    )
    assert.ok(effect.includes("cancelled = true"))
  })

  it("the observer is the dashboard's and is dropped when the dashboard unmounts", () => {
    assert.match(
      host,
      /if \(registration\.current === observer\) registration\.current = null/
    )
  })

  it("the dashboard still owns the single observer registration", () => {
    assert.deepEqual(
      filesWith("useIdentityVerificationObserver("),
      [HOST, DASHBOARD].sort().filter(Boolean)
    )
    assert.equal(
      dashboard.split("useIdentityVerificationObserver({").length - 1,
      1
    )
  })
})

describe("the Didit rules are not in the host", () => {
  it("the 15-minute resume rule and the session rules stay in the backend: no timing rule moved into the frontend host", () => {
    const code = host.replace(/\/\/.*$/gm, "")
    assert.ok(!/15 \* 60|900_?000|MINUTES|minutes/i.test(code))
    assert.ok(!/callbackUrl|returnOrigin|talent-dashboard/.test(code))
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
    // two listeners, both in the host: the Didit return's, and the status refresher's (one
    // refresh at a time, read-only; see status-refresh.ts)
    assert.equal(
      host.split('document.addEventListener("visibilitychange", onVisible)')
        .length - 1,
      2
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

describe("the dashboard keeps what is its own, and the host owns the one alert stack", () => {
  it("banner, prompts, check-in and Travel Mode popups are not in the host", () => {
    for (const own of [
      "profileBannerShown",
      "locationMismatchOpen",
      "travelerPromptOpen",
      "checkIn",
      "travelPopup",
      "shouldShowTravelExpiryPopup",
    ]) {
      assert.ok(
        !host.replace(/\/\/.*$/gm, "").includes(own),
        `${own} must stay on the dashboard`
      )
    }
  })

  it("the dashboard still owns the load-time status read and the banner, and no longer runs a resolver of its own for a reviewed session", () => {
    for (const own of [
      "const runIdentityVerificationCheck = useCallback(",
      "const handleTravelUpdate = useCallback(",
    ]) {
      assert.ok(dashboard.includes(own), own)
    }
  })

  it("the persistent alert stack, its list loading and its reconciliation exist once, in the host", () => {
    assert.deepEqual(filesWith("data-status-alert-stack"), [HOST])
    assert.deepEqual(filesWith("StatusAlertsAPI.list("), [HOST])
    assert.deepEqual(filesWith("reconcileStatusAlerts({"), [HOST])
    assert.deepEqual(filesWith("buildAlertStack({"), [HOST])
    for (const gone of [
      "StatusAlertsAPI",
      "data-status-alert",
      "const statusAlertStack",
      "const startAlertReconcile = useCallback(",
      "const handleTravelModeConfirmed",
      "const handleDismissLiveAlert",
    ]) {
      assert.ok(!dashboard.includes(gone), `${gone} moved to the host`)
    }
  })

  it("the stack is rendered only by an active host, for talents, and never for a client or a public page", () => {
    const at = host.indexOf("{hostActive && (")
    assert.ok(host.indexOf("data-status-alert-stack") > at)
    const listing = host.slice(
      host.indexOf("Talent accounts only, and only where the host is active"),
      host.indexOf("}, [user, travelSummary, hostActive])")
    )
    assert.ok(
      listing.includes(
        "!hostActive || resolveDashboardRole(user) !== ROLE.TALENT"
      )
    )
    assert.ok(
      listing.indexOf("ROLE.TALENT") < listing.indexOf("StatusAlertsAPI.list()")
    )
  })

  it("alerts follow the talent from page to page, and start empty for another account, a sign-out or a public page", () => {
    assert.match(
      host,
      /const accountKey = \[\s+hostActive \? "active" : "inactive",\s+user\?\.id \?\? "",\s+user \? resolveDashboardRole\(user\) \?\? "" : "",\s+\]\.join\("\|"\)/
    )
    assert.ok(
      !host
        .slice(
          host.indexOf("const accountKey"),
          host.indexOf("const accountKeyRef")
        )
        .includes("pathname")
    )
    const reset = host.slice(
      host.indexOf("if (accountKeyRef.current === accountKey) return"),
      host.indexOf("}, [accountKey])")
    )
    for (const call of [
      "setTravelSummary(null)",
      "setLiveAlertsHeld(false)",
      "setStatusAlerts([])",
      "setStatusAlertDismissal({",
      "setStatusAlertDismissFailed(false)",
      "setTravelActivationsHere(new Set())",
      "previousTravelSummaryRef.current = null",
      "alertReconcileGenRef.current += 1",
    ]) {
      assert.ok(reset.includes(call), call)
    }
  })

  it("the summary is read once: by the dashboard while it is mounted, else by the host once per account", () => {
    const reader = host.slice(
      host.indexOf(
        "// Off the dashboard, the host reads the summary once per account"
      ),
      host.indexOf("}, [hostActive, user, travelSummary, accountKey])")
    )
    assert.ok(
      reader.includes(
        "if (pageReadsSummaryRef.current || travelSummary !== null) return"
      )
    )
    assert.ok(
      reader.includes("if (summaryReadForRef.current === accountKey) return")
    )
    // the dashboard starts every visit from none and hands over what it reads
    assert.ok(
      dashboard.includes("setTravelSummary(null)\n  }, [setTravelSummary])")
    )
    assert.ok(
      dashboard.includes(
        "summary: travelSummary,\n    setSummary: setTravelSummary,"
      )
    )
    assert.ok(!dashboard.includes("useState<IdentityVerificationSummaryView"))
  })

  it("the dashboard's check-in holds the live card back, and releases it when it unmounts", () => {
    assert.ok(
      dashboard.includes(
        "setLiveAlertsHeld(checkInHasPriorityNow)\n    return () => setLiveAlertsHeld(false)"
      )
    )
    assert.ok(host.includes("travelSummary && !liveAlertsHeld"))
  })

  it("the card's Update works on any page: the dashboard's own handler when it is mounted, the host's default otherwise", () => {
    assert.ok(dashboard.includes("handleLiveTravelUpdate,\n  })"))
    assert.match(
      host,
      /const pageHandler = observerRef\.current\?\.handleLiveTravelUpdate\s+if \(pageHandler\) return pageHandler\(\)/
    )
  })

  it("every flow close re-reads the summary on any page, so a completed Travel Mode activation shows its alert without a refresh", () => {
    assert.match(
      host,
      /const pageHandler = observerRef\.current\?\.handleIdentityFlowOpenChange\s+if \(pageHandler\) \{\s+pageHandler\(open\)\s+\} else if \(!open\) \{[\s\S]*?fetchIdentityVerificationSummary\(\)\.then\(\(fresh\) => \{\s+if \(fresh\) setTravelSummary\(fresh\)/
    )
    assert.ok(
      host.includes(
        'if (!user || !isNewTravelActivation(previous, travelSummary)) return\n    startAlertReconcile(["travel_mode"])'
      )
    )
  })
})

describe("the observer contract between the host and the dashboard", () => {
  const called = [...host.matchAll(/observerRef\.current\?\.([A-Za-z]+)/g)]
    .map((m) => m[1])
    .sort()
  const registered = (() => {
    const start = dashboard.indexOf("useIdentityVerificationObserver({")
    const body = dashboard.slice(start, dashboard.indexOf("})", start))
    return [...body.matchAll(/^\s{4}([A-Za-z]+),?/gm)].map((m) => m[1]).sort()
  })()

  it("every reaction the host calls is registered by the dashboard, and nothing more", () => {
    assert.ok(called.length >= 5)
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
      "const startVerification = useCallback(",
      "return handleVerifyMyAccount()",
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
    assert.ok(!/\bfetch\(|axios|AxiosRequest/.test(code))
    // the one direct API use is the Update confirmation that moved here with the alerts
    assert.equal(count(code, "IdentityVerificationAPI."), 1)
    assert.ok(
      code.indexOf("IdentityVerificationAPI.confirmTravelMode") >
        code.indexOf("const handleTravelModeConfirmed")
    )
    assert.ok(!/(local|session)Storage\.(get|set|remove)Item\(["'`]/.test(code))
  })
})
