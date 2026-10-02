"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, resolveDashboardRole } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { ROLE } from "@/types/user"
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  RefreshCw,
  X,
} from "@blend-metrics/icons"
import SecuritySettingsStepper from "@/components/security-settings"
import {
  checkVpnProxy,
  type VpnProxyDetectionOutcome,
} from "@/src/lib/api/vpn-proxy-detection"
import {
  checkIdentityVerificationStatus,
  checkVerificationSummary,
  clearAwaitingResult,
  gateReasonForStatus,
  hasAwaitingResult,
  IDENTITY_STATUS_REFRESHED_EVENT,
  isIdentityAndLocationVerified,
  RESULT_POLL_INTERVAL_MS,
  RESULT_POLL_MAX_ATTEMPTS,
} from "@/src/lib/api/identity-verification-status"
import {
  getDetectedLocation,
  type DetectedLocation,
} from "@/src/lib/api/detected-location"
import { IdentityVerificationFlow } from "@/components/identity-verification-flow"
import {
  AccountVerificationGate,
  type AccountVerificationGateReason,
  type ConnectionCheckState,
} from "@/components/account-verification-gate"
import {
  BecomeTopSeller,
  Carousel,
  CreateYourOwnProject,
  Footer,
  LeftSidebar,
  RecentListings,
  RecommendedForYou,
  RightDrawer,
  RightSidebar,
  TakeCareersToNextLevel,
  Welcome,
} from "@/components/talent-dashboard-comps"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTrigger,
  IconButton,
  ScrollArea,
  ScrollBar,
} from "@/components/ui"
import { StatusDialog } from "@/app/(group)/complete-profile/page"

export default function TalentDashboard() {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const [showSecurityModal, setShowSecurityModal] = useState(false)
  const [showCompleteProfile, setShowCompleteProfile] = useState(false)
  const [profileProgress, setProfileProgress] = useState(0)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("marketeq-profile-completion")
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (Object.values(parsed).some((v: unknown) => (v as Record<string, unknown>)?.opened)) {
        setShowCompleteProfile(true)
      }
    } catch {}
  }, [])

  const handleCompleteProfile = useCallback(() => {
    setShowCompleteProfile(true)
  }, [])

  useEffect(() => {
    const safeUser = user as {
      provider?: string
      hasPassword?: boolean
    }

    const needsPasswordSetup =
      safeUser?.provider === "EMAIL" && !safeUser?.hasPassword

    if (safeUser && needsPasswordSetup) {
      setShowSecurityModal(true)
    }
    // setShowSecurityModal(true)
  }, [user])

  // Redirect if the user's active role is not Talent
  useEffect(() => {
    if (!user) return
    const role = resolveDashboardRole(user)
    if (role && role !== ROLE.TALENT) {
      router.replace("/client-dashboard")
    }
  }, [user, router])

  // VPN/proxy detection. `vpnProxyResult` always reflects the last real
  // check outcome (never cleared by dismissing the modal); `vpnProxyModalOpen`
  // only controls visibility of the separate real-detection warning (VPN/
  // Proxy/both — exact Storybook reference copy, unchanged). This only runs
  // when the user clicks "Verify My Account" inside AccountVerificationGate
  // — showing that gate at all is decided purely by real identity-
  // verification status (below), independent of the connection check.
  const [vpnProxyResult, setVpnProxyResult] = useState<
    VpnProxyDetectionOutcome | "checking" | null
  >(null)
  const [vpnProxyModalOpen, setVpnProxyModalOpen] = useState(false)

  // Identity verification entry prompt (AccountVerificationGate, Figma node
  // 13101-47588). Shown automatically on load/refresh whenever the real
  // identity-verification status is "unstarted" OR couldn't be retrieved at
  // all (`gateReason` distinguishes the two so the gate never claims the
  // account is verified or unverified when the truth is simply unknown). A
  // confirmed status other than "unstarted" (verified, pending, etc.) never
  // opens the gate.
  const [verificationGateOpen, setVerificationGateOpen] = useState(false)
  const [gateReason, setGateReason] =
    useState<AccountVerificationGateReason>("unstarted")
  // Tracks the real connection check attempted from inside the gate itself
  // ("Verify My Account" / its Retry). "unavailable" keeps the gate open and
  // renders the error+Retry state in place, per Chris's spec — it never
  // opens a separate popup and never bypasses/fakes the check.
  const [connectionCheckState, setConnectionCheckState] =
    useState<ConnectionCheckState>("idle")
  const [identityFlowOpen, setIdentityFlowOpen] = useState(false)
  const [detectedLocation, setDetectedLocation] =
    useState<DetectedLocation | null>(null)
  const identityStatusCheckStartedRef = useRef(false)

  const runIdentityVerificationCheck = useCallback(async () => {
    const status = await checkIdentityVerificationStatus()
    const reason = gateReasonForStatus(status)
    if (!reason) {
      setVerificationGateOpen(false)
      return
    }
    setGateReason(reason)
    setVerificationGateOpen(true)
  }, [])

  // A start attempt rejected as not startable re-reads the real status
  // (free-kyc.ts). A verified account closes the gate and the flow.
  useEffect(() => {
    const onRefreshed = (event: Event) => {
      const status = (event as CustomEvent<{ status?: string }>).detail?.status
      if (status !== "verified") return
      setVerificationGateOpen(false)
      setIdentityFlowOpen(false)
    }
    window.addEventListener(IDENTITY_STATUS_REFRESHED_EVENT, onRefreshed)
    return () =>
      window.removeEventListener(IDENTITY_STATUS_REFRESHED_EVENT, onRefreshed)
  }, [])

  // "You're all set!" — shown once, only to a browser that went to Didit and
  // came back, and only when the server says BOTH identity and location are
  // verified. The result is read from the server (never from the URL Didit
  // returns to), rechecked briefly because the webhook can land a moment after
  // the return, and again whenever the tab becomes visible.
  const [verifiedModalOpen, setVerifiedModalOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    if (resolveDashboardRole(user) !== ROLE.TALENT) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0

    const check = async () => {
      if (cancelled || !hasAwaitingResult(window.localStorage)) return
      const summary = await checkVerificationSummary()
      if (cancelled) return
      if (isIdentityAndLocationVerified(summary)) {
        clearAwaitingResult(window.localStorage)
        setVerificationGateOpen(false)
        setVerifiedModalOpen(true)
        return
      }
      attempts += 1
      if (attempts < RESULT_POLL_MAX_ATTEMPTS) {
        timer = setTimeout(() => void check(), RESULT_POLL_INTERVAL_MS)
      }
    }

    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      attempts = 0
      if (timer) clearTimeout(timer)
      void check()
    }

    void check()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    const role = resolveDashboardRole(user)
    if (role !== ROLE.TALENT) return
    if (identityStatusCheckStartedRef.current) return
    identityStatusCheckStartedRef.current = true
    void runIdentityVerificationCheck()
  }, [user, runIdentityVerificationCheck])

  // Real required check, attempted only on "Verify My Account" / Retry.
  // Never fakes a clean result and never marks anything verified itself —
  // a "none" outcome only opens IdentityVerificationFlow, which still runs
  // its own real submission/verification steps.
  const handleVerifyMyAccount = useCallback(async () => {
    setConnectionCheckState("checking")
    setVpnProxyResult("checking")
    const outcome = await checkVpnProxy()
    setVpnProxyResult(outcome)

    if (outcome === "none") {
      setConnectionCheckState("idle")
      setVpnProxyModalOpen(false)
      setVerificationGateOpen(false)
      // Explicit user action (Verify My Account / Retry): the only place the
      // browser's location permission is requested.
      const location = await getDetectedLocation({ useBrowserLocation: true })
      setDetectedLocation(location)
      setIdentityFlowOpen(true)
      return
    }

    if (outcome === "unavailable") {
      // Stays inside the same AccountVerificationGate dialog — no separate
      // popup, no bypass.
      setConnectionCheckState("unavailable")
      setVpnProxyModalOpen(false)
      setVerificationGateOpen(true)
      return
    }

    // vpn_detected / proxy_detected / vpn_and_proxy_detected — the separate,
    // pre-existing warning dialog (exact Storybook reference), unchanged.
    setConnectionCheckState("idle")
    setVerificationGateOpen(false)
    setVpnProxyModalOpen(true)
  }, [])

  // Exact copy/markup from the Storybook reference
  // (stories/identity-verification-entire.stories.tsx: VPNDetected,
  // ProxyDetected, VPNProxyDetected) — unchanged, only for a real detection.
  const vpnProxyModalCopy =
    vpnProxyResult === "vpn_detected"
      ? {
          title: "VPN Detected",
          description:
            "To protect the integrity of your account and to verify your actual location, we do not allow using vpn services.",
          instruction: "Please turn off your VPN to continue",
        }
      : vpnProxyResult === "proxy_detected"
        ? {
            title: "Proxy Detected",
            description:
              "To protect the integrity of your account and to verify your actual location, we do not allow the use of proxy services.",
            instruction: "Please disable your proxy to continue",
          }
        : {
            title: "VPN & Proxy Detected",
            description:
              "To protect the integrity of your account and to verify your actual location, we do not allow the use of vpn or proxy services.",
            instruction: "Please disable your VPN and proxy to continue",
          }

  return (
    <>
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <SecuritySettingsStepper
            onCloseModal={() => setShowSecurityModal(false)}
          />
        </div>
      )}

      <Dialog
        open={vpnProxyModalOpen}
        onOpenChange={(open) => {
          // Any close path (Dismiss, Escape, overlay click) only hides the
          // modal — it never clears vpnProxyResult, so a dismissed warning
          // is never mistaken for a clean detection result.
          if (!open) setVpnProxyModalOpen(false)
        }}
      >
        <DialogContent className="w-[469px]">
          <div className="flex items-center justify-center">
            <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
              <AlertTriangle className="size-6" />
            </div>
          </div>

          <h1 className="mt-5 text-lg text-center leading-7 text-dark-blue-400 font-semibold">
            {vpnProxyModalCopy.title}
          </h1>

          <DialogDescription className="text-sm mt-2 text-center leading-5 text-dark-blue-400">
            {vpnProxyModalCopy.description}
          </DialogDescription>

          {vpnProxyModalCopy.instruction && (
            <div className="mt-6">
              <p className="text-sm text-center text-dark-blue-400 leading-7">
                {vpnProxyModalCopy.instruction}
              </p>
            </div>
          )}

          <div className="mt-5 flex justify-center items-center gap-x-3">
            <Button
              variant="outlined"
              size="md"
              onClick={() => setVpnProxyModalOpen(false)}
            >
              Dismiss
            </Button>
            <Button
              className="text-primary-500 bg-primary-50 hover:text-white hover:bg-primary-500"
              size="md"
              onClick={() => void handleVerifyMyAccount()}
            >
              <RefreshCw className="size-[15px]" />
              Reload
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={verifiedModalOpen} onOpenChange={setVerifiedModalOpen}>
        <DialogContent className="max-w-[456px] pt-[50px]">
          <div className="flex items-center justify-center">
            <div className="size-12 rounded-full border-[8px] inline-flex items-center justify-center text-success-600 border-success-50 bg-success-100">
              <CheckCircle className="size-6" />
            </div>
          </div>

          <h1 className="text-lg text-center text-dark-blue-400 mt-5 font-semibold leading-7">
            You’re all set!
          </h1>
          <DialogDescription className="text-sm text-center text-dark-blue-400 leading-5 mt-2">
            Your identity and location have been successfully verified. You can
            now access all platform features.
          </DialogDescription>

          <div className="mt-[50px] grid">
            <Button onClick={() => setVerifiedModalOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AccountVerificationGate
        open={verificationGateOpen}
        reason={gateReason}
        connectionCheckState={connectionCheckState}
        onVerify={() => void handleVerifyMyAccount()}
        onRetryConnectionCheck={() => void handleVerifyMyAccount()}
        onDismissConnectionError={() => setConnectionCheckState("idle")}
      />

      {detectedLocation && (
        <IdentityVerificationFlow
          open={identityFlowOpen}
          onOpenChange={setIdentityFlowOpen}
          detectedLocation={detectedLocation}
        />
      )}

      <AuthenticatedRoute>
        <div className="flex bg-gray-50">
          <LeftSidebar />
          <div className="flex-auto p-3.5 gap-x-6 flex md:p-6 min-[1024px]:pt-[50px] min-[1024px]:pb-8 min-[1024px]:pl-[var(--sidebar-content-pl,274px)] transition-[padding-left] duration-300 ease-in-out min-[1024px]:pr-[50px] overflow-hidden">
            <div className="flex-auto space-y-3 md:space-y-5 min-w-0">
              <Welcome onToggle={() => setIsOpen(true)} />

              <RecentListings />

              <CreateYourOwnProject />

              <RecommendedForYou />

              <BecomeTopSeller />

              <Carousel />

              <TakeCareersToNextLevel />

              <Footer />
            </div>

            <RightSidebar
              onCompleteProfile={handleCompleteProfile}
              profileProgress={profileProgress}
            />
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent
              variant="unanimated"
              className="w-full md:w-[322px] bg-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right-1/2 data-[state=closed]:slide-out-to-right-1/2 inset-x-0 md:left-auto md:right-0 inset-y-0"
            >
              <button
                className="size-[28px] -left-3.5 absolute z-10 top-[104px] text-gray-500 focus-visible:outline-none rounded-full bg-white hidden md:inline-flex border border-gray-300 items-center justify-center shrink-0"
                onClick={() => setIsOpen(false)}
              >
                <ChevronRight className="size-3" />
              </button>

              <div className="pl-3.5 p-1 sticky top-0 h-12 flex md:hidden items-center justify-between">
                <h1 className="text-sm leading-5 font-semibold text-dark-blue-400">
                  My Profile
                </h1>

                <DialogTrigger asChild>
                  <IconButton
                    className="opacity-50 hover:opacity-100"
                    size="md"
                    variant="ghost"
                    visual="gray"
                  >
                    <X className="size-[18px]" />
                  </IconButton>
                </DialogTrigger>
              </div>

              <ScrollArea
                className="w-full h-[calc(theme(size.full)-theme(size.12))]"
                scrollBar={<ScrollBar className="w-4 p-1" />}
              >
                <RightDrawer
                  onCompleteProfile={handleCompleteProfile}
                  profileProgress={profileProgress}
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <StatusDialog
            open={showCompleteProfile}
            onOpenChange={setShowCompleteProfile}
            onProgressChange={setProfileProgress}
          />
        </div>
      </AuthenticatedRoute>
    </>
  )
}
