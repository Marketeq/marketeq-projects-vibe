// Run like detected-location.test.ts (from the frontend/ directory):
//   npx tsc src/lib/api/location-consent.test.ts --outDir <tmp> --module commonjs
//   --target es2020 --skipLibCheck --esModuleInterop --types node --lib es2020,dom
//   && node --test <tmp>/src/lib/api/location-consent.test.js
//
// BTB-387: the "Location Access Needed" consent that precedes the network (IP) location
// lookup when the browser could not give a position.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { readIdentityHost } from "./dashboard-host-source"
import { getDetectedLocation } from "./detected-location"
import { identityHostResetKey } from "./identity-host-routes"
import { createLocationConsentGate } from "./location-consent"

const host = readIdentityHost()
const flushMicrotasks = () => new Promise<void>((r) => setImmediate(r))

const SERVER_BODY = {
  countryCode: "US",
  countryName: "United States",
  city: "Chicago",
  regionCode: "IL",
  regionName: "Illinois",
  latitude: 41.88,
  longitude: -87.63,
}

describe("the consent gate", () => {
  it("opens once: every request while one is pending shares it", async () => {
    const opened: boolean[] = []
    const gate = createLocationConsentGate((p) => opened.push(p))
    const a = gate.request()
    const b = gate.request()
    assert.equal(a, b)
    assert.deepEqual(opened, [true])
    gate.decide("allow")
    assert.equal(await a, "allow")
    assert.deepEqual(opened, [true, false])
  })

  it("only the first answer counts: duplicate clicks and a click racing a dismissal", async () => {
    const gate = createLocationConsentGate()
    const pending = gate.request()
    gate.decide("allow")
    gate.decide("allow")
    gate.decide("deny")
    gate.cancel()
    assert.equal(await pending, "allow")
  })

  it("an answer with nothing pending is ignored and does not pre-answer the next question", async () => {
    const gate = createLocationConsentGate()
    gate.decide("allow")
    gate.cancel()
    const next = gate.request()
    assert.equal(gate.pending, true)
    gate.decide("deny")
    assert.equal(await next, "deny")
  })

  it("cancel resolves the pending question as cancelled and closes it", async () => {
    const opened: boolean[] = []
    const gate = createLocationConsentGate((p) => opened.push(p))
    const pending = gate.request()
    gate.cancel()
    assert.equal(await pending, "cancelled")
    assert.equal(gate.pending, false)
    assert.deepEqual(opened, [true, false])
  })

  it("a new question after an answer is a new question (the answer is not remembered)", async () => {
    const gate = createLocationConsentGate()
    const first = gate.request()
    gate.decide("allow")
    await first
    const second = gate.request()
    assert.notEqual(first, second)
    assert.equal(gate.pending, true)
  })
})

// The host's wiring, modelled with the real gate and the real detector. `attempt` stands for
// the host's locationAttemptRef, which the reset (route/account/role change) and the unmount
// bump together with gate.cancel().
function makeHost() {
  const gate = createLocationConsentGate()
  let attempt = 0
  let lookups = 0
  let shown = 0
  const detect = () => {
    const mine = attempt
    return getDetectedLocation({
      useBrowserLocation: true,
      getPosition: async () => ({ status: "denied" }),
      fetchLocation: async () => {
        lookups += 1
        return SERVER_BODY
      },
      requestApproximateConsent: gate.request,
      isCurrent: () => mine === attempt,
    }).then((location) => {
      if (!location.cancelled) shown += 1
      return location
    })
  }
  const reset = () => {
    attempt += 1
    gate.cancel()
  }
  return { gate, detect, reset, counts: () => ({ lookups, shown }) }
}

describe("one detection attempt, end to end", () => {
  it("custom Allow: exactly one lookup, and the result is shown", async () => {
    const h = makeHost()
    const p = h.detect()
    await flushMicrotasks()
    assert.equal(h.gate.pending, true)
    h.gate.decide("allow")
    h.gate.decide("allow") // double click
    const location = await p
    assert.equal(location.city, "Chicago")
    assert.deepEqual(h.counts(), { lookups: 1, shown: 1 })
  })

  it("custom Deny (and Escape / outside click / X, which all call it): no lookup, nothing IP-derived", async () => {
    const h = makeHost()
    const p = h.detect()
    await flushMicrotasks()
    h.gate.decide("deny")
    const location = await p
    assert.equal(location.city, "")
    assert.equal(location.countryCode, "")
    assert.equal(location.latitude, null)
    assert.equal(location.detected, false)
    assert.equal(location.consentDenied, true)
    assert.deepEqual(h.counts(), { lookups: 0, shown: 1 })
  })

  for (const cause of ["navigation", "logout", "account switch", "unmount"]) {
    it(`${cause} while the question is open: nothing is looked up or shown, and Allow afterwards does nothing`, async () => {
      const h = makeHost()
      const p = h.detect()
      await flushMicrotasks()
      h.reset()
      const location = await p
      assert.equal(location.cancelled, true)
      assert.ok(!location.consentDenied) // a stale result never carries (or re-applies) a denial
      h.gate.decide("allow")
      await flushMicrotasks()
      assert.deepEqual(h.counts(), { lookups: 0, shown: 0 })
    })
  }

  it("a late answer from an old attempt cannot answer the next attempt's question", async () => {
    const h = makeHost()
    const old = h.detect()
    await flushMicrotasks()
    h.reset()
    const next = h.detect()
    await flushMicrotasks()
    assert.equal((await old).cancelled, true)
    assert.equal(h.gate.pending, true)
    h.gate.decide("deny")
    assert.equal((await next).detected, false)
    assert.deepEqual(h.counts(), { lookups: 0, shown: 1 })
  })

  it("an account switch or navigation changes the host's reset key", () => {
    const base = { pathname: "/talent-dashboard", userId: "a", role: "talent" }
    const key = identityHostResetKey(base)
    assert.notEqual(key, identityHostResetKey({ ...base, userId: "b" }))
    assert.notEqual(key, identityHostResetKey({ ...base, userId: undefined })) // logout
    assert.notEqual(
      key,
      identityHostResetKey({ ...base, pathname: "/settings" })
    )
  })
})

describe("the host's wiring (source guards)", () => {
  it("asks the exact approved copy, with Deny and Allow", () => {
    assert.ok(host.includes("Location Access Needed"))
    assert.ok(
      host.includes(
        "We couldn’t access your device location. Allow Marketeq to estimate your"
      )
    )
    assert.ok(
      host.includes("approximate location using your network connection.")
    )
    assert.match(host, /answerLocationConsent\("deny"\)\}\s*>\s*Deny/)
    assert.match(host, /answerLocationConsent\("allow"\)\}\s*>\s*Allow/)
  })

  it("closing the dialog any other way (Escape, outside click, X) is Deny", () => {
    assert.match(
      host,
      /open=\{locationConsentOpen\}\s*onOpenChange=\{\(open\) => \{\s*if \(!open\) answerLocationConsent\("deny"\)/
    )
  })

  it("uses the Figma width responsively, the warning icon and the existing button styles, with no refresh icon", () => {
    const at = host.indexOf("open={locationConsentOpen}")
    const dialog = host.slice(at, host.indexOf("</Dialog>", at))
    assert.ok(dialog.includes("w-[calc(100%-32px)] max-w-[531px] pt-[50px]"))
    assert.ok(dialog.includes("bg-warning-100 border-[8px] border-warning-50"))
    assert.ok(dialog.includes("<AlertTriangle"))
    assert.ok(dialog.includes('variant="outlined"'))
    assert.ok(dialog.includes('visual="gray"'))
    // both buttons are exactly the same width (133px) and nothing else sizes them
    assert.equal(dialog.split("w-[133px]").length - 1, 2)
    assert.ok(!dialog.includes("w-[105px]"))
    // keyboard-only focus ring, applied locally (the shared Button is untouched), on both
    assert.equal(
      dialog.split("focus-visible:ring-4 focus-visible:ring-primary-100").length - 1,
      2
    )
    // initial focus is on Deny (the non-consenting choice), not on the page behind
    assert.ok(dialog.includes("ref={denyLocationButtonRef}"))
    assert.match(
      host,
      /onOpenAutoFocus=\{\(event\) => \{\s*event\.preventDefault\(\)\s*denyLocationButtonRef\.current\?\.focus\(\)/
    )
    assert.ok(dialog.includes("text-primary-500 bg-primary-50"))
    assert.ok(!dialog.includes("RefreshCw"))
  })

  it("is mounted after the verification flow so it stacks above it", () => {
    assert.ok(
      host.indexOf("<IdentityVerificationFlow") <
        host.indexOf("open={locationConsentOpen}")
    )
  })

  it("Allow never touches the browser's geolocation", () => {
    assert.ok(
      !/navigator\.geolocation|getBrowserPosition|getCurrentPosition/.test(host)
    )
  })

  it("only a call that asks the browser is wrapped; Travel Mode Update's server-only call is passed through", () => {
    const at = host.indexOf("const getDetectedLocation = useCallback(")
    const wrapper = host.slice(at, host.indexOf("[locationConsentGate]", at))
    assert.ok(
      wrapper.includes(
        "if (!options.useBrowserLocation) return detectLocation(options)"
      )
    )
    assert.ok(
      wrapper.includes("requestApproximateConsent: locationConsentGate.request")
    )
    assert.ok(
      wrapper.includes(
        "isCurrent: () => attempt === locationAttemptRef.current"
      )
    )
    assert.ok(host.includes("await getDetectedLocation()")) // Update stays IP-only, no option
  })

  it("a route, account or role change and an unmount cancel the pending question and attempt", () => {
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
    assert.ok(cancel.slice(0, 200).includes("locationAttemptRef.current += 1"))
    assert.ok(cancel.slice(0, 200).includes("locationConsentGate.cancel()"))
  })
})

describe("the screen after an explicit Deny (source guards)", () => {
  const flow = readFileSync(
    join(process.cwd(), "components", "identity-verification-flow.tsx"),
    "utf8"
  )
  const at = flow.indexOf("Is this your home country?")
  const screen = flow.slice(at, flow.indexOf("Your data is encrypted", at))

  it("both actions are disabled while the denial is set", () => {
    const no = screen.slice(
      screen.indexOf('onClick={() => send("NO")}') - 160,
      screen.indexOf("currently traveling")
    )
    assert.ok(no.includes("disabled={detectedLocation.consentDenied === true}"))
    const yes = screen.slice(
      screen.indexOf("Yes, this is my home country") - 420,
      screen.indexOf("Yes, this is my home country")
    )
    assert.ok(yes.includes("detectedLocation.consentDenied === true"))
    // the existing conditions are kept
    assert.ok(yes.includes("startingFreeKyc ||"))
    assert.ok(yes.includes("detectedLocation.locationMismatch === true"))
  })

  it("the actions themselves are unchanged (a disabled button cannot fire them)", () => {
    assert.ok(screen.includes('onClick={() => send("NO")}'))
    assert.ok(screen.includes("onClick={() => void handleHomeCountryYes()}"))
  })

  it("nothing else on that screen can start anything: closing is the only other control", () => {
    assert.equal((screen.match(/<Button/g) ?? []).length, 2)
    assert.equal((screen.match(/onClick=/g) ?? []).length, 2)
  })

  it("the host never reuses a denial for a restarted flow and clears it on reset", () => {
    const open = host.slice(host.indexOf("const openFlow = useCallback("))
    assert.ok(open.slice(0, 600).includes("withoutConsentDenied"))
    const at = host.indexOf(
      "useLayoutEffect(() => {\n    if (resetKeyRef.current === resetKey) return"
    )
    const reset = host.slice(at, host.indexOf("}, [resetKey])", at))
    assert.ok(reset.includes("setDetectedLocation(null)"))
  })
})
