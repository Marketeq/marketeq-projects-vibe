"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, HelpCircle, X } from "@blend-metrics/icons"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  IconButton,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from "@/components/ui"
import { AccountVerificationGate } from "@/components/account-verification-gate"
import { getDesktopDownloadBaseUrl } from "@/lib/runtime-urls"
import {
  getDesktopLaunchStatus,
  getHasDesktopDevice,
} from "@/service/http/desktop-launch"
import { checkTimeTrackerDownload } from "@/service/http/time-tracker-download"
import { downloadBlockFor } from "@/src/lib/api/time-tracker-download"
import { cn } from "@/utils/functions"

// Shared by /time-tracking and /earnings so both Log Time buttons behave the
// same: open the installed desktop tracker, else offer its installer.

// ─── Download Desktop Tracker Dialog ───────────────────────────────────
// Spec references:
//   doc 29 — Build, Packaging & Code Signing (productName, artifactName, arch)
//   doc 30 — Auto-Update & Release Channels  (GitHub releases feed)
//   doc 41 — In-App Help, Empty States & Onboarding Copy

// Stable download URLs. The underlying repo is a dedicated release-only repo
// (Marketeq/desktop-time-tracker) so the main codebase stays private while
// /releases/latest/download/<file> remains publicly downloadable.
//
// Filenames are intentionally versionless so these URLs never break across
// version bumps — GitHub redirects `/releases/latest/download/<file>` to the
// current release asset. This is the same pattern Obsidian, Standard Notes,
// and Linear use.
//
// electron-builder artifactName in desktop/electron-builder.yml MUST stay in
// sync with these filenames (doc 29 §1.1).
const DTT_RELEASES_BASE = getDesktopDownloadBaseUrl()

type DesktopPlatform = "mac-arm64" | "mac-x64" | "win-x64" | "win-arm64"

interface PlatformOption {
  value: DesktopPlatform
  os: "mac" | "windows"
  label: string
  fileName: string
  fileSize: string
  downloadUrl: string
  available: boolean
}

const platformOptions: Record<DesktopPlatform, PlatformOption> = {
  "mac-arm64": {
    value: "mac-arm64",
    os: "mac",
    label: "macOS — Apple Silicon (M1/M2/M3)",
    fileName: "Marketeq-mac-arm64.dmg",
    fileSize: "102 MB",
    downloadUrl: `${DTT_RELEASES_BASE}/Marketeq-mac-arm64.dmg`,
    available: true,
  },
  "mac-x64": {
    value: "mac-x64",
    os: "mac",
    label: "macOS — Intel",
    fileName: "Marketeq-mac-x64.dmg",
    fileSize: "107 MB",
    downloadUrl: `${DTT_RELEASES_BASE}/Marketeq-mac-x64.dmg`,
    available: true,
  },
  "win-x64": {
    value: "win-x64",
    os: "windows",
    label: "Windows 10/11 — 64-bit",
    fileName: "Marketeq-Setup-win-x64.exe",
    fileSize: "~97 MB",
    downloadUrl: `${DTT_RELEASES_BASE}/Marketeq-Setup-win-x64.exe`,
    available: true,
  },
  "win-arm64": {
    value: "win-arm64",
    os: "windows",
    label: "Windows 10/11 — ARM64",
    fileName: "Marketeq-Setup-win-arm64.exe",
    fileSize: "~94 MB",
    downloadUrl: `${DTT_RELEASES_BASE}/Marketeq-Setup-win-arm64.exe`,
    available: true,
  },
}

const DESKTOP_DEEP_LINK = "marketeq://open"
// How long Log Time keeps its loading state waiting for the tracker to
// acknowledge — covers a cold start and a user answering Chrome's
// "Open Marketeq?" prompt.
const DESKTOP_OPEN_MAX_WAIT_MS = 20000
const DESKTOP_OPEN_POLL_MS = 150
// The install check runs inside the click, before the marketeq:// link is
// fired; capped well inside the browser's user-activation window so the link
// is still allowed to launch the app.
const DESKTOP_CHECK_TIMEOUT_MS = 1500

// Last known answer, fetched when the page loads and when the tab regains
// focus, so a click rarely has to wait. null = unknown (request failed).
let hasDesktopDevice: boolean | null = null
async function checkHasDesktopDevice(): Promise<boolean | null> {
  try {
    hasDesktopDevice = (await getHasDesktopDevice()).hasDevice
  } catch {
    // Keep the last known answer.
  }
  return hasDesktopDevice
}
export function warmDesktopDeviceCheck(): void {
  void checkHasDesktopDevice()
}

// BTB-325: Log Time either opens the installed desktop tracker or offers its
// installer — never both. Browsers don't expose installed apps, so the
// tracker records itself against the user once signed in, and that decides
// which one happens:
//   - the user has the tracker → only the marketeq:// link is fired (Chrome
//     asks "Open Marketeq?"); the installer is never offered;
//   - the user doesn't → only `onNotYetOpened` runs (the caller offers the
//     installer); the link isn't fired.
// The link carries a random launch id that the tracker acknowledges to
// time-tracking-service; the promise resolves true once it does, so the
// caller can stop its loading state.
export async function openDesktopTracker(
  onNotYetOpened: () => void
): Promise<boolean> {
  const hasDevice = await Promise.race([
    checkHasDesktopDevice(),
    new Promise<boolean | null>((r) =>
      window.setTimeout(() => r(hasDesktopDevice), DESKTOP_CHECK_TIMEOUT_MS)
    ),
  ])
  if (hasDevice === false) {
    onNotYetOpened()
    return false
  }

  const launchId = crypto.randomUUID()
  window.location.href = `${DESKTOP_DEEP_LINK}?launch=${launchId}`
  const start = Date.now()
  while (Date.now() - start < DESKTOP_OPEN_MAX_WAIT_MS) {
    await new Promise((r) => window.setTimeout(r, DESKTOP_OPEN_POLL_MS))
    try {
      if ((await getDesktopLaunchStatus(launchId)).opened) return true
    } catch {
      // A failed poll isn't a "no" — keep trying until the deadline.
    }
  }
  return false
}

function detectPlatform(): DesktopPlatform {
  if (typeof window === "undefined") return "mac-arm64"
  const ua = window.navigator.userAgent.toLowerCase()
  const platform = (window.navigator.platform || "").toLowerCase()
  const isMac = platform.includes("mac") || ua.includes("mac os")
  const isWin = platform.includes("win") || ua.includes("windows")
  const isArm = ua.includes("arm") || ua.includes("aarch64")

  if (isMac) {
    // Safari/Chrome on Apple Silicon reports "MacIntel" — use max touch points
    // and available heuristics as a best effort. Default to Apple Silicon
    // (majority of new Macs).
    const isAppleSilicon =
      isArm ||
      (typeof navigator !== "undefined" &&
        (navigator as Navigator & { userAgentData?: { platform?: string } })
          .userAgentData?.platform === "macOS")
    return isAppleSilicon ? "mac-arm64" : "mac-x64"
  }
  if (isWin) return isArm ? "win-arm64" : "win-x64"
  return "mac-arm64"
}

export function DownloadDesktopTrackerDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const [platform, setPlatform] = useState<DesktopPlatform>("mac-arm64")
  const [downloadStarted, setDownloadStarted] = useState(false)
  const [verificationBlock, setVerificationBlock] = useState<
    "verification_required" | "verification_unavailable" | null
  >(null)
  const router = useRouter()

  const selected = platformOptions[platform]
  const isMac = selected.os === "mac"

  // Mounted (closed) with the Log Time button, so the install check is ready
  // before the first click.
  // Re-checked when the tab regains focus, e.g. after signing in to the
  // tracker in another window.
  useEffect(() => {
    warmDesktopDeviceCheck()
    window.addEventListener("focus", warmDesktopDeviceCheck)
    return () => window.removeEventListener("focus", warmDesktopDeviceCheck)
  }, [])

  // Detect platform when dialog opens (reset + auto-trigger)
  useEffect(() => {
    if (open) {
      setPlatform(detectPlatform())
      setDownloadStarted(false)
      setVerificationBlock(null)
    }
  }, [open])

  // G8: the backend's identity gate is asked before every download, from the
  // Download button and from the "click here" retry alike. Only an allowed
  // answer continues to the release URL; a block opens the existing
  // AccountVerificationGate popup instead and nothing is downloaded.
  const triggerDownload = async () => {
    try {
      await checkTimeTrackerDownload()
    } catch (err) {
      const block = downloadBlockFor(err)
      if (block) {
        setVerificationBlock(block)
        return
      }
      toast({
        title: "Download failed",
        description: "Please try again.",
        variant: "destructive",
      })
      return
    }
    const a = document.createElement("a")
    a.href = selected.downloadUrl
    a.download = selected.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setDownloadStarted(true)
    toast({
      title: "Download started",
      description: `${selected.fileName} is downloading to your Downloads folder.`,
    })
  }

  // BTB-325: the dialog only offers the installer — the download starts when
  // the user clicks Download, never on open.

  const otherOsPlatform: DesktopPlatform = isMac ? "win-x64" : "mac-arm64"

  // "Verify My Account" in the existing popup continues on the talent dashboard,
  // where the existing verification banner starts verification.
  const goVerify = () => {
    setVerificationBlock(null)
    onOpenChange(false)
    router.push("/talent-dashboard")
  }

  return (
    <>
    <AccountVerificationGate
      open={open && verificationBlock !== null}
      reason={verificationBlock === "verification_unavailable" ? "status_unavailable" : "unstarted"}
      connectionCheckState="idle"
      onVerify={goVerify}
      onRetryConnectionCheck={goVerify}
      onDismissConnectionError={() => setVerificationBlock(null)}
    />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-lg bg-primary-50 flex items-center justify-center flex-none">
              <Download className="size-5 text-primary-500" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-dark-blue-400">
                Download Marketeq Time Tracker
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Track your time, stay in sync, get paid.
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <IconButton variant="ghost" visual="gray" size="sm">
              <X className="size-4" />
            </IconButton>
          </DialogClose>
        </div>

        <div className="px-6 pb-6 space-y-5">
          <p className="text-xs text-gray-600 leading-5">
            Marketeq Time Tracker helps you log billable hours, capture
            activity, and keep disputes to a minimum. Set up takes about 2
            minutes.
          </p>

          {/* Platform selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-500">
              Platform <span className="text-gray-400">(auto-detected)</span>
            </Label>
            <Select
              value={platform}
              onValueChange={(v) => setPlatform(v as DesktopPlatform)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mac-arm64">
                  macOS — Apple Silicon (M1/M2/M3) (coming soon)
                </SelectItem>
                <SelectItem value="mac-x64">macOS — Intel (coming soon)</SelectItem>
                <SelectItem value="win-x64">Windows 10/11 — 64-bit</SelectItem>
                <SelectItem value="win-arm64">Windows 10/11 — ARM64</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File card */}
          <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-gray-25">
            <div
              className={cn(
                "size-12 rounded-lg flex items-center justify-center flex-none text-white font-bold",
                isMac ? "bg-gray-900" : "bg-primary-500"
              )}
            >
              {isMac ? "" : "⊞"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-dark-blue-400 truncate">
                {selected.fileName}
              </div>
              <div className="text-xs text-gray-500">
                {selected.fileSize} Stable channel
              </div>
            </div>
            <Button
              size="sm"
              leftIcon={<Download className="size-4" />}
              onClick={triggerDownload}
            >
              Download
            </Button>
          </div>

          {/* Download started notice */}
          {downloadStarted && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary-50 border border-primary-100 animate-in fade-in slide-in-from-top-1 duration-200">
              <HelpCircle className="size-4 text-primary-500 flex-none mt-0.5" />
              <p className="text-xs text-primary-700 leading-5">
                Your download should begin automatically. If it didn&apos;t
                start,{" "}
                <Button
                  variant="link"
                  visual="primary"
                  size="sm"
                  className="inline p-0 h-auto font-semibold underline"
                  onClick={triggerDownload}
                >
                  click here
                </Button>
                .
              </p>
            </div>
          )}

          {/* Next steps (spec: doc 41 Welcome + doc 40 §Install) */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Next steps</p>
            <ol className="space-y-2">
              {(isMac
                ? [
                    "Open the downloaded .dmg file",
                    'Drag "Marketeq Time Tracker" into your Applications folder',
                    "Launch the app and sign in with your Marketeq account",
                    "Grant Screen Recording, Accessibility, and Notification permissions when prompted",
                  ]
                : [
                    "Open the downloaded .exe installer",
                    'Follow the setup wizard and click "Install"',
                    "Launch the app and sign in with your Marketeq account",
                    "Allow the tracker through Windows Firewall and SmartScreen if prompted",
                  ]
              ).map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="size-5 rounded-full bg-primary-50 text-primary-600 text-[11px] font-semibold flex items-center justify-center flex-none mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-xs text-gray-600 leading-5">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-25">
          <Button
            variant="link"
            visual="primary"
            size="sm"
            className="p-0 h-auto text-xs font-medium"
            onClick={() => setPlatform(otherOsPlatform)}
          >
            Need the {isMac ? "Windows" : "macOS"} version?
          </Button>
          <DialogClose asChild>
            <Button variant="outlined" visual="gray" size="sm">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
