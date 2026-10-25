// Run like profile-banner.test.ts (from the frontend/ directory).
// Source-level guards for the talent dashboard's verification entry: the banner and its
// "Verify My Account" action are restored on top of the current mobile layout, and nothing
// opens on page load.
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { isActiveTravelUpdate, isTravelModeInForce } from "./travel-popup"
import { shouldShowTravelExpiryPopup } from "./travel-expiry-popup"
import {
  shouldShowLocationMismatchPrompt,
  startChangeHomeCountry,
  startStillTraveling,
} from "./location-mismatch"
import { parseIdentityVerificationSummary } from "./identity-verification-state"

// The persistent status-alert stack (PMCM-651) is its own block, rendered before the banner and
// pinned by travel-mode-alert-markup.test.ts. It is taken out here so this test keeps pinning
// the banner and the rest of the layout exactly as before.
const withoutStatusAlertStack = (source: string) => {
  const from = source.indexOf("{(statusAlertStack.visible.length > 0 ||")
  const to = source.indexOf("{profileBannerShown && !profileBannerDismissed && (")
  return from > -1 && to > from ? source.slice(0, from) + source.slice(to) : source
}
const page = withoutStatusAlertStack(
  readFileSync(
    join(process.cwd(), "app", "(group)", "talent-dashboard", "page.tsx"),
    "utf8"
  )
)
const count = (needle: string) => page.split(needle).length - 1

describe("dashboard verification entry: nothing opens on page load", () => {
  it("every surface starts closed", () => {
    assert.ok(page.includes("const [verificationGateOpen, setVerificationGateOpen] = useState(false)"))
    assert.ok(page.includes("const [identityFlowOpen, setIdentityFlowOpen] = useState(false)"))
    assert.ok(page.includes("const [vpnProxyModalOpen, setVpnProxyModalOpen] = useState(false)"))
    assert.ok(page.includes("const [profileBannerShown, setProfileBannerShown] = useState(false)"))
  })

  it("the gate and the VPN warning are opened only inside the Verify My Account handler", () => {
    const start = page.indexOf("const handleVerifyMyAccount = useCallback(")
    const end = page.indexOf("}, [runIdentityVerificationCheck])", start)
    assert.ok(start > -1 && end > start)
    const inHandler = page.slice(start, end)
    for (const opener of ["setVerificationGateOpen(true)", "setVpnProxyModalOpen(true)"]) {
      assert.equal(count(opener), 1, `${opener} appears exactly once in the file`)
      assert.ok(inHandler.includes(opener), `${opener} is inside the click handler`)
    }
  })

  it("the verification flow is opened only by a click: Verify, the popup's Update, or a mismatch answer", () => {
    assert.equal(count("setIdentityFlowOpen(true)"), 3)
    for (const owner of [
      "const handleVerifyMyAccount = useCallback(",
      "const handleTravelUpdate = useCallback(",
      "const openFlowFromMismatch = useCallback(",
    ]) {
      const from = page.indexOf(owner)
      const next = owner.includes("openFlowFromMismatch")
        ? page.indexOf("const handleIdentityFlowOpenChange", from)
        : page.indexOf("\n  }, [", from)
      assert.ok(from > -1 && page.slice(from, next).includes("setIdentityFlowOpen(true)"), owner)
    }
  })

  it("the page-load check only decides the banner and the retry time", () => {
    const start = page.indexOf("const runIdentityVerificationCheck = useCallback(")
    const end = page.indexOf("}, [])", start)
    const body = page.slice(start, end)
    assert.ok(body.includes("setProfileBannerShown(shouldShowProfileBanner(summary))"))
    assert.ok(!/Gate\w*Open\(true\)|FlowOpen\(true\)|ModalOpen\(true\)/.test(body))
  })

  it("the status read waits for the Secure your account dialog and runs once", () => {
    assert.ok(page.includes("shouldStartIdentityCheck({"))
    assert.ok(page.includes("securityDialogOpen: showSecurityModal"))
    assert.ok(page.includes("alreadyStarted: identityStatusCheckStartedRef.current"))
  })
})

describe("dashboard verification entry: banner and action", () => {
  it("shows the approved banner copy and a Verify My Account button wired to the handler", () => {
    assert.ok(page.includes("Your profile is not public"))
    assert.ok(page.includes("To access full platform features, please verify your account"))
    assert.ok(/Verify My Account\s*<ArrowRight/.test(page))
    assert.ok(page.includes("onClick={() => void handleVerifyMyAccount()}"))
  })

  it("dismissing the banner is in memory only", () => {
    assert.ok(page.includes("<CloseButton onClick={() => setProfileBannerDismissed(true)} />"))
    // The only writer is the CloseButton, with a plain boolean: nothing is persisted.
    assert.equal(count("setProfileBannerDismissed(true)"), 1)
    assert.ok(!/(local|session)Storage[^\n]*[Bb]annerDismissed|[Bb]annerDismissed[^\n]*(local|session)Storage/.test(page))
  })

  it("a verified refresh event hides everything", () => {
    assert.ok(page.includes("IDENTITY_STATUS_REFRESHED_EVENT"))
    assert.ok(page.includes('if (status !== "verified") return'))
  })
})

describe("dashboard verification entry: return from Didit", () => {
  it("opens the success modal only from a backend 'complete' result, never on an ordinary load", () => {
    assert.ok(page.includes("const [verifiedModalOpen, setVerifiedModalOpen] = useState(false)"))
    assert.equal(count("setVerifiedModalOpen(true)"), 1)
    const at = page.indexOf("setVerifiedModalOpen(true)")
    assert.ok(page.slice(page.lastIndexOf("if (shouldShowSuccessModal(summary))", at), at).length < 400)
  })

  it("reconciles and polls only for a browser that is awaiting a result, and stops on its own", () => {
    assert.ok(page.includes("if (hasAwaitingResult(window.localStorage)) {"))
    assert.ok(page.includes("if (cancelled || !hasAwaitingResult(window.localStorage)) return"))
    assert.ok(page.includes("attempts < RESULT_POLL_MAX_ATTEMPTS"))
    assert.ok(page.includes("clearAwaitingResult(window.localStorage)"))
    assert.ok(page.includes("cancelled = true") && page.includes("clearTimeout(timer)"))
    assert.ok(page.includes('document.removeEventListener("visibilitychange", onVisible)'))
  })

  it("completion hides the banner, and the success alert shows only after Done", () => {
    const at = page.indexOf("setVerifiedModalOpen(true)")
    assert.ok(page.slice(page.lastIndexOf("clearAwaitingResult", at), at).includes("setProfileBannerShown(false)"))
    assert.ok(page.includes("setVerifiedModalOpen(false)\n    setSuccessAlertOpen(true)"))
    // the Done handler, plus the PMCM-653 reviewed-approval check (its own test file)
    assert.equal(count("setSuccessAlertOpen(true)"), 2)
  })
})

describe("dashboard verification entry: the current mobile layout is preserved", () => {
  it("keeps the current content column, gap and outer padding classes", () => {
    assert.ok(page.includes('<div className="flex-auto space-y-3 min-[1024px]:space-y-5 min-w-0">'))
    assert.ok(page.includes("gap-x-8 flex md:p-6 min-[1024px]:pt-[50px]"))
  })

  it("the page layout (everything from <AuthenticatedRoute> down, except the banner) is byte-identical to dev-main's", () => {
    const body = page.slice(page.indexOf("<AuthenticatedRoute>"))
    const bannerStart = body.indexOf("{profileBannerShown")
    const withoutBanner = body.slice(0, bannerStart) + body.slice(body.indexOf("<Welcome onToggle"))
    const digest = createHash("sha256").update(withoutBanner.replace(/\s+/g, "")).digest("hex")
    // sha256 of the same region of origin/dev-main bea5e633 (Christopher's current mobile layout)
    assert.equal(digest, "70db699d55fe4076cad174fd354fd377de4c974209eb4e87473944e4c0729070")
  })

  it("does not bring back the duplicate password logic, the dead in-flow toast or client reminder timers", () => {
    assert.ok(!page.includes('provider === "EMAIL"'), "the password rule comes from isPasswordSetupRequired")
    assert.equal(count("isPasswordSetupRequired(safeUser)"), 1)
    assert.ok(!page.includes("travelReminderOpen"), "the flow's dead in-flow toast is not copied")
    assert.ok(!/setInterval|scheduleTravelModeReminderMock/.test(page))
  })
})

describe("Travel Mode popups: each appears only when its backend condition applies", () => {
  it("nothing travel-related is open before the backend answers", () => {
    assert.ok(page.includes('useState<"reminder" | "expiry" | null>(\n    null\n  )'))
    assert.ok(page.includes("const [travelSummary, setTravelSummary] ="))
    assert.ok(page.includes("const [locationMismatchOpen, setLocationMismatchOpen] = useState(false)"))
    assert.ok(page.includes("const [verifiedModalOpen, setVerifiedModalOpen] = useState(false)"))
    assert.ok(page.includes("const [successAlertOpen, setSuccessAlertOpen] = useState(false)"))
  })

  it("the expiry popup needs the backend's travelModeExpired and honours a close in this login", () => {
    assert.equal(count('setTravelPopup("expiry")'), 1)
    const at = page.indexOf('setTravelPopup("expiry")')
    const guard = page.slice(page.lastIndexOf("shouldShowTravelExpiryPopup({", at), at)
    assert.ok(guard.includes("expired: travelSummary.travelModeExpired"))
    assert.ok(guard.includes("loginSessionKey: travelSummary.loginSessionKey"))
    const base = { expired: true, loginSessionKey: "k".repeat(64) }
    const store = new Map<string, string>()
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k), key: (i: number) => [...store.keys()][i] ?? null, get length() { return store.size } }
    assert.equal(shouldShowTravelExpiryPopup({ ...base, expired: false, storage }), false)
    assert.equal(shouldShowTravelExpiryPopup({ ...base, expired: null, storage }), false)
    assert.equal(shouldShowTravelExpiryPopup({ ...base, storage }), true)
  })

  it("a due Travel Mode occurrence opens the check-in modal from /me, not a claim: one timer, no scheduler", () => {
    // PMCM-641 retired the claim-and-toast path: the small alert has no trigger of its own now.
    assert.equal(count('setTravelPopup("reminder")'), 0)
    assert.equal(count("createTravelReminderScheduler"), 0)
    assert.equal(count("claimTravelReminder"), 0)
    assert.equal(count("createCheckInTimer({"), 1)
    assert.ok(page.includes("timer.update(travelSummary)"))
    assert.ok(page.includes("return () => timer.dispose()"))
    assert.ok(page.includes("reconcileCheckIn("))
    assert.ok(page.includes("summary: travelSummary"))
  })

  it("closing a reminder spends it; closing the expiry popup is remembered for this login only", () => {
    const close = page.slice(page.indexOf("const handleTravelPopupClose"), page.indexOf("const handleTravelUpdate"))
    assert.ok(close.includes('if (travelPopup === "expiry")'))
    assert.ok(close.includes("dismissTravelExpiryPopup(travelSummary?.loginSessionKey ?? null, window.localStorage)"))
  })
})

describe("Travel Mode and location actions route correctly", () => {
  it("Update opens the flow at the location screen and tells it whether Travel Mode is still active", async () => {
    const update = page.slice(page.indexOf("const handleTravelUpdate"), page.indexOf("const openFlowFromMismatch"))
    assert.ok(update.includes('initialState: "current-location-showcase"'))
    assert.ok(update.includes("isActiveTravelUpdate(kind, fresh)"))
    assert.ok(update.includes('kind === "reminder" ? await fetchIdentityVerificationSummary() : null'))
    assert.equal(isActiveTravelUpdate("reminder", { travelModeExpired: false }), true)
    assert.equal(isActiveTravelUpdate("reminder", { travelModeExpired: true }), false)
    assert.equal(isActiveTravelUpdate("expiry", null), false)
  })

  it("the new-location prompt shows only when the backend says locationMismatch and nothing else needs the user first", () => {
    assert.equal(count("setLocationMismatchOpen(shouldShowLocationMismatchPrompt(summary))"), 1)
    assert.ok(!/setLocationMismatchOpen\(true\)/.test(page))
    const parse = (extra: Record<string, unknown>) => parseIdentityVerificationSummary({ nextAction: "complete", ...extra })
    assert.equal(shouldShowLocationMismatchPrompt(parse({ locationMismatch: true })), true)
    assert.equal(shouldShowLocationMismatchPrompt(parse({ locationMismatch: false })), false)
    assert.equal(shouldShowLocationMismatchPrompt(parse({})), false)
    assert.equal(shouldShowLocationMismatchPrompt(null), false)
  })

  it("'I’m still traveling' (Storybook ChangeLocation) opens the duration screen and saves nothing", async () => {
    assert.ok(page.includes("I’m still traveling"))
    assert.ok(!page.includes("I’m currently traveling"))
    assert.ok(page.includes('openFlowFromMismatch(await startStillTraveling(), "traveling")'))
    const deps = { getDetectedLocation: async () => ({ country: "PT" }) } as never
    const launch = await startStillTraveling(deps)
    assert.equal(launch.initialState, "traveling-showcase")
  })

  it("'Change my home country' starts from the top and saves nothing", async () => {
    assert.ok(page.includes("Change my home country"))
    assert.ok(page.includes('openFlowFromMismatch(await startChangeHomeCountry(), "change-country")'))
    const deps = { getDetectedLocation: async () => ({ country: "PT" }) } as never
    const launch = await startChangeHomeCountry(deps)
    assert.equal(launch.initialState, undefined)
  })

  it("an answered prompt closes itself and both buttons are disabled while one is in flight", () => {
    assert.ok(page.includes("setLocationMismatchOpen(false)"))
    assert.equal(count("disabled={locationMismatchBusy}"), 2)
  })

  it("Verify My Account is travel-aware: an active traveller is not asked the duration again", () => {
    const handler = page.slice(page.indexOf("const handleVerifyMyAccount"), page.indexOf("}, [runIdentityVerificationCheck])"))
    assert.ok(handler.includes("const activeTravelModeUpdate = isTravelModeInForce(summary)"))
    assert.ok(handler.includes("...(activeTravelModeUpdate ? { activeTravelModeUpdate } : {})"))
    assert.ok(page.includes("activeTravelModeUpdate={flowLaunch.activeTravelModeUpdate}"))
    assert.equal(isTravelModeInForce({ travelModeEndsAt: "2030-01-01T00:00:00Z", travelModeExpired: false }), true)
    assert.equal(isTravelModeInForce({ travelModeEndsAt: "2030-01-01T00:00:00Z", travelModeExpired: true }), false)
    assert.equal(isTravelModeInForce({ travelModeEndsAt: null, travelModeExpired: false }), false)
  })
})
