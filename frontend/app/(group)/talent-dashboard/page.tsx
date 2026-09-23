"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, resolveDashboardRole } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { ROLE } from "@/types/user"
import { AlertTriangle, ChevronRight, RefreshCw, X } from "@blend-metrics/icons"
import SecuritySettingsStepper from "@/components/security-settings"
import {
  checkVpnProxy,
  type VpnProxyDetectionOutcome,
} from "@/src/lib/api/vpn-proxy-detection"
import { checkIdentityVerificationStatus } from "@/src/lib/api/identity-verification-status"
import {
  getDetectedLocation,
  type DetectedLocation,
} from "@/src/lib/api/detected-location"
import { IdentityVerificationFlow } from "@/components/identity-verification-flow"
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
  // only controls visibility. Detection runs once per mount for an
  // authenticated Talent session — every login, every first-time signup
  // landing here, and every later session, not a one-time flag.
  const [vpnProxyResult, setVpnProxyResult] = useState<
    VpnProxyDetectionOutcome | "checking" | null
  >(null)
  const [vpnProxyModalOpen, setVpnProxyModalOpen] = useState(false)
  const vpnProxyCheckStartedRef = useRef(false)

  // Identity verification entry prompt. Only checked once the VPN/proxy
  // check comes back clean — location verification can't meaningfully
  // start while the connection is masked. Only opens for an account that
  // hasn't started verification yet (UNSTARTED); an in-progress, blocked,
  // or already-verified account is untouched here.
  const [identityFlowOpen, setIdentityFlowOpen] = useState(false)
  const [detectedLocation, setDetectedLocation] =
    useState<DetectedLocation | null>(null)

  const runIdentityVerificationCheck = useCallback(async () => {
    const status = await checkIdentityVerificationStatus()
    if (status !== "unstarted") return
    const location = await getDetectedLocation()
    setDetectedLocation(location)
    setIdentityFlowOpen(true)
  }, [])

  const runVpnProxyCheck = useCallback(async () => {
    setVpnProxyResult("checking")
    const outcome = await checkVpnProxy()
    setVpnProxyResult(outcome)
    if (
      outcome === "vpn_detected" ||
      outcome === "proxy_detected" ||
      outcome === "vpn_and_proxy_detected"
    ) {
      setVpnProxyModalOpen(true)
    } else if (outcome === "none") {
      setVpnProxyModalOpen(false)
      void runIdentityVerificationCheck()
    } else {
      // "unavailable" is a distinct state with no modal of its own (no
      // confirmed source defines what should happen when the signal can't
      // be obtained) — it must not be treated as a clean result either,
      // so the identity-verification check is not run in this case.
      setVpnProxyModalOpen(false)
    }
  }, [runIdentityVerificationCheck])

  useEffect(() => {
    if (!user) return
    const role = resolveDashboardRole(user)
    if (role !== ROLE.TALENT) return
    if (vpnProxyCheckStartedRef.current) return
    vpnProxyCheckStartedRef.current = true
    void runVpnProxyCheck()
  }, [user, runVpnProxyCheck])

  // Exact copy/markup from the Storybook reference
  // (stories/identity-verification-entire.stories.tsx: VPNDetected,
  // ProxyDetected, VPNProxyDetected) — not redesigned, just parameterized
  // by which of the three flagged outcomes is current.
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

          <div className="mt-6">
            <p className="text-sm text-center text-dark-blue-400 leading-7">
              {vpnProxyModalCopy.instruction}
            </p>
          </div>

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
              onClick={() => void runVpnProxyCheck()}
            >
              <RefreshCw className="size-[15px]" />
              Reload
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
