// frontend/src/lib/api/location-instructions.ts
//
// Step-by-step instructions for turning location on again, for the "Turn on location
// to continue" dialog's "Show me how" view. A web page cannot open the browser's
// settings or its site-permission panel (chrome:// links are blocked, and there is no
// API for it), so the user is told where to click instead.
//
// Pure functions of a user-agent string and a platform: no DOM, no network, fully
// testable. The browser is a best guess from the user agent; anything unrecognised gets
// generic steps. The operating-system (Location Services) help is offered for both a Mac and
// Windows, always: the user agent only picks which of the two tabs is selected first, and
// the other stays one click away.

export type BrowserKind = "chrome" | "edge" | "safari" | "firefox" | "other"

export interface BrowserEnvironment {
  userAgent?: string
}

export type DeviceSectionId = "mac" | "windows"

export interface DeviceSection {
  id: DeviceSectionId
  /** The tab's label: "Mac" or "Windows". */
  label: string
  /** The Location Services steps shown when this tab is selected. */
  steps: string[]
}

/**
 * One panel of the decorative illustration above the steps. The illustration has exactly one
 * panel per browser step, in the same order, so the numbers on it match the numbered text.
 * It is decoration only: the numbered text is the instruction.
 */
export type IllustrationScene =
  | "address-bar" // the address bar with the browser's site / permissions icon highlighted
  | "site-menu" // the opened site panel with one row highlighted
  | "menu-bar" // Safari's menu bar with Safari -> Settings highlighted
  | "settings-tab" // Safari's Settings window with the Websites tab highlighted
  | "clear-block" // Firefox's permissions panel with the blocked Location cleared
  | "location-allow" // Location set to the lasting Allow option (never "Allow this time")
  | "try-again" // back on Marketeq, selecting Try Again

/** Which of the repository's icons the highlighted control uses. */
export type IllustrationIcon = "tune" | "lock" | "pin" | "none"

export interface IllustrationStep {
  scene: IllustrationScene
  icon: IllustrationIcon
  /** The short caption under the panel (shown from the small breakpoint up). */
  caption: string
}

export interface LocationInstructions {
  browser: BrowserKind
  browserName: string
  /** Steps in the browser's own site controls (always shown first). */
  browserSteps: string[]
  /** The decorative panels that go with browserSteps, one each, in order. */
  illustration: IllustrationStep[]
  /** The lead-in above the Mac / Windows tabs. */
  deviceHeading: string
  /** Both operating systems' Location Services help: one tab each, always offered. */
  deviceSections: [DeviceSection, DeviceSection]
}

export function detectBrowser(env: BrowserEnvironment): BrowserKind {
  const ua = env.userAgent ?? ""
  if (/Edg(e|A|iOS)?\//.test(ua)) return "edge"
  if (/Firefox\/|FxiOS\//.test(ua)) return "firefox"
  if (/OPR\/|Opera/.test(ua)) return "other"
  if (/Chrome\/|Chromium\/|CriOS\//.test(ua)) return "chrome"
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return "safari"
  return "other"
}

const BROWSER_NAMES: Record<BrowserKind, string> = {
  chrome: "Chrome",
  edge: "Edge",
  safari: "Safari",
  firefox: "Firefox",
  other: "your browser",
}

export function browserDisplayName(browser: BrowserKind): string {
  return BROWSER_NAMES[browser]
}

const TRY_AGAIN_STEP = "Come back to this page and select Try Again."

function browserStepsFor(browser: BrowserKind): string[] {
  switch (browser) {
    case "chrome":
      return [
        "Select the site controls icon at the left of the address bar (the lock or tune icon).",
        "Select Site settings.",
        "For Location, choose Allow. Do not choose Allow this time.",
        TRY_AGAIN_STEP,
      ]
    case "edge":
      return [
        "Select the site controls icon at the left of the address bar (the lock icon).",
        "Select Permissions for this site.",
        "Next to Location, choose Allow.",
        TRY_AGAIN_STEP,
      ]
    case "safari":
      return [
        "In the menu bar, choose Safari → Settings.",
        "Open the Websites tab, then choose Location in the sidebar.",
        "Find this website in the list and set it to Allow.",
        TRY_AGAIN_STEP,
      ]
    case "firefox":
      return [
        "Select the permissions icon beside the address bar.",
        "Next to Location, clear the blocked setting (select the X).",
        "Select Try Again, then choose Allow when Firefox asks to share your location.",
      ]
    default:
      return [
        "Open this website's site settings in your browser (usually an icon at the left of the address bar).",
        "Set Location to Allow, or clear a blocked Location setting.",
        TRY_AGAIN_STEP,
      ]
  }
}

const TRY_AGAIN_PANEL: IllustrationStep = {
  scene: "try-again",
  icon: "none",
  caption: "Try Again",
}

const ALLOW_PANEL: IllustrationStep = {
  scene: "location-allow",
  icon: "pin",
  caption: "Allow",
}

/**
 * The browser's own words and controls, so nothing Chrome-specific is shown for another
 * browser: Chrome's "tune" icon is Chrome's alone (Edge and generic browsers show a lock,
 * Safari has no address-bar icon in these steps, Firefox's is its permissions icon).
 * Each list has the same length as the browser's steps.
 */
function illustrationFor(browser: BrowserKind): IllustrationStep[] {
  switch (browser) {
    case "chrome":
      return [
        { scene: "address-bar", icon: "tune", caption: "Site controls" },
        { scene: "site-menu", icon: "none", caption: "Site settings" },
        ALLOW_PANEL,
        TRY_AGAIN_PANEL,
      ]
    case "edge":
      return [
        { scene: "address-bar", icon: "lock", caption: "Site info" },
        { scene: "site-menu", icon: "none", caption: "Permissions" },
        ALLOW_PANEL,
        TRY_AGAIN_PANEL,
      ]
    case "safari":
      return [
        { scene: "menu-bar", icon: "none", caption: "Safari menu" },
        { scene: "settings-tab", icon: "none", caption: "Websites" },
        ALLOW_PANEL,
        TRY_AGAIN_PANEL,
      ]
    case "firefox":
      return [
        { scene: "address-bar", icon: "pin", caption: "Permissions" },
        { scene: "clear-block", icon: "pin", caption: "Clear block" },
        TRY_AGAIN_PANEL,
      ]
    default:
      return [
        { scene: "address-bar", icon: "lock", caption: "Site settings" },
        ALLOW_PANEL,
        TRY_AGAIN_PANEL,
      ]
  }
}

function deviceSectionsFor(browserName: string): [DeviceSection, DeviceSection] {
  return [
    {
      id: "mac",
      label: "Mac",
      steps: [
        "Open System Settings → Privacy & Security → Location Services.",
        `Turn on Location Services, then turn on the switch for ${browserName}.`,
        TRY_AGAIN_STEP,
      ],
    },
    {
      id: "windows",
      label: "Windows",
      steps: [
        "Open Settings → Privacy & security → Location.",
        `Turn on Location services, and allow desktop apps (including ${browserName}) to use your location.`,
        TRY_AGAIN_STEP,
      ],
    },
  ]
}

export const DEVICE_HEADING = "Still not working? Check Location Services"

/**
 * Which operating-system tab is selected first: Windows for a Windows user agent, otherwise
 * Mac (including when the user agent is missing or unrecognised). Both tabs are always
 * available; this only chooses the starting one. Call it from the click that opens the
 * instructions, never while rendering on the server.
 */
export function detectDeviceSection(env: BrowserEnvironment): DeviceSectionId {
  return /Windows/i.test(env.userAgent ?? "") ? "windows" : "mac"
}

export function getLocationInstructions(
  env: BrowserEnvironment
): LocationInstructions {
  const browser = detectBrowser(env)
  const browserName = browserDisplayName(browser)
  return {
    browser,
    browserName,
    browserSteps: browserStepsFor(browser),
    illustration: illustrationFor(browser),
    deviceHeading: DEVICE_HEADING,
    deviceSections: deviceSectionsFor(browserName),
  }
}

/** The running browser's environment (empty on the server). */
export function currentBrowserEnvironment(): BrowserEnvironment {
  if (typeof navigator === "undefined") return {}
  return { userAgent: navigator.userAgent }
}
