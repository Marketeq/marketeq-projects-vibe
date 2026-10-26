// Run like status-alerts.test.ts (from the frontend/ directory).
//
// Christopher's PMCM-651 decisions on the unverified-account surfaces, pinned so a later
// change cannot undo them without these tests failing and being read:
//
//   1. The orange inline banner ("Your profile is not public") is preserved exactly,
//      including its in-memory dismissal. It may reappear after a refresh.
//   2. AccountVerificationGate does not open automatically on login or dashboard load.
//   3. No standalone unverified modal/card is added to the dashboard (and none lives in the
//      top-right status-alert stack).
//   4. The existing "Verify My Account" flow is unchanged.
//   5. No unverified_account card, login modal or session-persisted banner dismissal exists
//      in the PMCM-651 alert code.
//
// The hashes are sha256 of the whitespace-stripped source and equal the same blocks on
// origin/dev-main at the time of the decision (the banner and the Verify My Account handler
// were not touched by PMCM-651). Changing those blocks on purpose means a new decision:
// update the hash in the same commit and say why.
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = read("app", "(group)", "talent-dashboard", "page.tsx")
const gateComponent = read("components", "account-verification-gate.tsx")
const sha = (s: string) =>
  createHash("sha256").update(s.replace(/\s+/g, "")).digest("hex")
const between = (source: string, from: string, to: string) => {
  const start = source.indexOf(from)
  assert.ok(start > -1, `${from} is in the page`)
  const end = source.indexOf(to, start)
  assert.ok(end > start, `${to} follows it`)
  return source.slice(start, end + to.length)
}

const banner = between(
  page,
  "{profileBannerShown && !profileBannerDismissed && (",
  "</Alert>"
)
const handler = between(
  page,
  "const handleVerifyMyAccount = useCallback(",
  "}, [runIdentityVerificationCheck])"
)
const gateUsage = between(page, "<AccountVerificationGate", "/>")

describe("decision 1: the orange inline banner is preserved, with its in-memory dismissal", () => {
  it("the banner markup is byte-identical to dev-main's", () => {
    assert.equal(
      sha(banner),
      "4b2da826a1e9691f6ee0425050879d1358263d4d3ada4d1bd2410635e3d0276e"
    )
  })

  it("its dismissal is component memory only: no storage, no key, no request", () => {
    assert.ok(
      page.includes(
        "const [profileBannerDismissed, setProfileBannerDismissed] ="
      )
    )
    assert.match(
      page,
      /const \[profileBannerDismissed, setProfileBannerDismissed\] = useState\(false\)/
    )
    assert.ok(
      banner.includes(
        "<CloseButton onClick={() => setProfileBannerDismissed(true)} />"
      )
    )
    assert.equal(
      page.split("setProfileBannerDismissed").length - 1,
      2, // the declaration and the one click handler
      "nothing else reads or writes the banner dismissal"
    )
    assert.doesNotMatch(
      banner,
      /localStorage|sessionStorage|loginSessionKey|StatusAlertsAPI/
    )
  })

  it("it is not tied to the live-alert, per-login dismissal machinery", () => {
    assert.doesNotMatch(
      banner,
      /dismissLiveAlert|readLiveDismissals|rememberLiveDismissal/
    )
  })
})

describe("decisions 2 and 3: the gate never opens on load and no standalone unverified modal/card exists", () => {
  it("the gate opens in exactly one place: the Verify My Account handler's 'unavailable' branch", () => {
    assert.equal(page.split("setVerificationGateOpen(true)").length - 1, 1)
    assert.ok(handler.includes("setVerificationGateOpen(true)"))
  })

  it("the first-time-gate trigger exists but is not wired to the page", () => {
    assert.ok(!page.includes("shouldOpenFirstTimeGate"))
    assert.match(
      page,
      /const \[verificationGateOpen, setVerificationGateOpen\] = useState\(false\)/
    )
  })

  it("the page-load check only decides the banner and the retry time (and the travel summary)", () => {
    const check = between(
      page,
      "const runIdentityVerificationCheck = useCallback(",
      "}, [])"
    )
    assert.doesNotMatch(
      check,
      /setVerificationGateOpen|setIdentityFlowOpen|setVpnProxyModalOpen/
    )
  })

  it("the gate component and its single use are unchanged, and no second 'not public' surface was added", () => {
    assert.equal(
      sha(gateComponent),
      "48a1bb2b47e4db358644a17c3d3e4fedf9c35d64644d4f50585ebfb8926f20a0"
    )
    assert.equal(
      sha(gateUsage),
      "4323afde76692192f2d571d71e38fe2ce4459acdd9bd19615ab2dae12d29cef4"
    )
    assert.equal(page.split("<AccountVerificationGate").length - 1, 1)
    // The only "Your profile is not public" copy on the page is the banner's.
    assert.equal(page.split("Your profile is not public").length - 1, 1)
  })
})

describe("decision 4: the Verify My Account flow is unchanged", () => {
  it("the handler is byte-identical to dev-main's", () => {
    assert.equal(
      sha(handler),
      "b2d0a31b1f27c8e87aeea70ae4c8103a0983f006c5dac57284042a4912de4425"
    )
  })

  it("the banner and the gate share that one handler", () => {
    assert.ok(banner.includes("void handleVerifyMyAccount()"))
    assert.ok(gateUsage.includes("void handleVerifyMyAccount()"))
  })
})

describe("decision 5: no unverified-account card, login modal or session-persisted banner dismissal in the PMCM-651 code", () => {
  const sources = [
    "status-alert-state.ts",
    "status-alert-copy.ts",
    "status-alert-dismissal.ts",
    "live-alert-dismissal.ts",
    "status-alerts.ts",
  ].map((f) => [f, readFileSync(join(__dirname, f), "utf8")] as const)

  it("none of the alert modules models an unverified card, banner key or verified-ness input", () => {
    for (const [name, source] of sources) {
      assert.doesNotMatch(
        source,
        /unverified_account|unverified_banner|isUnverifiedBannerVisible|verify_account|fullyVerified|loginStartedAt/,
        name
      )
    }
  })

  it("the status-alert stack the page renders has no unverified card or Verify action", () => {
    const stack = between(
      page,
      "data-status-alert-stack",
      "{statusAlertDismissFailed && ("
    )
    assert.doesNotMatch(
      stack,
      /unverified|Verify My Account|handleVerifyMyAccount/
    )
    assert.doesNotMatch(page, /fullyVerified: undefined|unverified_/)
  })

  it("the live-dismissal storage is used only for the live Travel Mode card", () => {
    assert.equal(page.split("readLiveDismissals(").length - 1, 1)
    assert.equal(page.split("dismissLiveAlert(").length - 1, 1)
    assert.ok(!banner.includes("LiveDismissal"))
  })
})
