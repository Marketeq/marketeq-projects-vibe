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

  // BTB-387: the approved Try Again button — RefreshCw (15px) as leftIcon, as in the Storybook
  // Rescan / Reload dialogs and the production Retry in account-verification-gate.
  describe("Try Again button", () => {
    const tryAgainButton = () => {
      const d = dialogSource()
      const at = d.lastIndexOf("<Button", d.indexOf("ref={tryAgainButtonRef}"))
      return d.slice(at, d.indexOf("</Button>", at) + "</Button>".length)
    }
    const buttonSource = read("components", "ui", "button", "button.tsx")

    it("supplies the idle refresh icon through leftIcon, 15px, imported from @blend-metrics/icons", () => {
      const b = tryAgainButton()
      assert.ok(b.includes('leftIcon={<RefreshCw className="size-[15px]" />}'))
      assert.match(
        host,
        /import \{[^}]*\bRefreshCw\b[^}]*\} from "@blend-metrics\/icons"/
      )
      // never also as a child: it would then sit beside the spinner instead of being replaced
      const children = b.slice(b.indexOf(">\n") + 2, b.lastIndexOf("</Button>"))
      assert.ok(!children.includes("RefreshCw"))
    })

    it("the shared Button replaces leftIcon with its spinner while loading (and the label stays)", () => {
      assert.match(
        buttonSource,
        /\{loading\s*\?\s*loadingIcon \|\| \(\s*<svg\s+className="animate-spin[\s\S]*?\)\s*:\s*leftIcon\}\s*\{children\}/
      )
      // no loadingIcon override on Try Again, so the shared spinner is what shows
      assert.ok(!tryAgainButton().includes("loadingIcon"))
    })

    it("the label 'Try Again' is a plain child, shown in both idle and loading states", () => {
      const b = tryAgainButton()
      assert.match(b, />\s*Try Again\s*<\/Button>/)
      assert.ok(!/busy\s*\?[^:]*Try Again/.test(b))
      assert.ok(!/busy\s*&&/.test(b))
    })

    it("keeps loading, aria-busy and the Button's own disabled-while-loading behaviour", () => {
      const b = tryAgainButton()
      assert.ok(b.includes("loading={locationRecoveryState.busy}"))
      assert.ok(b.includes("aria-busy={locationRecoveryState.busy}"))
      assert.ok(!b.includes("disabled"))
      assert.match(buttonSource, /disabled=\{disabled \|\| loading\}/)
    })

    it("hugs its content in idle and loading: no fixed, minimum or maximum width on any footer button", () => {
      const footer = dialogSource().slice(
        dialogSource().indexOf('<div className="mt-[50px] flex justify-center')
      )
      assert.ok(!/w-\[|min-w|max-w|\bw-\d|\bw-full|\bflex-1|\bgrow\b/.test(footer))
      const b = tryAgainButton()
      const className = b.match(/className="([^"]*)"/)?.[1] ?? ""
      assert.ok(!/\bw-|min-w|max-w/.test(className))
      assert.ok(!/className=\{/.test(b))
      assert.ok(!host.includes("w-[133px]"))
    })

    it("uses the documented Button pattern: primary light, size md, no colour overrides, plus the focus ring", () => {
      const b = tryAgainButton()
      const className = b.match(/className="([^"]*)"/)?.[1] ?? ""
      assert.ok(b.includes('variant="light"'))
      assert.ok(b.includes('size="md"'))
      assert.ok(!b.includes("visual="), "default (primary) visual")
      assert.equal(
        className,
        "focus-visible:ring-4 focus-visible:ring-primary-100"
      )
      for (const gone of ["bg-primary-50", "text-primary-500", "hover:", "shadow-none"]) {
        assert.ok(!className.includes(gone), gone)
      }
    })

    it("still goes only through the controller: one request per press, with the 700 ms minimum", () => {
      const b = tryAgainButton()
      assert.ok(b.includes("onClick={() => void locationRecovery.tryAgain()}"))
      assert.equal(b.split("locationRecovery.").length - 1, 1)
      assert.match(host, /minBusyMs: 700,/)
    })
  })

  it("Try Again shows loading while a request is in flight (the shared Button's own loading state)", () => {
    const d = dialogSource()
    assert.ok(d.includes("loading={locationRecoveryState.busy}"))
    assert.ok(d.includes("aria-busy={locationRecoveryState.busy}"))
  })

  it("reuses the approved warning dialog: 531px responsive, warning icon, shared buttons, focus rings", () => {
    const d = dialogSource()
    assert.ok(d.includes("w-[calc(100%-32px)] max-w-[531px]"))
    assert.ok(d.includes("bg-warning-100 border-[8px] border-warning-50"))
    assert.ok(d.includes("<AlertTriangle"))
    assert.equal(
      d.split("focus-visible:ring-4 focus-visible:ring-primary-100").length - 1,
      3 // the link, Cancel/Back and Try Again
    )
    assert.ok(d.includes('variant="outlined"'))
    assert.ok(d.includes('variant="link"'))
    // The refresh icon belongs to Try Again alone (checked in its own block below).
    assert.equal(d.split("<RefreshCw").length - 1, 1)
  })

  it("the warning icon is on the recovery view only, never on the 'How to turn on location' view", () => {
    const d = dialogSource()
    assert.equal(d.split("<AlertTriangle").length - 1, 1)
    const at = d.indexOf("<AlertTriangle")
    const before = d.slice(d.lastIndexOf("{locationRecoveryState.view", at), at)
    assert.ok(before.includes('locationRecoveryState.view === "main"'))
    // the instructions view has no icon of its own and no gap left where it was
    const howTo = host.slice(
      host.indexOf("function LocationHowTo()"),
      host.indexOf("export function IdentityVerificationHostProvider")
    )
    assert.ok(!howTo.includes("AlertTriangle"))
    assert.ok(howTo.includes('<div className="px-[19px]">'))
    // the recovery view keeps its spacing under the icon
    assert.ok(d.includes('<div className="mt-5 px-[19px]">'))
  })

  it("the dialog scrolls vertically when its content is taller than the screen (no sticky footer, no compressing)", () => {
    const d = dialogSource()
    assert.ok(d.includes("max-h-[calc(100dvh-32px)] overflow-y-auto"))
    assert.ok(!/\bsticky\b/.test(d))
    assert.ok(!/overflow-x/.test(d))
    // opening the dialog focuses Try Again WITHOUT scrolling to it, so a short screen starts at the title
    assert.equal(host.split("focus({ preventScroll: true })").length - 1, 2)
    assert.ok(!/tryAgainButtonRef\.current\?\.focus\(\)/.test(host))
  })

  it("initial focus is on Try Again, not on the page behind", () => {
    const d = dialogSource()
    assert.ok(d.includes("ref={tryAgainButtonRef}"))
    assert.match(
      d,
      /onOpenAutoFocus=\{\(event\) => \{\s*event\.preventDefault\(\)\s*tryAgainButtonRef\.current\?\.focus\(\{ preventScroll: true \}\)/
    )
  })

  it("keeps focus inside the dialog when its view changes or a retry ends", () => {
    const at = host.indexOf("const tryAgainButtonRef = useRef")
    const effect = host.slice(
      at,
      host.indexOf("const cancelLocationDetection", at)
    )
    assert.ok(
      effect.includes("tryAgainButtonRef.current?.focus({ preventScroll: true })")
    )
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

  it("the closed-prompt sentence no longer says the request was closed without an answer", () => {
    assert.ok(!host.includes("closed without an answer"))
    const map = host.slice(
      host.indexOf("const LOCATION_FAILURE_COPY"),
      host.indexOf("function LocationHowTo()")
    )
    assert.ok(
      map.includes(
        '"Select Try Again and choose Allow when your browser asks."'
      )
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

describe("the instructions view: browser steps first, then Mac / Windows tabs", () => {
  const howTo = () =>
    host.slice(
      host.indexOf("function LocationHowTo()"),
      host.indexOf("export function IdentityVerificationHostProvider")
    )
  const tabsSource = read("components", "ui", "tabs", "tabs.tsx")

  it("shows the browser steps first and the device tabs after them", () => {
    const h = howTo()
    assert.ok(h.indexOf("instructions.browserSteps.map") > -1)
    assert.ok(
      h.indexOf("instructions.browserSteps.map") <
        h.indexOf("instructions.deviceSections.map")
    )
    assert.ok(h.indexOf("<Tabs") > h.indexOf("instructions.browserSteps.map"))
  })

  it("has no visible 'Steps for <browser>' line under the title (kept only as a screen-reader description)", () => {
    const h = howTo()
    const at = h.indexOf("Steps for")
    assert.ok(at > -1)
    const tag = h.slice(h.lastIndexOf("<DialogDescription", at), at)
    assert.ok(tag.includes('className="sr-only"'))
    assert.equal(h.split("Steps for").length - 1, 1)
  })

  it("uses the shared Tabs, TabsList, TabsTrigger and TabsContent, two equal-width tabs", () => {
    const h = howTo()
    for (const part of ["<Tabs", "<TabsList", "<TabsTrigger", "<TabsContent"]) {
      assert.ok(h.includes(part), part)
    }
    assert.match(
      host,
      /import \{[^}]*\bTabs,\s*TabsContent,\s*TabsList,\s*TabsTrigger,?[^}]*\} from "@\/components\/ui"/
    )
    assert.ok(h.includes("grid grid-cols-2"))
    assert.ok(!/<button/.test(h), "no raw <button>")
  })

  it("has no nested 'Show me how' buttons and no expand / collapse behaviour", () => {
    const h = howTo()
    assert.ok(!h.includes("Show me how"))
    for (const gone of [
      "aria-expanded",
      "aria-controls",
      "hidden={",
      "ChevronDown",
      "nextOpenDeviceSection",
      "useId",
      "<Button",
    ]) {
      assert.ok(!h.includes(gone), gone)
    }
    assert.ok(!/useState<DeviceSectionId \| null>/.test(h))
  })

  it("selects the tab immediately (no fade / slide) and the choice is controlled state", () => {
    const h = howTo()
    const tabs = h.slice(h.indexOf("<Tabs"), h.indexOf("<TabsList"))
    assert.match(tabs, /\n\s+unanimated\s*\n/)
    assert.ok(h.includes("value={deviceTab}"))
    assert.match(
      h,
      /onValueChange=\{\(value\) =>\s*setDeviceTab\(value as DeviceSectionId\)\s*\}/
    )
  })

  it("starts on the user's operating system, read when the view mounts (after the Show me how press), falling back to Mac", () => {
    const h = howTo()
    assert.ok(
      h.includes(
        "useState<DeviceSectionId>(() =>\n    detectDeviceSection(currentBrowserEnvironment())"
      )
    )
    // never at module level / during the server render of the closed page
    assert.ok(!/detectDeviceSection|navigator|userAgent/.test(host.slice(0, host.indexOf("function LocationHowTo()")).replace(/\/\/.*$/gm, "").replace(/import[\s\S]*?from "[^"]*"/g, "")))
    // the view only mounts from the main view's Show me how press
    assert.ok(dialogSource().includes('locationRecoveryState.view === "main" ? ('))
    assert.ok(dialogSource().includes("<LocationHowTo />"))
  })

  it("both tabs are always rendered, each with an 18px icon that inherits the tab colour, from the existing icon package", () => {
    const h = howTo()
    assert.ok(h.includes("instructions.deviceSections.map"))
    assert.match(host, /import \{ MicrosoftBrand \} from "@blend-metrics\/icons\/brands"/)
    assert.match(host, /import \{ AppleSolid \} from "@blend-metrics\/icons\/social-solid"/)
    const icons = host.slice(
      host.indexOf("const DEVICE_TAB_ICONS"),
      host.indexOf("// The decorative picture above the steps")
    )
    assert.equal(icons.split("size-[18px]").length - 1, 2)
    // no colour of their own: they take the tab's (gray when inactive, blue when selected)
    assert.ok(!/text-(gray|primary|dark)|fill-(gray|primary)|stroke-/.test(icons))
    assert.equal(icons.split('aria-hidden="true"').length - 1, 2)
    assert.ok(icons.includes("[&_path]:fill-current")) // the Microsoft mark ships in four colours
    assert.ok(!/<svg/.test(icons), "no custom SVG")
  })

  it("the selected tab's text AND icon are blue and the others gray, both coming from the shared trigger colour", () => {
    // the shared trigger is gray-500, and primary-500 when selected; the icons add no colour of their own
    assert.match(
      tabsSource,
      /text-gray-500[^"]*data-\[state=active\]:text-primary-500/
    )
    const icons = host.slice(
      host.indexOf("const DEVICE_TAB_ICONS"),
      host.indexOf("// The decorative picture above the steps")
    )
    assert.ok(!/text-|fill-(?!current)/.test(icons.replace("[&_path]:fill-current", "")))
    assert.ok(icons.includes("[&_path]:fill-current")) // the Microsoft mark's four fixed colours follow the trigger
    // the trigger itself keeps no colour override
    const tab = howTo().slice(howTo().indexOf("<TabsTrigger"), howTo().indexOf("</TabsTrigger>"))
    assert.ok(!/\btext-(gray|primary)/.test(tab))
  })

  it("keeps a visible keyboard focus ring on the tabs and on each panel (the shared Tabs have none of their own)", () => {
    const h = howTo()
    assert.ok(h.includes("focus-visible:ring-4 focus-visible:ring-primary-100"))
    // the panel is focusable (Tab moves from the active tab into it): local, keyboard-only ring
    const panel = h.slice(h.indexOf("<TabsContent"), h.indexOf("<ol", h.indexOf("<TabsContent")))
    const cls = panel.match(/className="([^"]*)"/)?.[1].split(" ") ?? []
    for (const token of [
      "focus-visible:outline-none",
      "focus-visible:ring-4",
      "focus-visible:ring-primary-100",
    ]) {
      assert.ok(cls.includes(token), token)
    }
    assert.ok(!cls.some((c) => /^(focus:|ring-\d|ring$)/.test(c)), "never shown for mouse focus")
    assert.equal(h.split("<TabsContent").length - 1, 1) // one definition, rendered for both OS panels
    // arrow-key navigation, Home / End and selection come from the shared Tabs (Radix)
    assert.ok(tabsSource.includes('from "@radix-ui/react-tabs"'))
  })

  it("does not touch the shared Tabs or Button components", () => {
    assert.ok(!howTo().includes("components/ui/tabs"))
    assert.ok(tabsSource.includes("export { Tabs, TabsList, TabsTrigger, TabsContent"))
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

describe("the decorative illustration in the instructions view", () => {
  const illustration = () =>
    host.slice(
      host.indexOf("const ILLUSTRATION_ICONS"),
      host.indexOf("function LocationHowTo()")
    )
  const howTo = () =>
    host.slice(
      host.indexOf("function LocationHowTo()"),
      host.indexOf("export function IdentityVerificationHostProvider")
    )

  it("is aria-hidden decoration: nothing in it can take focus and it carries no accessible name", () => {
    const i = illustration()
    assert.ok(i.includes('aria-hidden="true"'))
    assert.ok(!/<button|<a[ >]|<input|tabIndex|role=|aria-label/.test(i))
    assert.ok(!/<Button|<IconButton/.test(i))
  })

  it("is drawn in code: no image, video, GIF, custom SVG or remote asset", () => {
    const i = illustration().replace(/\/\/.*$/gm, "")
    assert.ok(!/<img|<svg|<video|<picture|<canvas|<source|<Image[ >]/.test(i))
    assert.ok(!/https?:\/\/|url\(|\.(png|jpe?g|gif|webp|svg|mp4|webm)\b/i.test(i))
  })

  it("uses the repository's icons: Sliders04 for Chrome's tune icon (the closest of Sliders01-04), Lock01 and MarkerPin01", () => {
    const i = illustration()
    assert.match(host, /import \{[^}]*\bSliders04\b[^}]*\} from "@blend-metrics\/icons"/)
    assert.ok(i.includes("<Sliders04"))
    assert.ok(i.includes("<Lock01"))
    assert.ok(i.includes("<MarkerPin01"))
    assert.ok(!/Sliders0[123]\b/.test(host))
  })

  it("sits above the numbered text, which stays the real (not hidden) instruction", () => {
    const h = howTo()
    assert.ok(
      h.indexOf("<LocationHowToIllustration") < h.indexOf("instructions.browserSteps.map")
    )
    assert.ok(h.includes("steps={instructions.illustration}"))
    const list = h.slice(h.indexOf("<ol"), h.indexOf("</ol>"))
    assert.ok(!list.includes("aria-hidden"))
  })

  it("one tile per step: two columns on a phone, four (or three) from 480px", () => {
    const i = illustration()
    assert.ok(
      i.includes(
        'steps.length === 4 ? "grid-cols-2 min-[480px]:grid-cols-4" : "grid-cols-2 min-[480px]:grid-cols-3"'
      )
    )
    assert.ok(i.includes("steps.map((step, index)"))
    assert.ok(i.includes("{index + 1}"))
  })

  it("has no compact-only rules: no breakpoint-dependent sizing, spacing or hidden captions (the dialog scrolls instead)", () => {
    const i = illustration()
    assert.ok(!/\b(sm|md|lg|xl):/.test(i))
    assert.ok(!/\bhidden\b/.test(i.replace(/aria-hidden/g, "")))
    // captions and the pills' words are always shown, at their normal size
    assert.ok(i.includes('<p className="mt-1 truncate text-center text-[11px]'))
    assert.ok(i.includes("Allow\n"))
    assert.ok(i.includes("Try Again\n"))
    assert.ok(!/text-\[(8|9)px\]/.test(i))
    // the steps and the tabs keep their normal spacing too
    const h = host.slice(
      host.indexOf("function LocationHowTo()"),
      host.indexOf("export function IdentityVerificationHostProvider")
    )
    assert.ok(!/\b(sm|md):/.test(h))
  })

  it("uses light-gray strokes and the dialog's restrained primary highlight (design tokens only)", () => {
    const i = illustration()
    assert.ok(i.includes("border-gray-200"))
    assert.ok(i.includes("bg-primary-50"))
    assert.ok(i.includes("text-primary-500"))
    assert.ok(i.includes("ring-primary-100"))
    assert.ok(!/#[0-9a-fA-F]{3,8}\b|rgb\(/.test(i), "no raw colours")
  })

  it("the footer has the same spacing in both views (no mobile-only gap)", () => {
    const d = dialogSource()
    assert.ok(d.includes('<div className="mt-[50px] flex justify-center items-center gap-x-3">'))
    assert.ok(!/mt-4 md:mt-\[50px\]/.test(d))
  })
})

describe("the footer buttons (documented shared Button pattern)", () => {
  const footer = () => {
    const d = dialogSource()
    return d.slice(d.indexOf('<div className="mt-[50px] flex justify-center'))
  }
  const backButton = () => {
    const f = footer()
    return f.slice(f.indexOf("<Button"), f.indexOf("</Button>"))
  }

  it("Cancel / Back is a gray outlined md Button with nothing but the focus ring added", () => {
    const b = backButton()
    assert.ok(b.includes('variant="outlined"'))
    assert.ok(b.includes('visual="gray"'))
    assert.ok(b.includes('size="md"'))
    assert.equal(
      b.match(/className="([^"]*)"/)?.[1],
      "focus-visible:ring-4 focus-visible:ring-primary-100"
    )
    assert.ok(!/bg-white|w-\[/.test(b))
  })

  it("Back shows the documented left arrow through the Button's leftIcon (never as a child), Cancel shows none", () => {
    const b = backButton()
    assert.ok(b.includes('<ArrowLeft className="size-[15px]" />'))
    assert.match(b, /leftIcon=\{\s*locationRecoveryState\.view === "howto" \? \(\s*<ArrowLeft className="size-\[15px\]" \/>\s*\) : undefined\s*\}/)
    const children = b.slice(b.indexOf("\n            >") + 1)
    assert.ok(!children.includes("ArrowLeft"))
    assert.match(host, /import \{[^}]*\bArrowLeft\b[^}]*\} from "@blend-metrics\/icons"/)
    assert.equal(backButton().split("ArrowLeft").length - 1, 1) // in the leftIcon only
  })

  it("the 'Show me how' link is the plain link Button (no size or weight overrides)", () => {
    const d = dialogSource()
    const at = d.indexOf('variant="link"')
    const tag = d.slice(d.lastIndexOf("<Button", at), at + 40)
    assert.ok(tag.includes('className="focus-visible:ring-4 focus-visible:ring-primary-100"'))
    assert.ok(!/h-auto|p-0|text-sm|font-semibold/.test(tag))
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
