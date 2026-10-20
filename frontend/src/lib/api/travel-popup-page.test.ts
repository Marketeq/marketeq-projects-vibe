// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = read("app", "(group)", "talent-dashboard", "page.tsx")
const flow = read("components", "identity-verification-flow.tsx")

// The Travel Mode popup in the page, and the approved reminder toast in the flow.
const popupStart = page.indexOf("<ToastProvider swipeDirection=\"right\">")
const popupEnd = page.indexOf("</ToastProvider>", popupStart) + "</ToastProvider>".length
const popup = page.slice(popupStart, popupEnd)

const flowToastStart = flow.indexOf("open={travelReminderOpen}")
const flowToast = flow.slice(flow.lastIndexOf("<Toast", flowToastStart), flow.indexOf("</Toast>", flowToastStart))
const classNames = (source: string) => [...source.matchAll(/className="([^"]*)"/g)].map((m) => m[1])

describe("exact approved copy and markup (Figma node 13101-46860)", () => {
  it("shows exactly the approved title, body and action, and a close X", () => {
    assert.ok(popup.includes("You are in Travel Mode"))
    assert.ok(popup.includes("Update your status if your location changes"))
    assert.match(popup, /<Button[^>]*onClick=\{\(\) => void handleTravelUpdate\(\)\}[^>]*>\s*Update\s*<\/Button>/)
    assert.match(popup, /<IconButton[\s\S]*onClick=\{handleTravelPopupClose\}[\s\S]*<X className="size-5" \/>/)
  })

  it("invents no other copy: the only visible strings are the three approved ones", () => {
    const text = [...popup.matchAll(/>([^<>{}]+)</g)].map((m) => m[1].trim()).filter(Boolean)
    assert.deepEqual(text, ["You are in Travel Mode", "Update your status if your location changes", "Update"])
  })

  it("uses the same classes, in the same order, as the flow's approved reminder toast", () => {
    assert.ok(flowToast.includes("You are in Travel Mode"), "found the flow's approved toast")
    assert.deepEqual(classNames(popup.slice(popup.indexOf("<Toast\n"), popup.indexOf("</Toast>"))), classNames(flowToast))
  })

  it("is built from existing design-system parts only (no raw controls, no new component)", () => {
    assert.ok(!/<(button|input|dialog)\b/.test(popup))
    for (const name of ["Toast,", "ToastDescription,", "ToastProvider,", "ToastTitle,", "ToastViewport,", "IconButton,", "Button,"]) {
      assert.ok(page.slice(0, page.indexOf('} from "@/components/ui"')).includes(name), name)
    }
    assert.ok(/import \{[^}]*\bPlane\b[^}]*\} from "@blend-metrics\/icons"/.test(page))
  })

  it("stays open until the USER closes it: no Infinity, a browser-safe duration, and timer closes are ignored", () => {
    assert.ok(!page.includes("Infinity"))
    assert.ok(popup.includes("duration={TRAVEL_POPUP_DURATION_MS}"))
    assert.match(popup, /onOpenChange=\{\(open\) => \{[\s\S]*travelPopupCloseGuardRef\.current\.shouldClose\(open\)[\s\S]*handleTravelPopupClose\(\)/)
    assert.ok(popup.includes("onEscapeKeyDown={() => travelPopupCloseGuardRef.current.markUserClose()}"))
    assert.ok(popup.includes("onSwipeEnd={() => travelPopupCloseGuardRef.current.markUserClose()}"))
    // the X closes directly, never through the toast's own close callback
    assert.match(popup, /<IconButton[\s\S]*onClick=\{handleTravelPopupClose\}/)
  })
})

describe("placement: nothing existing moved", () => {
  it("is its own ToastProvider, after the success alert's, which still holds only its own copy", () => {
    assert.equal((page.match(/<ToastProvider/g) ?? []).length, 2)
    const success = page.indexOf('<ToastProvider duration={5000} swipeDirection="right">')
    assert.ok(success > -1 && popupStart > success)
    const successBlock = page.slice(success, page.indexOf("</ToastProvider>", success))
    assert.ok(!successBlock.includes("Travel Mode"))
    assert.ok(!successBlock.includes("Update your status"))
  })

  it("leaves the existing blocks untouched: banner, cooldown dialog, success modal and the immediate confirmation", () => {
    assert.ok(page.includes("Your profile is not public"))
    assert.ok(page.includes("You’ve used all three attempts"))
    assert.ok(page.includes("You’re all set!"))
    assert.ok(!page.includes("Travel mode is on")) // that confirmation still lives only in the flow
    assert.ok(flow.includes("Travel mode is on."))
    assert.ok(flow.includes("No, I&rsquo;m currently traveling")) // the first-time option
  })

  it("the password-first ordering is unchanged: travel state is read inside the existing identity check", () => {
    const check = page.slice(page.indexOf("const runIdentityVerificationCheck"), page.indexOf("// A start attempt rejected as not startable"))
    assert.ok(check.includes("setTravelSummary(summary)"))
    assert.ok(check.includes("await fetchIdentityVerificationSummary()"))
    // no new request is made on page load by the travel code itself
    assert.ok(!/useEffect\(\(\) => \{\s*void fetchIdentityVerificationSummary/.test(page))
  })
})

describe("a reminder is shown only after a claim", () => {
  it("the 'reminder' popup opens from exactly one place: the claim's onClaimed callback", () => {
    assert.equal((page.match(/setTravelPopup\("reminder"\)/g) ?? []).length, 1)
    assert.match(page, /onClaimed: \(\) => setTravelPopup\("reminder"\)/)
  })

  it("the scheduler is rebuilt whenever the backend answer changes and cleaned up on unmount", () => {
    assert.match(page, /scheduler\.update\(\{\s+due: travelSummary\.travelReminderDue,\s+availableAt: travelSummary\.travelReminderAvailableAt,\s+\}\)\s+return \(\) => scheduler\.dispose\(\)\s+\}, \[travelSummary\]\)/)
  })

  it("after a definitive claim answer the next occurrence comes from a fresh /me read", () => {
    assert.match(page, /onSettled: \(\) => \{\s+void fetchIdentityVerificationSummary\(\)\.then\(\(next\) => \{\s+if \(next\) setTravelSummary\(next\)/)
  })

  it("the claim and the client come from the new modules", () => {
    assert.ok(page.includes('from "@/src/lib/api/travel-reminder"'))
    assert.ok(page.includes('from "@/src/lib/api/travel-expiry-popup"'))
  })
})

describe("the expiry popup", () => {
  it("opens only through the shared decision, with the session id and localStorage", () => {
    assert.equal((page.match(/setTravelPopup\("expiry"\)/g) ?? []).length, 1)
    assert.match(
      page,
      /shouldShowTravelExpiryPopup\(\{\s+expired: travelSummary\.travelModeExpired,\s+sessionId: readSessionId\(\),\s+storage: window\.localStorage,\s+\}\)/
    )
  })

  it("only closing the expiry popup writes a dismissal (a closed reminder is already spent)", () => {
    const close = page.slice(page.indexOf("const handleTravelPopupClose"), page.indexOf("// \"Update\": hide the popup"))
    assert.match(close, /if \(travelPopup === "expiry"\) \{\s+dismissTravelExpiryPopup\(readSessionId\(\), window\.localStorage\)\s+\}\s+setTravelPopup\(null\)/)
  })

  it("Update remembers nothing", () => {
    const update = page.slice(page.indexOf("const handleTravelUpdate"), page.indexOf("// Exact copy/markup from the Storybook reference"))
    assert.ok(!update.includes("dismissTravelExpiryPopup"))
    assert.ok(!update.includes("localStorage"))
  })
})

describe("Update opens the existing flow at the location-update screen", () => {
  const update = page.slice(page.indexOf("const handleTravelUpdate"), page.indexOf("// Exact copy/markup from the Storybook reference"))

  it("starts the flow at 'current-location-showcase' ('Tell us more about your current location')", () => {
    assert.ok(update.includes('initialState: "current-location-showcase"'))
    assert.ok(update.includes("setIdentityFlowOpen(true)"))
    assert.ok(flow.includes("Tell us more about you current location"))
    assert.ok(flow.includes('"current-location-showcase"'))
  })

  it("the existing temporarily-traveling and permanently-relocated choices are the flow's own, untouched", () => {
    const screen = flow.slice(flow.indexOf('{state === "current-location-showcase"'), flow.indexOf('{state === "traveling-showcase"'))
    assert.ok(screen.includes("Temporarily traveling"))
    assert.ok(screen.includes("Permanently relocated"))
    assert.ok(!screen.includes('persistTravelClassification("temporarily_traveling")'))
    assert.ok(screen.includes('persistTravelClassification("permanently_relocated")'))
  })

  it("hands the start screen to the flow through its existing public props and remounts it so it is read", () => {
    assert.ok(page.includes("key={flowLaunch.key}"))
    assert.ok(page.includes("initialState={flowLaunch.initialState}"))
    assert.match(flow, /initialState\?: FlowState/)
    assert.ok(flow.includes('initialState ?? "ideal"')) // the flow reads it once, on mount
  })

  it("shows the server's location only: Update never asks for the browser's", () => {
    assert.ok(update.includes("await getDetectedLocation()"))
    assert.ok(!update.includes("useBrowserLocation"))
  })

  it("the normal Verify path keeps its default start (an Update-launched flow is reset)", () => {
    assert.ok(page.includes("prev.initialState || Boolean(prev.activeTravelModeUpdate) !== activeTravelModeUpdate"))
    assert.ok(page.includes("? { key: prev.key + 1, ...(activeTravelModeUpdate ? { activeTravelModeUpdate } : {}) }"))
    assert.ok(
      page.includes(
        "useState<{\n    key: number\n    initialState?: \"current-location-showcase\" | \"traveling-showcase\"\n    activeTravelModeUpdate?: boolean\n  }>({ key: 0 })"
      )
    )
  })

  it("does not change the flow's own reminder toast or its Update action", () => {
    assert.ok(flow.includes("open={travelReminderOpen}"))
    assert.match(flow, /setTravelReminderOpen\(false\)\s+send\("UPDATE_LOCATION"\)\s+onOpenChange\(true\)/)
  })
})

describe("Update tells the flow WHY the popup opened (an explicit prop, not initialState)", () => {
  const update = page.slice(page.indexOf("const handleTravelUpdate"), page.indexOf("// Exact copy/markup from the Storybook reference"))

  it("captures the popup kind before hiding it, and re-reads /me only for a reminder", () => {
    assert.ok(update.indexOf("const kind = travelPopup") > -1)
    assert.ok(update.indexOf("const kind = travelPopup") < update.indexOf("setTravelPopup(null)"))
    assert.ok(update.includes('kind === "reminder" ? await fetchIdentityVerificationSummary() : null'))
    assert.ok(update.includes("isActiveTravelUpdate(kind, fresh)"))
  })

  it("passes the result through a separate prop; initialState keeps its single meaning", () => {
    assert.ok(update.includes("activeTravelModeUpdate,"))
    assert.ok(update.includes('initialState: "current-location-showcase"'))
    assert.ok(page.includes("activeTravelModeUpdate={flowLaunch.activeTravelModeUpdate}"))
    assert.ok(page.includes("initialState={flowLaunch.initialState}"))
  })

  it("only an in-force Travel Mode sets it: a Verify launch for anyone else carries no flag", () => {
    assert.equal((page.match(/activeTravelModeUpdate[,:]/g) ?? []).length >= 1, true)
    assert.ok(page.includes("const activeTravelModeUpdate = isTravelModeInForce(summary)"))
    assert.ok(page.includes("...(activeTravelModeUpdate ? { activeTravelModeUpdate } : {})"))
  })
})
