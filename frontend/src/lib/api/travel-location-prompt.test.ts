// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import {
  shouldShowLocationMismatchPrompt,
  shouldShowTravelerLocationPrompt,
  startChangeHomeCountry,
  startStillTraveling,
} from "./location-mismatch"
import { parseIdentityVerificationSummary } from "./identity-verification-state"
import { SKIPPED_TRAVEL_DURATION_LABEL } from "./travel-mode-backend"
import {
  markTravelerPromptShown,
  shouldOfferTravelerPrompt,
  travelLocationPromptKey,
} from "./travel-location-prompt"
import type { DismissalStorage } from "./travel-expiry-popup"
import { readDashboardWithHost } from "./dashboard-host-source"

function memoryStorage(): DismissalStorage & { dump: () => Record<string, string> } {
  const map = new Map<string, string>()
  return {
    get length() { return map.size },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    dump: () => Object.fromEntries(map),
  }
}
// Opaque per-login keys, as GET /me returns them (never the session id itself).
const KEY_A = "a".repeat(64)
const KEY_B = "b".repeat(64)
const summaryFor = (loginSessionKey: string | null) =>
  parseIdentityVerificationSummary({
    nextAction: "none",
    status: "verified",
    travelModeLocationMismatch: true,
    ...(loginSessionKey ? { loginSessionKey } : {}),
  })
const offered = (loginSessionKey: string | null, storage: DismissalStorage) =>
  shouldOfferTravelerPrompt({ summary: summaryFor(loginSessionKey), storage })

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = readDashboardWithHost()
const flow = read("components", "identity-verification-flow.tsx")
const auth = read("contexts", "auth.tsx")
const dialogStart = page.indexOf("open={locationMismatchOpen || travelerPromptOpen}")
const dialog = page.slice(page.lastIndexOf("<Dialog", dialogStart), page.indexOf("</Dialog>", dialogStart))
const between = (source: string, from: string, to: string) =>
  source.slice(source.indexOf(from), source.indexOf(to, source.indexOf(from)))

describe("the dialog cannot be dismissed except by its two buttons", () => {
  it("outside click is prevented", () => {
    assert.match(dialog, /onInteractOutside=\{\(event\) => event\.preventDefault\(\)\}/)
  })
  it("Escape is prevented", () => {
    assert.match(dialog, /onEscapeKeyDown=\{\(event\) => event\.preventDefault\(\)\}/)
  })
  it("no X / close control and no onOpenChange that could close it", () => {
    assert.ok(!dialog.includes("onOpenChange"))
    assert.ok(!/DialogClose|IconButton|<X\b/.test(dialog))
  })
  it("offers exactly the two approved actions", () => {
    const text = [...dialog.matchAll(/>\s*([^<>{}]*[A-Za-z][^<>{}]*?)\s*</g)].map((m) => m[1].trim())
    assert.ok(text.includes("I’m still traveling"))
    assert.ok(text.includes("Change my home country"))
    assert.equal((dialog.match(/<Button\b/g) ?? []).length, 2)
  })
})

describe("opening the prompt marks nothing (refresh, navigation and a new login)", () => {
  it("the page's open effect never writes the marker", () => {
    const effect = page.slice(page.indexOf("shouldOfferTravelerPrompt({"), page.indexOf("setTravelerPromptOpen(true)") + 30)
    assert.ok(!effect.includes("markTravelerPromptShown"))
  })
  it("a refresh or navigation back (same login) before any completed path offers it again", () => {
    const storage = memoryStorage()
    assert.equal(offered(KEY_A, storage), true) // opened, nothing marked
    assert.deepEqual(storage.dump(), {})
    assert.equal(offered(KEY_A, storage), true) // refresh / navigate away and back
  })
  it("logout then a new login (new key) offers it again, with at most one marker", () => {
    const storage = memoryStorage()
    markTravelerPromptShown(KEY_A, storage)
    assert.equal(offered(KEY_B, storage), true)
    markTravelerPromptShown(KEY_B, storage)
    assert.deepEqual(Object.keys(storage.dump()), [travelLocationPromptKey(KEY_B)])
  })
  it("logout itself writes no travel marker and clears none", () => {
    assert.ok(!/travelLocationPromptShown|markTravelerPromptShown/.test(auth))
  })
  it("no key: offered, nothing persisted", () => {
    const storage = memoryStorage()
    markTravelerPromptShown(null, storage)
    assert.deepEqual(storage.dump(), {})
    assert.equal(offered(null, storage), true)
  })
})

describe("'I’m still traveling' on an active Travel Mode completes when its action has finished", () => {
  const handler = between(page, "const handleTravelerStillTraveling", "const handleChangeHomeCountry")
  it("marks the login and closes, after any claim has been dropped, and never asks for a duration", () => {
    assert.ok(handler.indexOf("recordTravelClassification(") < handler.indexOf("markTravelerPromptCompleted("))
    assert.ok(handler.indexOf("markTravelerPromptCompleted(") < handler.indexOf("setTravelerPromptOpen(false)"))
    assert.ok(!/recordTravelDuration|setIdentityFlowOpen|openFlowFromMismatch/.test(handler))
    // A failed request marks nothing and leaves the prompt open.
    assert.ok(handler.indexOf("catch (error)") > handler.indexOf("setTravelerPromptOpen(false)"))
  })
  it("a refresh after it does not reopen the prompt in the same login", () => {
    const storage = memoryStorage()
    markTravelerPromptShown(KEY_A, storage)
    assert.equal(offered(KEY_A, storage), false)
  })
  it("the marker is written only by this path, and keyed by the /me loginSessionKey (not a cookie)", () => {
    assert.equal((page.match(/markTravelerPromptShown\(/g) ?? []).length, 1)
    assert.ok(page.includes("markTravelerPromptShown(loginSessionKey, window.localStorage)"))
    assert.ok(!/document\.cookie|readSessionId/.test(page))
  })
  it("end to end: answered, then a refresh (same key) stays closed; a new login (new key) reopens", () => {
    const storage = memoryStorage()
    assert.equal(offered(KEY_A, storage), true)
    markTravelerPromptShown(KEY_A, storage) // "I’m still traveling"
    assert.equal(offered(KEY_A, storage), false) // refresh
    assert.equal(offered(KEY_B, storage), true) // genuine new login
    assert.equal(offered(null, storage), true) // no key: shown, and persists nothing
    assert.deepEqual(Object.keys(storage.dump()), [travelLocationPromptKey(KEY_A)])
  })
})

describe("'Change my home country' saves and marks nothing", () => {
  const handler = between(page, "const handleChangeHomeCountry", "// Skip, X, Escape or a click outside")
  it("only opens the flow: no marker, no classification request", () => {
    assert.ok(!/markTravelerPrompt|localStorage|recordTravel|IdentityVerificationAPI/.test(handler))
    assert.ok(handler.includes('if (launch) openFlowFromMismatch(launch, "change-country")'))
    assert.ok(handler.includes("requestDeviceLocation,"))
  })
  it("closing the detected-country confirmation therefore changes nothing and the prompt returns on refresh", () => {
    const storage = memoryStorage()
    assert.equal(offered(KEY_A, storage), true)
    assert.deepEqual(storage.dump(), {})
  })
  it("the lookup is the only thing it runs", async () => {
    const calls: string[] = []
    const launch = await startChangeHomeCountry({
      getDetectedLocation: async () => (calls.push("lookup"), { country: "CA" }) as never,
    })
    assert.deepEqual(calls, ["lookup"])
    assert.equal(launch!.initialState, undefined)
  })
})

describe("a failed action keeps the popup available and unmarked", () => {
  for (const [name, handlerName, next] of [
    ["'I’m still traveling' (no Travel Mode)", "const handleStillTraveling", "// \"I'm still traveling\" for an active traveler"],
    ["'Change my home country'", "const handleChangeHomeCountry", "const vpnProxyModalCopy"],
  ] as const) {
    it(`${name}: a throw is caught, logged, and neither closes the prompt nor marks it`, () => {
      const handler = between(page, handlerName, next)
      assert.match(handler, /catch \(error\) \{[\s\S]*console\.error\(/)
      assert.ok(!/markTravelerPrompt/.test(handler))
      assert.ok(handler.includes("finally {"))
      assert.ok(handler.includes("setLocationMismatchBusy(false)"))
    })
  }
  it("a failed lookup rejects and so never reaches openFlowFromMismatch", async () => {
    const failing = { getDetectedLocation: async () => { throw new Error("offline") } }
    await assert.rejects(startStillTraveling(failing))
    await assert.rejects(startChangeHomeCountry(failing))
  })
})

describe("the prompts stay quiet while the backend says a change is pending", () => {
  it("a pending claim arrives with locationMismatch / travelModeLocationMismatch false, so nothing is shown", () => {
    const pending = parseIdentityVerificationSummary({
      nextAction: "start_identity",
      status: "verified",
      pendingHomeCountry: "CA",
      locationMismatch: false,
    })
    assert.equal(shouldShowLocationMismatchPrompt(pending), false)
    assert.equal(shouldShowTravelerLocationPrompt(pending), false)
    const inReview = parseIdentityVerificationSummary({ nextAction: "await_review", status: "verified", locationMismatch: false })
    assert.equal(shouldShowLocationMismatchPrompt(inReview), false)
  })
})

describe("closing the duration screen saves nothing (close, refresh, navigation, logout, browser close)", () => {
  const screen = flow.slice(flow.indexOf('{state === "traveling-showcase"'), flow.indexOf("</Dialog>", flow.indexOf('{state === "traveling-showcase"')))
  it("the screen's X and Back write nothing", () => {
    const header = screen.slice(0, screen.indexOf("How long are you traveling?"))
    assert.ok(!/recordTravel|persistTravel|activateTravelMode|IdentityVerificationAPI/.test(header))
    // BTB-387: Back goes through goToLocationScreen, which asks for the device location first when
    // the flow was opened with the server-derived one (and is a plain send("BACK") otherwise).
    assert.ok(header.includes('goToLocationScreen("BACK")'))
  })
  it("nothing in the flow saves on unmount, unload or visibility change", () => {
    assert.ok(!/beforeunload|pagehide|visibilitychange|sendBeacon/.test(flow))
  })
  it("the only duration request is Confirm/Skip's, and no classification is saved at 'Temporarily traveling'", () => {
    assert.equal((flow.match(/recordTravelDuration\(deps,/g) ?? []).length, 1)
    assert.equal((flow.match(/persistTravelClassification\("temporarily_traveling"\)/g) ?? []).length, 0)
    assert.equal((flow.match(/IdentityVerificationAPI\.recordTravelClassification\(/g) ?? []).length, 1)
  })
  it("the popup's 'I’m still traveling' passes only through the display lookup", async () => {
    const launch = await startStillTraveling({ getDetectedLocation: async () => ({ country: "PT" }) as never })
    assert.equal(launch.initialState, "traveling-showcase")
  })
})

describe("Confirm / Skip awaits the saved duration before showing the Travel Mode screen", () => {
  const signature = "const activateTravelMode = async (skipped: boolean) => {"
  const start = flow.indexOf(signature)
  const body = flow.slice(start + signature.length, flow.indexOf("\n  }\n", start))

  function run(opts: {
    fail?: boolean
    mounted?: boolean
    busy?: boolean
    skipped?: boolean
    selected?: string | null
  }) {
    const calls: string[] = []
    const ref = { current: opts.busy === true }
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    const stubs = {
      activatingTravelModeRef: ref,
      setActivatingTravelMode: (v: boolean) => calls.push(`busy:${v}`),
      // Loading-state UI: which button started the save (spinner only on that one).
      setActivatingTravelAction: (v: string | null) => calls.push(`action:${v}`),
      setTravelModeSaveFailed: (v: boolean) => calls.push(`failed:${v}`),
      setTravelDurationSkipped: (v: boolean) => calls.push(`skipped:${v}`),
      travelModeDeps: async () => ({}),
      recordTravelDuration: async (_deps: unknown, duration: string) => {
        calls.push(`duration:${duration}`)
        await gate
        return opts.fail !== true
      },
      SKIPPED_TRAVEL_DURATION_LABEL,
      travelDuration: opts.selected === undefined ? "A few days" : opts.selected,
      getIsMounted: () => opts.mounted !== false,
      send: (e: string) => calls.push(`send:${e}`),
    }
    const fn = new Function(
      ...Object.keys(stubs),
      "skipped",
      `return (async () => {${body}})()`
    )
    const done = fn(...Object.values(stubs), opts.skipped === true) as Promise<void>
    return { calls, release, done }
  }

  it("Confirm success: nothing moves until the save returns, then the Travel Mode screen", async () => {
    const r = run({})
    await new Promise((x) => setTimeout(x, 5))
    assert.deepEqual(r.calls, ["action:confirm", "busy:true", "failed:false", "duration:A few days"])
    r.release()
    await r.done
    assert.deepEqual(r.calls, [
      "action:confirm",
      "busy:true",
      "failed:false",
      "duration:A few days",
      "busy:false",
      "action:null",
      "skipped:false",
      "send:NEXT",
    ])
  })
  it("Confirm without a selection submits nothing at all (no implicit not_sure)", async () => {
    const r = run({ selected: null })
    r.release()
    await r.done
    assert.deepEqual(r.calls, [])
  })
  it("Skip submits an explicit Not sure and ignores an earlier selection", async () => {
    const r = run({ skipped: true, selected: "More than 2 weeks" })
    r.release()
    await r.done
    assert.deepEqual(r.calls, [
      "action:skip",
      "busy:true",
      "failed:false",
      "duration:Not sure",
      "busy:false",
      "action:null",
      "skipped:true",
      "send:NEXT",
    ])
  })
  it("Skip works with nothing selected", async () => {
    const r = run({ skipped: true, selected: null })
    r.release()
    await r.done
    assert.ok(r.calls.includes("duration:Not sure"))
    assert.ok(r.calls.includes("skipped:true"))
  })
  it("failure: the screen stays open, says so, buttons re-enabled, nothing advances", async () => {
    const r = run({ fail: true })
    r.release()
    await r.done
    assert.deepEqual(r.calls, [
      "action:confirm",
      "busy:true",
      "failed:false",
      "duration:A few days",
      "busy:false",
      "action:null",
      "failed:true",
    ])
  })
  it("a second click while saving does nothing", async () => {
    const r = run({ busy: true })
    r.release()
    await r.done
    assert.deepEqual(r.calls, [])
  })
  it("unmounted before the save returns: no state is set and nothing advances", async () => {
    const r = run({ mounted: false })
    r.release()
    await r.done
    assert.deepEqual(r.calls, ["action:confirm", "busy:true", "failed:false", "duration:A few days"])
  })
  it("Skip is disabled only while saving; Confirm also until a duration is selected", () => {
    const s = screen()
    assert.ok(s.includes("disabled={activatingTravelMode || travelDuration === null}"))
    // Skip, and (new) the Back arrow: Back is disabled while the save runs, so the screen cannot move
    // and then be advanced a second time by the late success.
    assert.equal((s.match(/disabled=\{activatingTravelMode\}/g) ?? []).length, 2)
    assert.match(s, /disabled=\{activatingTravelMode\}\s+onClick=\{\(\) => goToLocationScreen\("BACK"\)\}/)
    // Loading state: only the pressed button spins, the label is unchanged, and each is aria-busy.
    assert.match(s, /loading=\{activatingTravelMode && activatingTravelAction === "skip"\}\s+aria-busy=\{activatingTravelMode && activatingTravelAction === "skip"\}/)
    assert.match(s, /loading=\{activatingTravelMode && activatingTravelAction === "confirm"\}\s+aria-busy=\{\s*activatingTravelMode && activatingTravelAction === "confirm"\s*\}/)
    assert.ok(s.includes("onClick={() => void activateTravelMode(true)}"))
    assert.ok(s.includes("onClick={() => void activateTravelMode(false)}"))
  })
  function screen() {
    return flow.slice(flow.indexOf('{state === "traveling-showcase"'))
  }
})
