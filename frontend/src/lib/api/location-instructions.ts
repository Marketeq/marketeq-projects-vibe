// frontend/src/lib/api/location-instructions.ts
//
// Step-by-step instructions for turning location on again, for the "Turn on location
// to continue" dialog's "Show me how" view. A web page cannot open the browser's
// settings or its site-permission panel (chrome:// links are blocked, and there is no
// API for it), so the user is told where to click instead.
//
// Pure functions of a user-agent string and a platform: no DOM, no network, fully
// testable. The browser is a best guess from the user agent; anything unrecognised gets
// generic steps.

export type BrowserKind = "chrome" | "edge" | "safari" | "firefox" | "other"
export type PlatformKind = "mac" | "windows" | "other"

export interface BrowserEnvironment {
  userAgent?: string
  /** navigator.userAgentData?.platform, else navigator.platform. */
  platform?: string
}

export interface LocationInstructions {
  browser: BrowserKind
  platform: PlatformKind
  browserName: string
  /** Steps in the browser's own site controls. */
  browserSteps: string[]
  /** Heading for the device-level (Location Services) section. */
  deviceHeading: string
  /** Steps for the operating system's Location Services. */
  deviceSteps: string[]
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

export function detectPlatform(env: BrowserEnvironment): PlatformKind {
  const text = `${env.platform ?? ""} ${env.userAgent ?? ""}`
  // iPhone/iPad user agents also contain "Mac OS X": they are not a Mac.
  if (/iPhone|iPad|iPod|Android/i.test(text)) return "other"
  if (/Mac/i.test(text)) return "mac"
  if (/Win/i.test(text)) return "windows"
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

function deviceStepsFor(
  platform: PlatformKind,
  browserName: string
): { heading: string; steps: string[] } {
  if (platform === "mac") {
    return {
      heading: "Still not working? Check Location Services on your Mac",
      steps: [
        "Open System Settings → Privacy & Security → Location Services.",
        `Turn on Location Services, then turn on the switch for ${browserName}.`,
        TRY_AGAIN_STEP,
      ],
    }
  }
  if (platform === "windows") {
    return {
      heading: "Still not working? Check Location services in Windows",
      steps: [
        "Open Settings → Privacy & security → Location.",
        `Turn on Location services, and allow desktop apps (including ${browserName}) to use your location.`,
        TRY_AGAIN_STEP,
      ],
    }
  }
  return {
    heading: "Still not working? Check your device's location settings",
    steps: [
      `Open your device settings and make sure location is turned on and allowed for ${browserName}.`,
      TRY_AGAIN_STEP,
    ],
  }
}

export function getLocationInstructions(
  env: BrowserEnvironment
): LocationInstructions {
  const browser = detectBrowser(env)
  const platform = detectPlatform(env)
  const browserName = browserDisplayName(browser)
  const device = deviceStepsFor(platform, browserName)
  return {
    browser,
    platform,
    browserName,
    browserSteps: browserStepsFor(browser),
    deviceHeading: device.heading,
    deviceSteps: device.steps,
  }
}

/** The running browser's environment (empty on the server). */
export function currentBrowserEnvironment(): BrowserEnvironment {
  if (typeof navigator === "undefined") return {}
  const withData = navigator as Navigator & {
    userAgentData?: { platform?: string }
  }
  return {
    userAgent: navigator.userAgent,
    platform: withData.userAgentData?.platform || navigator.platform,
  }
}
