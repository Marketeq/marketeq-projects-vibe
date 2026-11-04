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

export interface LocationInstructions {
  browser: BrowserKind
  browserName: string
  /** Steps in the browser's own site controls (always shown first). */
  browserSteps: string[]
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
        "Next to Location, choose Allow.",
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
    deviceHeading: DEVICE_HEADING,
    deviceSections: deviceSectionsFor(browserName),
  }
}

/** The running browser's environment (empty on the server). */
export function currentBrowserEnvironment(): BrowserEnvironment {
  if (typeof navigator === "undefined") return {}
  return { userAgent: navigator.userAgent }
}
