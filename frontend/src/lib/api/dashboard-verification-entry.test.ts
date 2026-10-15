// Run like profile-banner.test.ts (from the frontend/ directory).
// Source-level guards for the talent dashboard's verification entry: the banner and its
// "Verify My Account" action are restored on top of the current mobile layout, and nothing
// opens on page load.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"

const page = readFileSync(
  join(process.cwd(), "app", "(group)", "talent-dashboard", "page.tsx"),
  "utf8"
)
const count = (needle: string) => page.split(needle).length - 1

describe("dashboard verification entry: nothing opens on page load", () => {
  it("every surface starts closed", () => {
    assert.ok(page.includes("const [verificationGateOpen, setVerificationGateOpen] = useState(false)"))
    assert.ok(page.includes("const [identityFlowOpen, setIdentityFlowOpen] = useState(false)"))
    assert.ok(page.includes("const [vpnProxyModalOpen, setVpnProxyModalOpen] = useState(false)"))
    assert.ok(page.includes("const [profileBannerShown, setProfileBannerShown] = useState(false)"))
  })

  it("the gate and the flow are opened only inside the Verify My Account handler", () => {
    const start = page.indexOf("const handleVerifyMyAccount = useCallback(")
    const end = page.indexOf("}, [runIdentityVerificationCheck])", start)
    assert.ok(start > -1 && end > start)
    const inHandler = page.slice(start, end)
    for (const opener of ["setVerificationGateOpen(true)", "setIdentityFlowOpen(true)", "setVpnProxyModalOpen(true)"]) {
      assert.equal(count(opener), 1, `${opener} appears exactly once in the file`)
      assert.ok(inHandler.includes(opener), `${opener} is inside the click handler`)
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
    assert.equal(count("setSuccessAlertOpen(true)"), 1)
  })
})

describe("dashboard verification entry: the current mobile layout is preserved", () => {
  it("keeps the current content column, gap and outer padding classes", () => {
    assert.ok(page.includes('<div className="flex-auto space-y-3 min-[1024px]:space-y-5 min-w-0">'))
    assert.ok(page.includes("gap-x-8 flex md:p-6 min-[1024px]:pt-[50px]"))
  })

  it("does not bring back Travel Mode or the location-mismatch prompt (separate follow-ups)", () => {
    for (const gone of ["travelPopup", "travelSummary", "locationMismatch", "flowLaunch", "claimTravelReminder"]) {
      assert.ok(!page.includes(gone), `${gone} is not restored here`)
    }
  })
})
