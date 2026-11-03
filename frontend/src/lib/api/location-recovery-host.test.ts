// Run like detected-location.test.ts (from the frontend/ directory).
// BTB-387: how the host wires the "Turn on location to continue" dialog.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { readIdentityHost } from "./dashboard-host-source"

const host = readIdentityHost()
const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const flow = read("components", "identity-verification-flow.tsx")
const code = host.replace(/\/\/.*$/gm, "")

const dialogSource = () => {
  const at = host.indexOf("open={locationRecoveryState.open}")
  return host.slice(
    host.lastIndexOf("<Dialog", at),
    host.indexOf("</Dialog>", at)
  )
}

describe("the consent / IP-fallback design is gone", () => {
  it("no trace of the approximate-location consent remains in the host or the detection code", () => {
    for (const source of [
      host,
      read("src", "lib", "api", "detected-location.ts"),
      read("src", "lib", "api", "browser-geolocation.ts"),
    ]) {
      const text = source.replace(/\/\/.*$/gm, "")
      assert.ok(
        !/requestApproximateConsent|cancelApproximateConsent|watchGeolocationGranted|consentDenied|withoutConsentDenied|LocationConsent|location-consent|onGeolocationGranted|Allow approximate/.test(
          text
        )
      )
    }
  })

  it("the protected flow no longer knows about a consent denial", () => {
    assert.ok(!flow.includes("consentDenied"))
    // its two buttons are exactly dev-main's: only the mismatch and the free-KYC start disable Yes
    assert.ok(
      /startingFreeKyc \|\|\s*detectedLocation\.locationMismatch === true/.test(
        flow
      )
    )
  })

  it("a refusal never reaches the IP lookup: the browser path has no fetchServerLocation call", () => {
    const source = read("src", "lib", "api", "detected-location.ts")
    const browserPath = source.slice(
      source.indexOf("if (options.useBrowserLocation) {"),
      source.indexOf("let data: unknown")
    )
    assert.ok(!browserPath.includes("fetchServerLocation"))
    assert.ok(!browserPath.includes("options.fetchLocation"))
  })
})

describe("the dialog", () => {
  it("is titled 'Turn on location to continue', explains the browser permission, and has Cancel, Try Again and Show me how", () => {
    const d = dialogSource()
    assert.ok(d.includes("Turn on location to continue"))
    assert.ok(
      host.includes(
        "Location permission must be turned on in your browser before"
      )
    )
    assert.ok(host.includes("verification can continue."))
    assert.ok(d.includes("Show me how"))
    assert.ok(d.includes('"Cancel"'))
    assert.ok(d.includes("Try Again"))
  })

  it("the instructions are a view of the SAME dialog, with a Back action: one Dialog, no second modal", () => {
    const d = dialogSource()
    assert.ok(d.includes('locationRecoveryState.view === "main"'))
    assert.ok(d.includes("<LocationHowTo />"))
    assert.ok(d.includes("locationRecovery.back()"))
    assert.ok(d.includes('"Back"'))
    assert.ok(d.includes("locationRecovery.showHowTo()"))
    const howTo = host.slice(
      host.indexOf("function LocationHowTo()"),
      host.indexOf("export function IdentityVerificationHostProvider")
    )
    assert.ok(
      !/<Dialog[ >]/.test(howTo),
      "the instructions view is not its own modal"
    )
    assert.equal(host.split("open={locationRecoveryState.open}").length - 1, 1)
  })

  it("Try Again asks the device again; Cancel, Escape and an outside click give up", () => {
    const d = dialogSource()
    assert.ok(d.includes("void locationRecovery.tryAgain()"))
    assert.match(
      d,
      /onOpenChange=\{\(open\) => \{\s*if \(!open\) locationRecovery\.cancel\(\)/
    )
    assert.ok(d.includes("locationRecovery.cancel()"))
  })

  it("the minimum spinner time is scoped to the new recovery action only", () => {
    // It lives in the recovery controller and nowhere on the location path itself.
    const read = (f: string) =>
      readFileSync(join(process.cwd(), "src", "lib", "api", f), "utf8")
    assert.ok(!read("detected-location.ts").includes("minBusy"))
    assert.ok(!read("browser-geolocation.ts").includes("minBusy"))
    // the host passes it only to createLocationRecovery, and the shared wrapper has no timer
    assert.equal(host.split("minBusyMs").length - 1, 1)
    const at = host.indexOf("const getDetectedLocation = useCallback(")
    const wrapper = host.slice(at, host.indexOf("[]\n  )", at))
    assert.ok(!/setTimeout|minBusy/.test(wrapper))
  })

  it("the busy spinner lasts long enough to be seen (the controller is given a minimum)", () => {
    const at = host.indexOf("const [locationRecovery] = useState(")
    const creation = host.slice(
      at,
      host.indexOf("const openLocationRecovery", at)
    )
    assert.match(creation, /minBusyMs: \d{3,4},/)
  })

  it("Try Again shows loading while a request is in flight (the shared Button's own loading state)", () => {
    const d = dialogSource()
    assert.ok(d.includes("loading={locationRecoveryState.busy}"))
    assert.ok(d.includes("aria-busy={locationRecoveryState.busy}"))
  })

  it("reuses the approved warning dialog: 531px responsive, warning icon, shared buttons, equal 133px, focus rings", () => {
    const d = dialogSource()
    assert.ok(d.includes("w-[calc(100%-32px)] max-w-[531px]"))
    assert.ok(d.includes("bg-warning-100 border-[8px] border-warning-50"))
    assert.ok(d.includes("<AlertTriangle"))
    assert.equal(d.split("w-[133px]").length - 1, 2)
    assert.equal(
      d.split("focus-visible:ring-4 focus-visible:ring-primary-100").length - 1,
      3 // the link, Cancel/Back and Try Again
    )
    assert.ok(d.includes('variant="outlined"'))
    assert.ok(d.includes('variant="link"'))
    assert.ok(!d.includes("RefreshCw"))
  })

  it("initial focus is on Try Again, not on the page behind", () => {
    const d = dialogSource()
    assert.ok(d.includes("ref={tryAgainButtonRef}"))
    assert.match(
      d,
      /onOpenAutoFocus=\{\(event\) => \{\s*event\.preventDefault\(\)\s*tryAgainButtonRef\.current\?\.focus\(\)/
    )
  })

  it("keeps focus inside the dialog when its view changes or a retry ends", () => {
    const at = host.indexOf("const tryAgainButtonRef = useRef")
    const effect = host.slice(
      at,
      host.indexOf("const cancelLocationDetection", at)
    )
    assert.ok(effect.includes("tryAgainButtonRef.current?.focus()"))
    assert.ok(effect.includes("locationRecoveryState.view"))
    assert.ok(effect.includes("locationRecoveryState.busy"))
  })

  it("is mounted after the verification flow so, for relocation, it stacks above it", () => {
    assert.ok(
      host.indexOf("<IdentityVerificationFlow") <
        host.indexOf("open={locationRecoveryState.open}")
    )
  })

  it("never calls the browser's geolocation itself", () => {
    assert.ok(
      !/navigator\.geolocation|getBrowserPosition|getCurrentPosition/.test(code)
    )
  })

  it("has a short sentence for each way the location can fail", () => {
    const map = host.slice(
      host.indexOf("const LOCATION_FAILURE_COPY"),
      host.indexOf("function LocationHowTo()")
    )
    for (const reason of [
      "blocked",
      "dismissed",
      "unsupported",
      "device_unavailable",
      "timeout",
      "resolve_failed",
    ]) {
      assert.ok(map.includes(`${reason}:`), reason)
    }
  })
})

describe("the instructions view: browser steps first, then two expandable device rows", () => {
  const howTo = () =>
    host.slice(
      host.indexOf("function LocationHowTo()"),
      host.indexOf("export function IdentityVerificationHostProvider")
    )

  it("shows the browser steps first and the device rows after them", () => {
    const h = howTo()
    assert.ok(h.indexOf("instructions.browserSteps.map") > -1)
    assert.ok(
      h.indexOf("instructions.browserSteps.map") <
        h.indexOf("instructions.deviceSections.map")
    )
  })

  it("has no visible 'Steps for <browser>' line under the title (kept only as a screen-reader description)", () => {
    const h = howTo()
    const at = h.indexOf("Steps for")
    assert.ok(at > -1)
    const tag = h.slice(h.lastIndexOf("<DialogDescription", at), at)
    assert.ok(tag.includes('className="sr-only"'))
    assert.equal(h.split("Steps for").length - 1, 1)
  })

  it("each row is a real button with aria-expanded and aria-controls pointing at its steps", () => {
    const h = howTo()
    assert.ok(h.includes("aria-expanded={expanded}"))
    assert.ok(h.includes("aria-controls={panelId}"))
    assert.ok(h.includes("aria-describedby={headingId}"))
    assert.ok(h.includes("id={panelId}"))
    assert.ok(h.includes("hidden={!expanded}"))
    assert.ok(h.includes("Show me how"))
    assert.ok(h.includes("<Button"))
    assert.ok(!/<button/.test(h), "no raw <button>")
  })

  it("only one section is open at a time, and the open one can be pressed again to collapse", () => {
    const h = howTo()
    assert.ok(h.includes("useState<DeviceSectionId | null>(null)"))
    assert.ok(h.includes("nextOpenDeviceSection(current, section.id)"))
  })

  it("both operating systems are always rendered: nothing is detected or hidden", () => {
    const h = howTo()
    assert.ok(h.includes("instructions.deviceSections.map"))
    assert.ok(!/detectPlatform|platform|navigator|userAgent/.test(h))
  })

  it("stays inside the same dialog (no second modal) and leaves Back and Try Again alone", () => {
    const h = howTo()
    assert.ok(!/<Dialog[ >]/.test(h))
    const d = dialogSource()
    assert.ok(d.includes("<LocationHowTo />"))
    assert.ok(
      d.includes(
        'locationRecoveryState.view === "main"\n                  ? locationRecovery.cancel()\n                  : locationRecovery.back()'
      ) || d.includes("locationRecovery.back()")
    )
    assert.ok(d.includes("void locationRecovery.tryAgain()"))
  })
})

describe("Verify My Account (initial verification)", () => {
  const handler = () =>
    host.slice(
      host.indexOf("const handleVerifyMyAccount = useCallback("),
      host.indexOf("}, [runIdentityVerificationCheck])")
    )

  it("keeps the flow closed and opens the dialog when the device location failed", () => {
    const h = handler()
    const failure = h.indexOf("if (location.locationFailure)")
    assert.ok(failure > -1)
    assert.ok(failure < h.indexOf("setIdentityFlowOpen(true)"))
    assert.ok(
      h
        .slice(failure, h.indexOf("setIdentityFlowOpen(true)"))
        .includes("return")
    )
    assert.ok(
      h
        .slice(failure)
        .startsWith(
          "if (location.locationFailure) {\n        openLocationRecovery("
        )
    )
  })

  it("a successful Try Again opens the flow through openFlow, with the same Travel Mode awareness", () => {
    const h = handler()
    assert.ok(h.includes("openFlow("))
    assert.ok(
      h.includes(
        "isTravelModeInForce(summary) ? { activeTravelModeUpdate: true } : {}"
      )
    )
    assert.ok(h.includes("{ detectedLocation: resolved }"))
  })

  it("a result for an abandoned attempt is dropped before anything opens", () => {
    const h = handler()
    const call = h.indexOf(
      "await getDetectedLocation({ useBrowserLocation: true })"
    )
    assert.ok(
      h
        .slice(call, h.indexOf("if (location.locationFailure)"))
        .includes("if (!isCurrent()) return")
    )
    assert.ok(h.slice(call).includes("if (location.cancelled) return"))
  })
})

describe("Permanently relocated", () => {
  const callback = () =>
    host.slice(
      host.indexOf("const refreshLocationForRelocation = useCallback("),
      host.indexOf("// The flow opened or closed.")
    )

  it("asks the browser, and on a failure opens the same dialog and waits for it", () => {
    const c = callback()
    assert.ok(
      c.includes("await getDetectedLocation({ useBrowserLocation: true })")
    )
    assert.ok(c.includes("openLocationRecovery(location.locationFailure!"))
    assert.ok(c.includes("new Promise<void>"))
  })

  it("the flow continues only after a successful Try Again (the promise resolves with the new location set)", () => {
    const c = callback()
    const success = c.slice(c.indexOf("onSuccess:"), c.indexOf("onDismiss:"))
    assert.ok(success.includes("setDetectedLocation(resolved)"))
    assert.ok(success.includes("resolve()"))
  })

  it("Cancel returns to the same screen with a fresh flow instance before the flow is told to continue", () => {
    const c = callback()
    const dismiss = c.slice(c.indexOf("onDismiss:"))
    assert.ok(dismiss.includes('kind === "cancel"'))
    assert.ok(
      dismiss.includes(
        "flushSync(() => setFlowLaunch((prev) => ({ ...prev, key: prev.key + 1 })))"
      )
    )
    assert.ok(dismiss.indexOf("flushSync") < dismiss.indexOf("resolve()"))
  })
})

describe("Travel Mode Update is unchanged (IP-only, out of scope)", () => {
  it("its detection never passes the browser option and never opens the dialog", () => {
    const live = host.slice(
      host.indexOf("const handleLiveTravelUpdate = useCallback("),
      host.indexOf("}, [openFlow])")
    )
    assert.ok(live.includes("await getDetectedLocation()"))
    assert.ok(!live.includes("useBrowserLocation"))
    assert.ok(!live.includes("openLocationRecovery"))
  })

  it("the wrapper passes a call that does not ask the browser straight through", () => {
    const at = host.indexOf("const getDetectedLocation = useCallback(")
    const wrapper = host.slice(at, host.indexOf("[]\n  )", at))
    assert.ok(
      wrapper.includes(
        "if (!options.useBrowserLocation) return detectLocation(options)"
      )
    )
  })
})

describe("cancellation", () => {
  it("a route, account or role change and an unmount abort the request and close the dialog", () => {
    const at = host.indexOf(
      "useLayoutEffect(() => {\n    if (resetKeyRef.current === resetKey) return"
    )
    const reset = host.slice(at, host.indexOf("}, [resetKey])", at))
    assert.ok(reset.includes("cancelLocationDetection()"))
    assert.ok(
      host.includes(
        "useEffect(() => cancelLocationDetection, [cancelLocationDetection])"
      )
    )
    const cancel = host.slice(
      host.indexOf("const cancelLocationDetection = useCallback(")
    )
    const body = cancel.slice(0, cancel.indexOf("[locationRecovery]"))
    assert.ok(body.includes("locationAttemptRef.current += 1"))
    assert.ok(body.includes("locationRecovery.abort()"))
    assert.ok(
      body.includes(
        "locationAbortsRef.current.forEach((controller) => controller.abort())"
      )
    )
  })

  it("the dialog's own retries inherit the attempt guard and the abort signal", () => {
    const at = host.indexOf("const getDetectedLocation = useCallback(")
    const wrapper = host.slice(at, host.indexOf("[]\n  )", at))
    assert.ok(wrapper.includes("attempt === locationAttemptRef.current"))
    assert.ok(wrapper.includes("options.isCurrent?.() ?? true"))
    assert.ok(wrapper.includes('options.signal?.addEventListener("abort"'))
  })
})
