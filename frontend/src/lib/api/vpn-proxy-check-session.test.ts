// Run (from the frontend/ directory):
//   npx tsc src/lib/api/vpn-proxy-check-session.test.ts --outDir <tmp> --module commonjs
//   --target es2020 --skipLibCheck --esModuleInterop --types node && node --test <tmp>/src/lib/api
// (the frontend has no test runner; node:test needs none.)
//
// PMCM-637: the shared host's VPN/proxy check. The host wires these same functions to its state,
// so the host handler is modelled below with the real session and helpers.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  createConnectionCheckSession,
  detectionOf,
  gateConnectionStateFor,
  shouldShowCheckingGate,
  vpnProxyModalCopyFor,
  type VpnProxyDetection,
  type VpnProxyDetectionOutcome,
} from "./vpn-proxy-check-session"
import { identityHostResetKey } from "./identity-host-routes"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")

const VPN = vpnProxyModalCopyFor("vpn_detected")!
const PROXY = vpnProxyModalCopyFor("proxy_detected")!
const BOTH = vpnProxyModalCopyFor("vpn_and_proxy_detected")!

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}
const tick = () => new Promise((r) => setImmediate(r))

// The host handler, modelled with the real session (as didit-launch-lifecycle.test.ts models the host). `shown` is the modal copy the
// user sees: it is derived from `detection` exactly as the host derives it.
function makeHost(check: () => Promise<VpnProxyDetectionOutcome>) {
  const session = createConnectionCheckSession()
  const s = {
    detection: null as VpnProxyDetection | null,
    modalOpen: false,
    gateOpen: false,
    state: "idle" as "idle" | "checking" | "unavailable",
    retrying: false,
    cleanRuns: 0,
    didit: 0,
    copies: [] as Array<string | null>, // every copy the modal showed, in order
  }
  const record = () =>
    s.copies.push(s.modalOpen ? (vpnProxyModalCopyFor(s.detection)?.title ?? null) : null)
  // Mirrors the host handler's gating: one check at a time, nothing applied once it is stale.
  const verify = () =>
    session.run(async (isCurrent) => {
      const retrying = s.state === "unavailable"
      s.retrying = retrying
      s.state = "checking"
      record()
      const outcome = await check()
      if (!isCurrent()) return
      s.retrying = false
      const detection = detectionOf(outcome)
      if (detection) s.detection = detection
      if (outcome === "none") {
        s.modalOpen = false
        s.cleanRuns += 1 // stands for: re-read status, start the flow / Didit
        s.didit += 1
        record()
        return
      }
      if (outcome === "unavailable") {
        s.state = "unavailable"
        s.modalOpen = false
        s.gateOpen = true
        record()
        return
      }
      s.state = "idle"
      s.gateOpen = false
      s.modalOpen = true
      record()
    })
  const dismiss = () => {
    session.invalidate()
    s.retrying = false
    s.state = "idle"
    s.modalOpen = false
  }
  return { s, verify, dismiss, session }
}

describe("detection copy: only a final VPN/proxy answer has copy", () => {
  it("each detection has its own copy, and they are all different", () => {
    assert.equal(VPN.title, "VPN Detected")
    assert.equal(PROXY.title, "Proxy Detected")
    assert.equal(BOTH.title, "VPN & Proxy Detected")
    assert.equal(new Set([VPN.title, PROXY.title, BOTH.title]).size, 3)
  })

  it('"none", "checking", "unavailable", null and undefined have no copy, so never the combined one', () => {
    for (const state of ["none", "checking", "unavailable", null, undefined] as const) {
      assert.equal(vpnProxyModalCopyFor(state), null, String(state))
      assert.equal(detectionOf(state), null, String(state))
    }
  })
})

describe("Reload never swaps the copy on screen for another variant", () => {
  for (const [name, first, copy] of [
    ["VPN-only", "vpn_detected", VPN],
    ["proxy-only", "proxy_detected", PROXY],
    ["combined", "vpn_and_proxy_detected", BOTH],
  ] as const) {
    it(`${name}: while the Reload is pending the same copy stays up, and after the same answer too`, async () => {
      let answer: Promise<VpnProxyDetectionOutcome> = Promise.resolve(first)
      const host = makeHost(() => answer)
      await host.verify()
      host.s.copies.length = 0 // only what the user sees from the Reload on
      const d = deferred<VpnProxyDetectionOutcome>()
      answer = d.promise
      const pending = host.verify()
      await tick()
      assert.equal(host.s.state, "checking")
      assert.equal(vpnProxyModalCopyFor(host.s.detection)?.title, copy.title)
      d.resolve(first)
      await pending
      assert.ok(host.s.copies.every((t) => t === copy.title), host.s.copies.join(","))
    })
  }

  it("a different answer replaces the copy only when it arrives", async () => {
    let answer: Promise<VpnProxyDetectionOutcome> = Promise.resolve("vpn_detected")
    const host = makeHost(() => answer)
    await host.verify()
    host.s.copies.length = 0
    const d = deferred<VpnProxyDetectionOutcome>()
    answer = d.promise
    const pending = host.verify()
    await tick()
    assert.equal(vpnProxyModalCopyFor(host.s.detection)?.title, VPN.title)
    d.resolve("proxy_detected")
    await pending
    assert.equal(vpnProxyModalCopyFor(host.s.detection)?.title, PROXY.title)
    assert.deepEqual(host.s.copies, ["VPN Detected", "Proxy Detected"])
  })

  it("a Reload that ends clean or unavailable leaves the last detection copy for the close animation", async () => {
    for (const next of ["none", "unavailable"] as const) {
      let answer: Promise<VpnProxyDetectionOutcome> = Promise.resolve("vpn_detected")
      const host = makeHost(() => answer)
      await host.verify()
      host.s.copies.length = 0
      answer = Promise.resolve(next)
      await host.verify()
      assert.equal(vpnProxyModalCopyFor(host.s.detection)?.title, VPN.title, next)
      assert.ok(!host.s.copies.includes(BOTH.title), `${next}: ${host.s.copies.join(",")}`)
    }
  })
})

describe("one connection check at a time", () => {
  it("rapid Reload / Retry presses send one request and share its answer", async () => {
    let calls = 0
    const d = deferred<VpnProxyDetectionOutcome>()
    const host = makeHost(() => {
      calls += 1
      return d.promise
    })
    const runs = [host.verify(), host.verify(), host.verify(), host.verify()]
    await tick()
    assert.equal(calls, 1)
    d.resolve("vpn_detected")
    await Promise.all(runs)
    assert.equal(calls, 1)
    assert.equal(host.s.detection, "vpn_detected")
  })

  it("the next press after the answer starts a new check", async () => {
    let calls = 0
    const host = makeHost(async () => (calls++, "vpn_detected" as const))
    await host.verify()
    await host.verify()
    assert.equal(calls, 2)
  })
})

describe("the latest valid check wins", () => {
  it("an older answer that arrives after a newer check was applied is dropped", async () => {
    const slow = deferred<VpnProxyDetectionOutcome>()
    const fast = deferred<VpnProxyDetectionOutcome>()
    const queue = [slow.promise, fast.promise]
    const host = makeHost(() => queue.shift()!)
    const first = host.verify()
    await tick()
    host.dismiss() // invalidates the first check and frees the next
    const second = host.verify()
    await tick()
    fast.resolve("proxy_detected")
    await second
    slow.resolve("vpn_detected") // out of order: the older check answers last
    await first
    assert.equal(host.s.detection, "proxy_detected")
    assert.deepEqual(host.s.copies.filter(Boolean), ["Proxy Detected"])
  })
})

describe("a context change drops the late answer, whatever it is", () => {
  for (const answer of ["none", "unavailable", "vpn_detected", "proxy_detected", "vpn_and_proxy_detected"] as const) {
    it(`late "${answer}": nothing is opened, started or retried`, async () => {
      const d = deferred<VpnProxyDetectionOutcome>()
      let calls = 0
      const host = makeHost(() => (calls++, d.promise))
      const pending = host.verify()
      await tick()
      host.session.invalidate() // route / account / role / logout / dismissal / unmount
      d.resolve(answer)
      await pending
      assert.equal(host.s.modalOpen, false)
      assert.equal(host.s.gateOpen, false)
      assert.equal(host.s.cleanRuns, 0, "verification continuation must not run")
      assert.equal(host.s.didit, 0, "Didit must not start")
      assert.equal(host.s.detection, null)
      assert.equal(calls, 1, "no automatic retry")
    })
  }

  it("a dismissed modal stays dismissed when the Reload it started answers late", async () => {
    let answer: Promise<VpnProxyDetectionOutcome> = Promise.resolve("vpn_detected")
    const host = makeHost(() => answer)
    await host.verify()
    const d = deferred<VpnProxyDetectionOutcome>()
    answer = d.promise
    const pending = host.verify()
    await tick()
    host.dismiss() // Dismiss, Escape or an outside click
    d.resolve("vpn_detected")
    await pending
    assert.equal(host.s.modalOpen, false)
    assert.equal(host.s.state, "idle")
  })

  it("a new check can start right after an invalidation, and its answer is applied", async () => {
    const host = makeHost(async () => "proxy_detected" as const)
    host.session.invalidate()
    await host.verify()
    assert.equal(host.s.detection, "proxy_detected")
  })
})

describe("the unavailable Retry keeps the unavailable presentation until the answer", () => {
  it("the gate is told 'unavailable' while a Retry from the error is checking", () => {
    assert.equal(gateConnectionStateFor("checking", true), "unavailable")
    assert.equal(gateConnectionStateFor("unavailable", true), "unavailable")
    assert.equal(gateConnectionStateFor("checking", false), "checking")
    assert.equal(gateConnectionStateFor("idle", false), "idle")
    assert.equal(gateConnectionStateFor("unavailable", false), "unavailable")
  })

  it("Retry from the error: unavailable all the way through, replaced only by the final answer", async () => {
    let answer: Promise<VpnProxyDetectionOutcome> = Promise.resolve("unavailable")
    const host = makeHost(() => answer)
    await host.verify()
    assert.equal(host.s.state, "unavailable")
    const d = deferred<VpnProxyDetectionOutcome>()
    answer = d.promise
    const pending = host.verify()
    await tick()
    assert.equal(host.s.state, "checking")
    assert.equal(gateConnectionStateFor(host.s.state, host.s.retrying), "unavailable")
    const more = host.verify() // a second Retry press while it runs
    d.resolve("unavailable")
    await Promise.all([pending, more])
    assert.equal(gateConnectionStateFor(host.s.state, host.s.retrying), "unavailable")
  })

  it("a failed check is never retried by itself", async () => {
    let calls = 0
    const host = makeHost(async () => (calls++, "unavailable" as const))
    await host.verify()
    await tick()
    await tick()
    assert.equal(calls, 1)
    assert.equal(host.s.cleanRuns, 0)
  })
})

describe("the shared checking presentation is used only where nothing shows the check", () => {
  it("opens for a page-level gate that closed; not over the detection modal, an open gate, or a page with its own state", () => {
    assert.equal(shouldShowCheckingGate({ detectionModalOpen: false, gateOpen: false, pageShowsOwnChecking: false }), true)
    assert.equal(shouldShowCheckingGate({ detectionModalOpen: true, gateOpen: false, pageShowsOwnChecking: false }), false)
    assert.equal(shouldShowCheckingGate({ detectionModalOpen: false, gateOpen: true, pageShowsOwnChecking: false }), false)
    assert.equal(shouldShowCheckingGate({ detectionModalOpen: false, gateOpen: false, pageShowsOwnChecking: true }), false)
  })
})

describe("every context change that must drop a late answer changes the host's reset key", () => {
  const base = { pathname: "/earnings", userId: "u1", role: "talent" }
  const key = identityHostResetKey(base)
  it("route, account, role and logout each produce a different key (the host invalidates on it)", () => {
    assert.notEqual(identityHostResetKey({ ...base, pathname: "/my-contracts" }), key)
    assert.notEqual(identityHostResetKey({ ...base, userId: "u2" }), key)
    assert.notEqual(identityHostResetKey({ ...base, role: "client" }), key)
    assert.notEqual(identityHostResetKey({ ...base, userId: null, role: null }), key)
  })
})

describe("how the host is wired (source)", () => {
  const host = read("contexts", "identity-verification-host.tsx")
  const handler = host.slice(
    host.indexOf("const handleVerifyMyAccount = useCallback("),
    host.indexOf("}, [runIdentityVerificationCheck])")
  )

  it("the copy comes only from the last final detection; no default copy is left in the host", () => {
    assert.ok(host.includes("vpnProxyModalCopyFor(vpnProxyDetection)"))
    assert.ok(host.includes("{vpnProxyModalCopy && ("))
    assert.ok(!host.includes("vpnProxyResult"))
    assert.ok(!host.includes("VPN & Proxy Detected"))
    // the only writer: a final detection, never "checking", "none" or "unavailable"
    assert.equal(host.split("setVpnProxyDetection(").length - 1, 1)
    assert.ok(handler.includes("const detection = detectionOf(outcome)\n    if (detection) setVpnProxyDetection(detection)"))
  })

  it("Reload is disabled while a check runs", () => {
    assert.ok(host.includes('disabled={connectionCheckState === "checking"}\n              onClick={() => void handleVerifyMyAccount()}'))
  })

  it("the handler runs through the session, and the answer is checked for currency before anything uses it", () => {
    assert.ok(handler.includes("await checkSessionRef.current.run(async (isCurrent) =>"))
    assert.ok(handler.includes("const outcome = await checkVpnProxy()\n    if (!isCurrent()) return\n"))
    // nothing is applied between the await and the check: the first use of the outcome comes after it
    assert.ok(handler.indexOf("if (!isCurrent()) return") < handler.indexOf("detectionOf(outcome)"))
    assert.ok(handler.indexOf("if (!isCurrent()) return") < handler.indexOf('if (outcome === "none")'))
  })

  it("every later await in the clean path is followed by a currency check", () => {
    for (const call of [
      "await fetchIdentityVerificationSummary()",
      "await startIdentityOnlyForDashboard()",
      "await getDetectedLocation(",
    ]) {
      const at = handler.indexOf(call)
      assert.ok(at > 0, call)
      assert.ok(/if \(!isCurrent\(\)\) return/.test(handler.slice(at, at + 260)), `no currency check after ${call}`)
    }
  })

  it("a stale answer cannot start Didit, open the location flow or open a modal: those come after the checks", () => {
    const lastCheck = handler.lastIndexOf("if (!isCurrent()) return")
    assert.ok(handler.indexOf("await startIdentityOnlyForDashboard()") > handler.indexOf("const summary = await fetchIdentityVerificationSummary()\n      if (!isCurrent()) return"))
    assert.ok(handler.indexOf("setIdentityFlowOpen(true)") > lastCheck)
    assert.ok(handler.indexOf("setVpnProxyModalOpen(true)") > handler.indexOf("if (!isCurrent()) return"))
  })

  it("the check is invalidated on a reset (route/account/role), on unmount, and on every dismissal", () => {
    const at = host.indexOf("useLayoutEffect(() => {\n    if (resetKeyRef.current === resetKey) return")
    const reset = host.slice(at, host.indexOf("}, [resetKey])", at))
    assert.ok(reset.includes("checkSessionRef.current.invalidate()"))
    assert.ok(host.includes("useEffect(() => () => checkSessionRef.current.invalidate(), [])"))
    const dismiss = host.slice(host.indexOf("const dismissConnectionCheck = useCallback("))
    assert.ok(dismiss.slice(0, 260).includes("checkSessionRef.current.invalidate()"))
    // the modal's Dismiss, its Escape / outside click, and the connection-error Dismiss
    assert.equal(host.split("dismissConnectionCheck()").length - 1, 2)
    assert.ok(host.includes("onDismissConnectionError={dismissConnectionCheck}"))
  })

  it("the gate is told the presentation helper's state, and nothing re-runs the check by itself", () => {
    assert.ok(host.includes("connectionCheckState={gateConnectionStateFor("))
    assert.ok(!/setTimeout|setInterval/.test(handler))
    assert.equal(host.split("await checkVpnProxy()").length - 1, 1)
  })

  it("the shared checking gate is closed again when the answer is clean, and never opened over the modal", () => {
    assert.ok(handler.includes("if (showChecking) setVerificationGateOpen(false)"))
    assert.ok(handler.includes("pageShowsOwnChecking: pageReadsSummaryRef.current"))
    assert.ok(handler.includes("detectionModalOpen: vpnProxyModalOpenRef.current"))
  })

  it("existing entry points still call the shared host's startVerification", () => {
    assert.ok(host.includes("const startVerification = useCallback(() => {\n    void loadIdentityVerificationFlow()\n    return handleVerifyMyAccount()"))
    for (const file of [
      ["app", "(group)", "earnings", "page.tsx"],
      ["app", "(group)", "time-tracking", "page.tsx"],
      ["app", "transfer-funds", "page.tsx"],
      ["app", "verify-withdrawal", "page.tsx"],
      ["components", "withdraw-funds-dialog.tsx"],
      ["utils", "CreateListingGateHost.tsx"],
      ["utils", "useApplyGate.tsx"],
    ]) {
      assert.ok(read(...file).includes("startVerification"), file.join("/"))
    }
  })

  it("the existing detection variants and the failure policy are untouched", () => {
    const api = read("src", "lib", "api", "vpn-proxy-detection.ts")
    for (const v of ["vpn_detected", "proxy_detected", "vpn_and_proxy_detected", "unavailable", "none"]) {
      assert.ok(api.includes(`"${v}"`), v)
    }
    assert.ok(api.includes('return "unavailable"'))
  })

  it("the retry gate's own double-click guard is still there", () => {
    assert.ok(host.includes("if (retryVerifyRunningRef.current) return"))
  })
})
