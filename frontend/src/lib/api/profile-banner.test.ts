// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { shouldShowProfileBanner, verifyActionFor } from "./identity-next-step"
import { parseIdentityVerificationSummary } from "./identity-verification-state"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
// The persistent status-alert stack (PMCM-651) is its own block, rendered before the banner and
// pinned by travel-mode-alert-markup.test.ts. It is taken out here so this test keeps pinning
// the banner and the rest of the layout exactly as before.
const withoutStatusAlertStack = (source: string) => {
  const from = source.indexOf("{(statusAlertStack.visible.length > 0 ||")
  const to = source.indexOf("{profileBannerShown && !profileBannerDismissed && (")
  return from > -1 && to > from ? source.slice(0, from) + source.slice(to) : source
}
const page = withoutStatusAlertStack(read("app", "(group)", "talent-dashboard", "page.tsx"))

const bannerStart = page.indexOf("{profileBannerShown && !profileBannerDismissed && (")
const bannerEnd = page.indexOf("</Alert>", bannerStart) + "</Alert>".length
const banner = page.slice(bannerStart, bannerEnd)
const summary = (nextAction: string, extra: Record<string, unknown> = {}) =>
  parseIdentityVerificationSummary({ nextAction, ...extra })

describe("banner: exact approved content and design-system reuse", () => {
  it("is rendered, uses the existing warning Alert and the Warning-story building blocks", () => {
    assert.ok(bannerStart > -1 && bannerEnd > bannerStart)
    assert.ok(banner.includes('<Alert variant="warning" className="md:mb-8">'))
    for (const part of ["<AlertIcon>", "<AlertContent>", "<AlertTitle", "<AlertDescription>", "<CloseButton"]) {
      assert.ok(banner.includes(part), part)
    }
    assert.ok(banner.includes('<AlertTriangle className="h-5 w-5" />'))
    assert.ok(banner.includes('<AlertTitle className="text-warning-600">'))
    assert.ok(banner.includes('<ArrowRight className="size-5" />'))
  })

  it("uses exactly the approved title, body and action, with no ending punctuation", () => {
    assert.match(banner, />\s+Your profile is not public\s+<\/AlertTitle>/)
    assert.match(banner, />\s+To access full platform features, please verify your account\s+<\/AlertDescription>/)
    assert.match(banner, /Verify My Account\s+<ArrowRight/)
    for (const wrong of ["Your profile is not public.", "verify your account.", "Verify My Account.", "Learn more"]) {
      assert.ok(!banner.includes(wrong), wrong)
    }
  })

  it("is built only from design-system components: no raw html controls, no new component, no inline UI function", () => {
    assert.ok(!/<(button|input|dialog|a)\b/.test(banner))
    assert.ok(!/function [A-Z]\w*\(/.test(banner))
    const imports = page.slice(page.indexOf("import {\n  Alert,"), page.indexOf('} from "@/components/ui"'))
    for (const n of ["Alert,", "AlertContent,", "AlertDescription,", "AlertIcon,", "AlertTitle,", "Button,", "CloseButton,"]) {
      assert.ok(imports.includes(n), n)
    }
  })

  it("the design-system Alert is untouched: it carries nothing from this work", () => {
    const alert = read("components", "ui", "alert", "alert.tsx")
    for (const word of ["profile", "Verify My Account", "banner", "identity"]) assert.ok(!alert.toLowerCase().includes(word.toLowerCase()), word)
    assert.ok(alert.includes("{value && ("), "Alert still renders nothing when closed")
  })

  it("uses the existing CloseButton unchanged: only its own onClick prop is passed", () => {
    assert.ok(banner.includes("<CloseButton onClick={() => setProfileBannerDismissed(true)} />"))
  })
})

describe("banner: position above Welcome", () => {
  it("is the first child of the content column, directly before <Welcome>", () => {
    const column = page.indexOf('<div className="flex-auto space-y-3 min-[1024px]:space-y-5 min-w-0">')
    const welcome = page.indexOf("<Welcome onToggle")
    assert.ok(column > -1 && bannerStart > column && bannerStart < welcome)
    assert.ok(page.slice(column, bannerStart).replace(/\s+/g, "") === '<divclassName="flex-auto space-y-3 min-[1024px]:space-y-5 min-w-0">'.replace(/\s+/g, ""))
    assert.ok(page.slice(bannerEnd, welcome).replace(/[\s)}]+/g, "") === "")
  })
})

describe("banner: spacing above the Welcome row (Figma content column gap 32px)", () => {
  const comps = read("components", "talent-dashboard-comps.tsx")

  it("the cause is documented in the code: Welcome's wrapper is display:contents from md up", () => {
    assert.ok(comps.includes('<div className="md:contents flex flex-col gap-y-5">'))
    assert.ok(page.includes("`md:contents` wrapper") && page.includes("display:contents box has no margin"))
  })

  it("the banner carries its own 32px bottom gap from md up, and nothing is added below md", () => {
    assert.ok(banner.includes('<Alert variant="warning" className="md:mb-8">'))
    // below md the wrapper is a normal box and keeps the column's own space-y-3 (12px)
    assert.ok(page.includes('<div className="flex-auto space-y-3 min-[1024px]:space-y-5 min-w-0">'))
    assert.ok(!/(^|\s)mb-\d/.test(banner.match(/className="([^"]*)"/g)?.[0] ?? ""), "no unconditional bottom margin on the banner")
  })

  it("the margin belongs to the banner, so dismissing it removes the gap too and the row moves up", () => {
    assert.ok(page.includes("{profileBannerShown && !profileBannerDismissed && ("))
    // the Welcome row itself gets no top margin from the page, only from the banner above it
    const welcomeLine = page.slice(page.indexOf("<Welcome onToggle"), page.indexOf("<Welcome onToggle") + 60)
    assert.ok(!/className=/.test(welcomeLine))
  })

  it("the Welcome row and Create a Project stay on one row, untouched: the component is not modified", () => {
    assert.ok(comps.includes('<div className="flex items-end justify-between">'))
    assert.ok(!comps.toLowerCase().includes("profile-banner") && !comps.includes("profileBanner"))
  })
})

describe("banner: action", () => {
  it("Verify My Account runs the same handler as the gate, and is disabled only while that check runs", () => {
    assert.ok(banner.includes("onClick={() => void handleVerifyMyAccount()}"))
    assert.ok(banner.includes('disabled={connectionCheckState === "checking"}'))
    assert.equal((page.match(/handleVerifyMyAccount/g) ?? []).length >= 4, true)
  })
})

describe("banner: visibility, from the backend's state only", () => {
  const shown = ["confirm_location", "start_identity", "continue_identity", "retry_identity", "reverify_identity"]
  const hidden = ["await_review", "wait_for_retry", "complete", "some_future_value"]
  for (const a of shown) it(`${a} → shown`, () => assert.equal(shouldShowProfileBanner(summary(a)), true))
  for (const a of hidden) it(`${a} → hidden`, () => assert.equal(shouldShowProfileBanner(summary(a)), false))
  it("an unreadable or missing state → hidden", () => {
    assert.equal(shouldShowProfileBanner(null), false)
    assert.equal(shouldShowProfileBanner(summary("")), false)
  })
  it("pending review never shows it and no session can start from it", () => {
    assert.equal(shouldShowProfileBanner(summary("await_review")), false)
    assert.deepEqual(verifyActionFor(summary("await_review")), { kind: "close" })
  })
  it("the third-attempt cooldown never shows it: the dialog is shown instead", () => {
    const s = summary("wait_for_retry", { retryAvailableAt: "2026-10-03T14:17:00.000Z", attemptsUsed: 3, attemptsRemaining: 0 })
    assert.equal(shouldShowProfileBanner(s), false)
    assert.equal(verifyActionFor(s).kind, "limit")
  })
  it("the page shows it only when the backend says so AND it has not been dismissed", () => {
    assert.ok(page.includes("{profileBannerShown && !profileBannerDismissed && ("))
  })
})

describe("banner: dismissal is in memory, removes it from layout, and does nothing else", () => {
  it("dismissal is plain component state: one useState, set only by the X", () => {
    assert.ok(page.includes("const [profileBannerDismissed, setProfileBannerDismissed] = useState(false)"))
    assert.equal((page.match(/setProfileBannerDismissed\(/g) ?? []).length, 1)
    assert.ok(page.includes("setProfileBannerDismissed(true)"))
  })

  it("nothing about the banner touches localStorage, sessionStorage, cookies or the network", () => {
    const lines = page.split("\n").filter((l) => /banner/i.test(l)).join("\n")
    assert.ok(!/localStorage|sessionStorage|cookie|fetch\(|axios|AxiosRequest|IdentityVerificationAPI/i.test(lines))
    // the dismissal click itself is exactly one state setter
    assert.ok(banner.includes("onClick={() => setProfileBannerDismissed(true)}") === true)
  })

  it("dismissing changes no verification state: the X handler touches no other setter", () => {
    const handler = banner.slice(banner.indexOf("<CloseButton"), banner.indexOf("/>", banner.indexOf("<CloseButton")) + 2)
    assert.ok(!/setVerif|setIdentity|setCooldown|setDetected|setProfileBannerShown|handleVerifyMyAccount/.test(handler))
  })

  it("it is removed from layout, not hidden: when dismissed or not actionable nothing renders", () => {
    assert.ok(page.includes("{profileBannerShown && !profileBannerDismissed && ("))
    assert.ok(!/className="[^"]*\bhidden\b/.test(banner) && !banner.includes("invisible") && !banner.includes("opacity-0"))
  })

  it("a refresh or later login starts fresh: the dismissal state has no persistence anywhere", () => {
    assert.ok(!/profileBannerDismissed.*(local|session)Storage/.test(page))
    assert.ok(!existsSync(join(process.cwd(), "src", "lib", "api", "profile-banner-state.ts")))
  })
})

describe("the success alert is preserved exactly as in commit 494827a0, and the You're all set! modal is unchanged", () => {
  const alertStart = page.indexOf('<ToastProvider duration={5000} swipeDirection="right">')
  const alertEnd = page.indexOf("</ToastProvider>", alertStart) + "</ToastProvider>".length
  const alert = page.slice(alertStart, alertEnd)

  it("the alert block is byte-for-byte the committed one (sha256 of the whole ToastProvider block)", () => {
    assert.ok(alertStart > -1 && alertEnd > alertStart)
    assert.equal(createHash("sha256").update(alert).digest("hex"), "1dcfb7b16a895984408c21490f7bf4ba82bdda253165b95288f6b3ea394550bd")
  })

  it("keeps its approved copy", () => {
    assert.ok(alert.includes("All set! Your identity and location are verified."))
    assert.ok(alert.includes("You now have full access to all features."))
  })

  it("Done closes the modal and then opens the alert, through the same handler as before", () => {
    assert.ok(page.includes("<Button onClick={handleSuccessDone}>Done</Button>"))
    assert.match(page, /const handleSuccessDone = \(\) => \{\s+setVerifiedModalOpen\(false\)\s+setSuccessAlertOpen\(true\)\s+\}/)
    // the Done handler, plus the PMCM-653 reviewed-approval check (its own test file)
    assert.equal((page.match(/setSuccessAlertOpen\(true\)/g) ?? []).length, 2)
  })

  it("its dedicated test file is present", () => {
    assert.ok(existsSync(join(process.cwd(), "src", "lib", "api", "success-alert.test.ts")))
  })

  it("the existing modal is unchanged: same copy and markup", () => {
    for (const c of [
      'className="max-w-[456px] pt-[50px]"',
      "size-12 rounded-full border-[8px] inline-flex items-center justify-center text-success-600 border-success-50 bg-success-100",
      '<CheckCircle className="size-6" />',
      "You’re all set!",
      "Your identity and location have been successfully verified. You can",
      "now access all platform features.",
      'className="mt-[50px] grid"',
    ]) {
      assert.ok(page.includes(c), c)
    }
  })

  it("it still opens only for complete, from the backend", () => {
    assert.match(page, /shouldShowSuccessModal\(summary\)\) \{\s+clearAwaitingResult\(window\.localStorage\)[\s\S]*?setVerifiedModalOpen\(true\)/)
  })

  it("the banner and the success alert never show together: complete hides the banner", () => {
    assert.equal(shouldShowProfileBanner(summary("complete")), false)
    assert.match(page, /clearAwaitingResult\(window\.localStorage\)\s+setVerificationGateOpen\(false\)\s+setProfileBannerShown\(false\)\s+setVerifiedModalOpen\(true\)/)
  })
})

describe("what is preserved around the banner", () => {
  it("Secure Account still comes before Identity Verification", () => {
    assert.ok(page.includes("shouldStartIdentityCheck({"))
    assert.ok(page.includes("securityDialogOpen: showSecurityModal"))
  })
  it("rejected users no longer get the modal-style gate automatically (banner instead)", () => {
    assert.ok(page.includes('reason="unstarted"'))
    assert.ok(!page.includes("setGateReason"))
    assert.ok(!page.includes("shouldOpenFirstTimeGate"))
  })
  it("a verified status elsewhere hides the banner too", () => {
    assert.match(page, /if \(status !== "verified"\) return\s+setVerificationGateOpen\(false\)\s+setIdentityFlowOpen\(false\)\s+setProfileBannerShown\(false\)/)
  })
  it("the approved third-attempt dialog and its trigger are still present", () => {
    assert.ok(page.includes("open={cooldownRetryTime !== null}"))
    assert.ok(page.includes("You’ve used all three attempts"))
  })
})
