"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import { useAuth, resolveDashboardRole } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { ROLE } from "@/types/user"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ChevronRight,
  MarkerPin01,
  Plane,
  RefreshCw,
  X,
} from "@blend-metrics/icons"
import SecuritySettingsStepper from "@/components/security-settings"
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
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Button,
  CloseButton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTrigger,
  IconButton,
  ScrollArea,
  ScrollBar,
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui"
import { StatusDialog } from "@/app/(group)/complete-profile/page"
import {
  checkVpnProxy,
  type VpnProxyDetectionOutcome,
} from "@/src/lib/api/vpn-proxy-detection"
import {
  clearAwaitingResult,
  hasAwaitingResult,
  IDENTITY_STATUS_REFRESHED_EVENT,
  RESULT_POLL_INTERVAL_MS,
  RESULT_POLL_MAX_ATTEMPTS,
} from "@/src/lib/api/identity-verification-status"
import {
  cooldownRetryAt,
  formatRetryAt,
  shouldShowProfileBanner,
  startIdentityOnlyForDashboard,
  verifyActionFor,
} from "@/src/lib/api/identity-next-step"
import {
  isPasswordSetupRequired,
  shouldStartIdentityCheck,
} from "@/src/lib/api/identity-check-gate"
import {
  createReturnReconciler,
  fetchIdentityVerificationSummary,
  shouldShowPendingModal,
  shouldShowSuccessModal,
  type IdentityVerificationSummaryView,
} from "@/src/lib/api/identity-verification-state"
import {
  getDetectedLocation,
  type DetectedLocation,
} from "@/src/lib/api/detected-location"
import {
  claimTravelReminder,
  createTravelReminderScheduler,
} from "@/src/lib/api/travel-reminder"
import {
  dismissTravelExpiryPopup,
  readSessionId,
  shouldShowTravelExpiryPopup,
} from "@/src/lib/api/travel-expiry-popup"
import {
  answerTravelerPrompt,
  markTravelerPromptShown,
  shouldOfferTravelerPrompt,
} from "@/src/lib/api/travel-location-prompt"
import {
  clearHomeCountryChange,
  consumeHomeCountryChange,
  HOME_COUNTRY_UPDATED_ALERT,
  markHomeCountryChange,
  successAlertKindFor,
  type SuccessAlertKind,
} from "@/src/lib/api/home-country-change-result"
import {
  createTravelPopupCloseGuard,
  isActiveTravelUpdate,
  isTravelModeInForce,
  TRAVEL_POPUP_DURATION_MS,
} from "@/src/lib/api/travel-popup"
import {
  shouldShowLocationMismatchPrompt,
  startChangeHomeCountry,
  startStillTraveling,
  type MismatchLaunch,
} from "@/src/lib/api/location-mismatch"
import { IdentityVerificationFlow } from "@/components/identity-verification-flow"
import {
  AccountVerificationGate,
  type ConnectionCheckState,
} from "@/components/account-verification-gate"

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

    const needsPasswordSetup = isPasswordSetupRequired(safeUser)

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

  // Identity verification entry. Viewing the dashboard is not a gated action, so
  // nothing here opens on page load: the passive entry is the banner below, and
  // only the explicit "Verify My Account" click (or a failed connection check
  // from that click) opens anything. Dismissing the banner is in-memory only.
  const [profileBannerShown, setProfileBannerShown] = useState(false)
  const [profileBannerDismissed, setProfileBannerDismissed] = useState(false)
  const [verificationGateOpen, setVerificationGateOpen] = useState(false)
  const [connectionCheckState, setConnectionCheckState] =
    useState<ConnectionCheckState>("idle")
  const [vpnProxyResult, setVpnProxyResult] = useState<
    VpnProxyDetectionOutcome | "checking" | null
  >(null)
  const [vpnProxyModalOpen, setVpnProxyModalOpen] = useState(false)
  const [identityFlowOpen, setIdentityFlowOpen] = useState(false)
  const [detectedLocation, setDetectedLocation] =
    useState<DetectedLocation | null>(null)
  const identityStatusCheckStartedRef = useRef(false)
  // Travel Mode popup (Figma node 13101-46860): the latest backend answer and which
  // popup, if any, is showing. "reminder" = a day-3/day-7 occurrence this tab claimed;
  // "expiry" = Travel Mode ended for an account that is not fully verified yet.
  const [travelSummary, setTravelSummary] =
    useState<IdentityVerificationSummaryView | null>(null)
  const [travelPopup, setTravelPopup] = useState<"reminder" | "expiry" | null>(
    null
  )
  // How the existing verification flow is (re)started. The default is exactly what it
  // always was; only the popup's Update action starts it at "Tell us more about your
  // current location" (a new key remounts it, since the flow reads its start screen once).
  const [flowLaunch, setFlowLaunch] = useState<{
    key: number
    initialState?: "current-location-showcase" | "traveling-showcase"
    activeTravelModeUpdate?: boolean
  }>({ key: 0 })
  // Returning-user new-location prompt (Storybook ChangeLocation). The backend's
  // locationMismatch decides. It has only its two buttons: no outside click, no Escape,
  // no X, so it is closed only by answering it.
  const [locationMismatchOpen, setLocationMismatchOpen] = useState(false)
  const [locationMismatchBusy, setLocationMismatchBusy] = useState(false)
  // The same dialog for an account whose Travel Mode is in force and that was detected
  // in another country (travelModeLocationMismatch). Offered once per login: see
  // travel-location-prompt.ts. The login is marked only when a button is chosen.
  // "I'm still traveling" only closes it.
  const [travelerPromptOpen, setTravelerPromptOpen] = useState(false)
  // Answered during this page load: a later summary read must not reopen it even when
  // no session id exists to remember the answer.
  const travelerPromptAnsweredRef = useRef(false)
  // Records that the traveler prompt was answered in this login (button chosen).
  const markTravelerPromptAnswered = useCallback(() => {
    travelerPromptAnsweredRef.current = true
    markTravelerPromptShown(readSessionId(), window.localStorage)
  }, [])
  // Tells a user's close of the popup (X, Escape, swipe) from the toast closing itself.
  const travelPopupCloseGuardRef = useRef(createTravelPopupCloseGuard())


  const runIdentityVerificationCheck = useCallback(async () => {
    // The backend's nextAction is the only input; an unreadable status or an
    // unknown value shows no banner.
    const summary = await fetchIdentityVerificationSummary()
    setProfileBannerShown(shouldShowProfileBanner(summary))
    setCooldownRetryTime(cooldownRetryAt(summary))
    setTravelSummary(summary)
    setLocationMismatchOpen(shouldShowLocationMismatchPrompt(summary))
  }, [])

  // A start attempt rejected as not startable re-reads the real status; a
  // verified account closes everything that was open.
  useEffect(() => {
    const onRefreshed = (event: Event) => {
      const status = (event as CustomEvent<{ status?: string }>).detail?.status
      if (status !== "verified") return
      setVerificationGateOpen(false)
      setIdentityFlowOpen(false)
      setProfileBannerShown(false)
    }
    window.addEventListener(IDENTITY_STATUS_REFRESHED_EVENT, onRefreshed)
    return () =>
      window.removeEventListener(IDENTITY_STATUS_REFRESHED_EVENT, onRefreshed)
  }, [])

  // "You're all set!" — shown once, only to a browser that went to Didit and came
  // back. On that return the dashboard reconciles ONCE (POST, no session id from the
  // browser) and then reads GET /me: the backend's nextAction is the authoritative
  // state and "complete" is the only thing that opens this dialog. The webhook can
  // still land a moment later, so the bounded /me recheck and the tab-visibility
  // refresh remain as fallbacks (GET only — never another reconcile). Nothing is read
  // from the URL Didit returns to, and no attempt/cooldown/status rule lives here.
  const [verifiedModalOpen, setVerifiedModalOpen] = useState(false)
  // "Your verification has been submitted": shown once when this browser comes back
  // from Didit and the backend says the session is in review. Done only closes it.
  const [pendingModalOpen, setPendingModalOpen] = useState(false)
  // Success alert (Figma node 13101-47566): shown only AFTER the user clicks the
  // success modal's own Done button, never while the modal is open.
  const [successAlertOpen, setSuccessAlertOpen] = useState(false)
  // Which copy the success alert carries: the generic one, or the home-country one when
  // this browser went to Didit to change the home country (home-country-change-result.ts).
  const [successAlertKind, setSuccessAlertKind] =
    useState<SuccessAlertKind>("verified")
  // The location-specific notification (Figma node 13101-47577): the same alert, with
  // the map pin and the home-country copy. Shown INSTEAD of the generic one.
  const [homeCountryUpdatedOpen, setHomeCountryUpdatedOpen] = useState(false)
  // The modal's own Done button opens the generic alert. For a home-country approval the
  // location-specific one replaces it, in the same commit (before paint), so the
  // generic alert is never seen and only one notification shows.
  useLayoutEffect(() => {
    if (successAlertOpen && successAlertKind === "home-country-updated") {
      setSuccessAlertOpen(false)
      setHomeCountryUpdatedOpen(true)
    }
  }, [successAlertOpen, successAlertKind])
  // "You've used all three attempts": the retry time (ISO) while the backend says to
  // wait for a retry window, else null. Closing it only hides it for this view; a
  // fresh backend answer shows it again.
  const [cooldownRetryTime, setCooldownRetryTime] = useState<string | null>(null)
  const retryWhen = formatRetryAt(cooldownRetryTime)
  // The modal's existing Done button: close the modal, then show the alert.
  const handleSuccessDone = () => {
    setVerifiedModalOpen(false)
    setSuccessAlertOpen(true)
  }
  // Held in a ref so rerenders and StrictMode's double effect share one reconcile.
  const returnReconcilerRef = useRef<ReturnType<
    typeof createReturnReconciler
  > | null>(null)

  useEffect(() => {
    if (!user) return
    if (resolveDashboardRole(user) !== ROLE.TALENT) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0

    const apply = (summary: IdentityVerificationSummaryView | null) => {
      if (cancelled) return
      if (shouldShowSuccessModal(summary)) {
        clearAwaitingResult(window.localStorage)
        setVerificationGateOpen(false)
        setProfileBannerShown(false)
        setVerifiedModalOpen(true)
        // Which success alert follows the modal. Read once: a repeat (duplicate
        // webhook, reconcile, refresh) finds no flag, so it can never show twice.
        setSuccessAlertKind(
          successAlertKindFor(consumeHomeCountryChange(window.localStorage))
        )
        return
      }
      // Back from Didit with the session in review: tell the user once. The result
      // arrives later as a notification, so this browser stops waiting for it.
      if (shouldShowPendingModal(summary)) {
        clearAwaitingResult(window.localStorage)
        // The approval will arrive as a backend notification: no alert from here.
        clearHomeCountryChange(window.localStorage)
        setVerificationGateOpen(false)
        setProfileBannerShown(false)
        setPendingModalOpen(true)
        return
      }
      // The banner or gate may have opened from an earlier read, before this result
      // landed (e.g. an unfinished session that has since ended, or a new rejection
      // with attempts left). Re-evaluate them from the same backend answer.
      setProfileBannerShown(shouldShowProfileBanner(summary))
      if (!shouldShowProfileBanner(summary)) setVerificationGateOpen(false)
      // Waiting out a retry window (the third rejection): show the retry time and
      // stop polling — nothing more is coming until then.
      const retryAt = cooldownRetryAt(summary)
      if (retryAt) {
        setCooldownRetryTime(retryAt)
        return
      }
      // Anything else — including an unknown or missing nextAction — shows nothing
      // new yet; keep waiting (bounded) for the webhook.
      attempts += 1
      if (attempts < RESULT_POLL_MAX_ATTEMPTS) {
        timer = setTimeout(() => void poll(), RESULT_POLL_INTERVAL_MS)
      }
    }

    const poll = async () => {
      if (cancelled || !hasAwaitingResult(window.localStorage)) return
      apply(await fetchIdentityVerificationSummary())
    }

    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      attempts = 0
      if (timer) clearTimeout(timer)
      void poll()
    }

    if (hasAwaitingResult(window.localStorage)) {
      returnReconcilerRef.current ??= createReturnReconciler({
        awaitingStorage: window.localStorage,
        markerStorage: window.sessionStorage,
      })
      void returnReconcilerRef.current.run().then((result) => apply(result.summary))
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [user])

  // The Identity Verification check (which may open AccountVerificationGate) waits
  // for the "Secure your account" dialog: not while the authenticated user still
  // needs a password (a failed save or a Cancel therefore never opens verification),
  // and not while that dialog is still open (it keeps its success step until the
  // user clicks Close). The once-only ref is set only when the check really starts,
  // so waiting never consumes it.
  useEffect(() => {
    if (!user) return
    const role = resolveDashboardRole(user)
    if (
      !shouldStartIdentityCheck({
        user,
        isTalent: role === ROLE.TALENT,
        securityDialogOpen: showSecurityModal,
        alreadyStarted: identityStatusCheckStartedRef.current,
      })
    ) {
      return
    }
    identityStatusCheckStartedRef.current = true
    void runIdentityVerificationCheck()
  }, [user, showSecurityModal, runIdentityVerificationCheck])

  // Real required check, attempted only on "Verify My Account" / Retry. Never
  // fakes a clean result and never marks anything verified itself.
  const handleVerifyMyAccount = useCallback(async () => {
    setConnectionCheckState("checking")
    setVpnProxyResult("checking")
    const outcome = await checkVpnProxy()
    setVpnProxyResult(outcome)

    if (outcome === "none") {
      setVpnProxyModalOpen(false)
      // The backend's state is re-read now, not trusted from page load.
      const summary = await fetchIdentityVerificationSummary()
      const action = verifyActionFor(summary)
      if (action.kind === "limit") {
        setConnectionCheckState("idle")
        setVerificationGateOpen(false)
        setProfileBannerShown(false)
        setCooldownRetryTime(action.retryAt)
        return
      }
      if (action.kind === "close") {
        setConnectionCheckState("idle")
        setVerificationGateOpen(false)
        setProfileBannerShown(false)
        return
      }
      if (action.kind === "didit") {
        // This trip to Didit is a home-country change when a different country is
        // pending (the backend hands the retry to the same session); recorded
        // explicitly either way, so an ordinary trip clears a flag left by an earlier one.
        markHomeCountryChange(
          window.localStorage,
          summary?.pendingHomeCountry != null
        )
        const started = await startIdentityOnlyForDashboard()
        if (started === "redirected") return // the browser is leaving for Didit
        if (started === "not_startable") {
          setConnectionCheckState("idle")
          void runIdentityVerificationCheck()
          return
        }
        if (started === "failed") {
          setConnectionCheckState("idle")
          return
        }
        // "needs_location": fall through to the normal location step below
      }
      setConnectionCheckState("idle")
      setVerificationGateOpen(false)
      // Explicit user action: the only place browser location is requested.
      setDetectedLocation(await getDetectedLocation({ useBrowserLocation: true }))
      // A flow last started by the Travel Mode Update action starts fresh here. A traveler
      // whose Travel Mode is already in force is told so (from the /me read above), so
      // "Temporarily traveling" closes with the existing confirmation instead of asking for
      // a second duration; everyone else gets exactly the flow they always did.
      const activeTravelModeUpdate = isTravelModeInForce(summary)
      setFlowLaunch((prev) =>
        prev.initialState || Boolean(prev.activeTravelModeUpdate) !== activeTravelModeUpdate
          ? { key: prev.key + 1, ...(activeTravelModeUpdate ? { activeTravelModeUpdate } : {}) }
          : prev
      )
      setIdentityFlowOpen(true)
      return
    }

    if (outcome === "unavailable") {
      // Stays inside the same gate dialog, with its error and Retry.
      setConnectionCheckState("unavailable")
      setVpnProxyModalOpen(false)
      setVerificationGateOpen(true)
      return
    }

    // vpn_detected / proxy_detected / vpn_and_proxy_detected.
    setConnectionCheckState("idle")
    setVerificationGateOpen(false)
    setVpnProxyModalOpen(true)
  }, [runIdentityVerificationCheck])

  // Travel Mode expiry popup: when the backend says Travel Mode ended, show it (verified
  // or not) unless it was closed in THIS login (the existing
  // readable session_id cookie; a refresh keeps it, a new login changes it).
  useEffect(() => {
    if (!travelSummary) return
    if (
      shouldShowTravelExpiryPopup({
        expired: travelSummary.travelModeExpired,
        sessionId: readSessionId(),
        storage: window.localStorage,
      })
    ) {
      setTravelPopup("expiry")
    }
  }, [travelSummary])

  // "Still traveling?" for an account whose Travel Mode is in force and that logged in
  // from a country other than its verified home country. The backend decides whether it
  // applies; the once-per-login rule is the existing session_id marker, written when the
  // user answers it (not when it opens), so an unanswered prompt returns after a refresh.
  useEffect(() => {
    if (!travelSummary || travelerPromptAnsweredRef.current) return
    const sessionId = readSessionId()
    if (
      !shouldOfferTravelerPrompt({
        summary: travelSummary,
        sessionId,
        storage: window.localStorage,
      })
    ) {
      return
    }
    setTravelerPromptOpen(true)
  }, [travelSummary])

  // Travel Mode day-3 / day-7 reminders. If /me says one is due it is CLAIMED first and
  // shown only when the backend answers { claimed: true } (so of several tabs only the
  // winner shows it); if it is in the future one timer is set for that time. No polling.
  // The timer is replaced whenever the backend answer changes and cleared on unmount;
  // after a definitive claim answer /me is re-read for the next occurrence.
  useEffect(() => {
    if (!travelSummary) return
    const scheduler = createTravelReminderScheduler({
      claim: () => claimTravelReminder(),
      onClaimed: () => setTravelPopup("reminder"),
      onSettled: () => {
        void fetchIdentityVerificationSummary().then((next) => {
          if (next) setTravelSummary(next)
        })
      },
    })
    scheduler.update({
      due: travelSummary.travelReminderDue,
      availableAt: travelSummary.travelReminderAvailableAt,
    })
    return () => scheduler.dispose()
  }, [travelSummary])

  // Closing the popup (X, swipe or Escape). A closed reminder is spent: its occurrence
  // was claimed when it opened. A closed expiry popup is remembered for this login only.
  const handleTravelPopupClose = useCallback(() => {
    if (travelPopup === "expiry") {
      dismissTravelExpiryPopup(readSessionId(), window.localStorage)
    }
    setTravelPopup(null)
  }, [travelPopup])

  // "Update": hide the popup (nothing is remembered) and open the existing verification
  // flow at "Tell us more about your current location", which keeps its own
  // Temporarily traveling / Permanently relocated choices. The location shown behind it
  // comes from the server only; no browser location permission is requested here.
  // WHY the popup opened decides one thing: for a reminder while Travel Mode is still in
  // force, "Temporarily traveling" must not start a new period (the flow is told so and
  // skips the duration screen); for an expired Travel Mode it continues to the duration
  // screen so a new period can be activated. A reminder popup can stay open for a long
  // time, so /me is re-read to make sure Travel Mode has not ended meanwhile.
  const handleTravelUpdate = useCallback(async () => {
    const kind = travelPopup
    setTravelPopup(null)
    const fresh = kind === "reminder" ? await fetchIdentityVerificationSummary() : null
    const activeTravelModeUpdate = isActiveTravelUpdate(kind, fresh)
    const location = await getDetectedLocation()
    setDetectedLocation(location)
    setFlowLaunch((prev) => ({
      key: prev.key + 1,
      initialState: "current-location-showcase",
      activeTravelModeUpdate,
    }))
    setIdentityFlowOpen(true)
  }, [travelPopup])

  // The new-location prompt's two answers. Each records the choice, then opens the
  // existing verification flow: "currently traveling" on its duration screen, "change my
  // home country" from the top so the home country is confirmed again.
  const openFlowFromMismatch = useCallback((launch: MismatchLaunch) => {
    setDetectedLocation(launch.location)
    setFlowLaunch((prev) => ({ key: prev.key + 1, initialState: launch.initialState }))
    setLocationMismatchOpen(false)
    setTravelerPromptOpen(false)
    setIdentityFlowOpen(true)
  }, [])

  const handleStillTraveling = useCallback(async () => {
    setLocationMismatchBusy(true)
    try {
      const result = await answerTravelerPrompt(startStillTraveling, () => {})
      if (result.ok) openFlowFromMismatch(result.value)
    } finally {
      setLocationMismatchBusy(false)
    }
  }, [openFlowFromMismatch])

  // "I'm still traveling" for an active traveler: nothing changes. Travel Mode and the
  // verified home country stay exactly as they are; the prompt just closes.
  const handleTravelerStillTraveling = useCallback(() => {
    markTravelerPromptAnswered()
    setTravelerPromptOpen(false)
  }, [markTravelerPromptAnswered])

  const handleChangeHomeCountry = useCallback(async () => {
    setLocationMismatchBusy(true)
    try {
      // A failed start marks nothing and leaves the prompt open to try again.
      const result = await answerTravelerPrompt(
        startChangeHomeCountry,
        travelerPromptOpen ? markTravelerPromptAnswered : () => {}
      )
      if (result.ok) openFlowFromMismatch(result.value)
    } finally {
      setLocationMismatchBusy(false)
    }
  }, [openFlowFromMismatch, markTravelerPromptAnswered, travelerPromptOpen])

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
            <Button onClick={handleSuccessDone}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingModalOpen} onOpenChange={setPendingModalOpen}>
        <DialogContent className="max-w-[456px] pt-[50px]">
          <div className="flex items-center justify-center">
            <div className="size-12 rounded-full border-[8px] inline-flex items-center justify-center text-success-600 border-success-50 bg-success-100">
              <CheckCircle className="size-6" />
            </div>
          </div>

          <h1 className="text-lg text-center text-dark-blue-400 mt-5 font-semibold leading-7">
            Your verification has been submitted
          </h1>
          <DialogDescription className="text-sm text-center text-dark-blue-400 leading-5 mt-2">
            Once approved, your new location will be confirmed and your profile
            will be updated. You’ll receive a notification when the verification
            is complete.
          </DialogDescription>

          <div className="mt-[50px] grid">
            <Button onClick={() => setPendingModalOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={cooldownRetryTime !== null}
        onOpenChange={(open) => {
          if (!open) setCooldownRetryTime(null)
        }}
      >
        <DialogContent className="w-[469px] pt-[50px]">
          <div className="flex items-center justify-center">
            <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
              <AlertTriangle className="size-6" />
            </div>
          </div>

          <h1 className="mt-5 text-lg text-center leading-7 text-dark-blue-400 font-semibold">
            You’ve used all three attempts
          </h1>

          <DialogDescription className="mt-2 text-sm text-center leading-5 text-dark-blue-400">
            {retryWhen &&
              `You can try again on ${retryWhen.date} at ${retryWhen.time}. Nothing is lost — your account stays as it is until then.`}
          </DialogDescription>
        </DialogContent>
      </Dialog>

      <Dialog
        open={locationMismatchOpen || travelerPromptOpen}
      >
        <DialogContent
          className="w-[456px]"
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <div className="flex items-center justify-center">
            <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
              <AlertTriangle className="size-6" />
            </div>
          </div>

          <DialogDescription className="text-sm mt-5 text-center leading-5 text-dark-blue-400">
            You’re logging in from a location outside your usual one. Just
            checking if you’re still away.
          </DialogDescription>

          <div className="mt-[50px] grid grid-cols-2 gap-x-3">
            <Button
              variant="outlined"
              size="md"
              disabled={locationMismatchBusy}
              onClick={() =>
                travelerPromptOpen
                  ? handleTravelerStillTraveling()
                  : void handleStillTraveling()
              }
            >
              I’m still traveling
            </Button>
            <Button
              size="md"
              disabled={locationMismatchBusy}
              onClick={() => void handleChangeHomeCountry()}
            >
              Change my home country
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ToastProvider duration={5000} swipeDirection="right">
        <Toast
          open={successAlertOpen}
          onOpenChange={setSuccessAlertOpen}
          className="relative w-[400px] max-w-full items-start gap-5 space-x-0 rounded-xl border border-gray-100 bg-white p-4 text-gray-900 shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08),0px_4px_6px_-2px_rgba(16,24,40,0.03)] data-[state=open]:sm:slide-in-from-top-full"
        >
          <div className="flex size-[66px] shrink-0 items-center justify-center rounded-full border-[9.9px] border-primary-25 bg-primary-50">
            <CheckCircle className="size-[24.75px] translate-x-[0.38px] -translate-y-[0.62px] text-primary-500" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
            <ToastTitle className="text-sm font-semibold leading-5 text-gray-900">
              All set! Your identity and location are verified.
            </ToastTitle>
            <ToastDescription className="text-sm font-normal leading-5 text-gray-600">
              You now have full access to all features.
            </ToastDescription>
          </div>

          <IconButton
            className="absolute right-2 top-2 size-9 text-gray-500"
            size="md"
            visual="gray"
            variant="ghost"
            onClick={() => setSuccessAlertOpen(false)}
          >
            <X className="size-5" />
          </IconButton>
        </Toast>

        <ToastViewport className="top-5 right-5 left-auto bottom-auto w-auto max-w-[400px] flex-col gap-3 p-0 sm:top-5 sm:right-5 sm:left-auto sm:bottom-auto sm:flex-col md:max-w-[400px]" />
      </ToastProvider>

      {/* Travel Mode popup — the approved Notification (Figma node 13101-46860), the same
          markup as the flow's own reminder toast. It stays until the user closes it: it
          carries an action, and for the expiry popup a close is what is remembered. */}
      <ToastProvider swipeDirection="right">
        <Toast
          open={travelPopup !== null}
          onOpenChange={(open) => {
            // Only a user's close counts; the toast closing itself is ignored.
            if (travelPopupCloseGuardRef.current.shouldClose(open)) {
              handleTravelPopupClose()
            }
          }}
          onEscapeKeyDown={() => travelPopupCloseGuardRef.current.markUserClose()}
          onSwipeEnd={() => travelPopupCloseGuardRef.current.markUserClose()}
          duration={TRAVEL_POPUP_DURATION_MS}
          className="relative w-[400px] max-w-full items-start gap-4 space-x-0 rounded-xl border border-gray-100 bg-white p-4 text-gray-900 shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08),0px_4px_6px_-2px_rgba(16,24,40,0.03)] data-[state=open]:sm:slide-in-from-top-full"
        >
          <div className="flex size-[66px] shrink-0 items-center justify-center rounded-full border-[9.9px] border-primary-25 bg-primary-50">
            <Plane className="size-[24.75px] text-primary-500" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4 pt-0.5">
            <div className="flex flex-col gap-1">
              <ToastTitle className="text-sm font-semibold leading-5 text-gray-900">
                You are in Travel Mode
              </ToastTitle>
              <ToastDescription className="text-sm font-normal leading-5 text-gray-600">
                Update your status if your location changes
              </ToastDescription>
            </div>

            <Button
              variant="link"
              className="h-5 justify-start p-0 text-sm font-semibold leading-5"
              onClick={() => void handleTravelUpdate()}
            >
              Update
            </Button>
          </div>

          <IconButton
            className="absolute right-2 top-2 text-gray-500"
            size="md"
            visual="gray"
            variant="ghost"
            onClick={handleTravelPopupClose}
          >
            <X className="size-5" />
          </IconButton>
        </Toast>

        {/* Home country updated — the approved success alert (Figma node 13101-47577): the
            same markup as the generic success alert, with the map pin and its own copy.
            It shares this viewport; the generic alert is replaced by it, never stacked. */}
        <Toast
          open={homeCountryUpdatedOpen}
          onOpenChange={setHomeCountryUpdatedOpen}
          duration={5000}
          className="relative w-[400px] max-w-full items-start gap-5 space-x-0 rounded-xl border border-gray-100 bg-white p-4 text-gray-900 shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08),0px_4px_6px_-2px_rgba(16,24,40,0.03)] data-[state=open]:sm:slide-in-from-top-full"
        >
          <div className="flex size-[66px] shrink-0 items-center justify-center rounded-full border-[9.9px] border-primary-25 bg-primary-50">
            <MarkerPin01 className="size-[24.75px] translate-x-[0.38px] -translate-y-[0.62px] text-primary-500" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
            <ToastTitle className="text-sm font-semibold leading-5 text-gray-900">
              {HOME_COUNTRY_UPDATED_ALERT.title}
            </ToastTitle>
            <ToastDescription className="text-sm font-normal leading-5 text-gray-600">
              {HOME_COUNTRY_UPDATED_ALERT.description}
            </ToastDescription>
          </div>

          <IconButton
            className="absolute right-2 top-2 size-9 text-gray-500"
            size="md"
            visual="gray"
            variant="ghost"
            onClick={() => setHomeCountryUpdatedOpen(false)}
          >
            <X className="size-5" />
          </IconButton>
        </Toast>

        <ToastViewport className="top-5 right-5 left-auto bottom-auto w-auto max-w-[400px] flex-col gap-3 p-0 sm:top-5 sm:right-5 sm:left-auto sm:bottom-auto sm:flex-col md:max-w-[400px]" />
      </ToastProvider>

      <AccountVerificationGate
        open={verificationGateOpen}
        reason="unstarted"
        connectionCheckState={connectionCheckState}
        onVerify={() => void handleVerifyMyAccount()}
        onRetryConnectionCheck={() => void handleVerifyMyAccount()}
        onDismissConnectionError={() => setConnectionCheckState("idle")}
      />

      {detectedLocation && (
        <IdentityVerificationFlow
          key={flowLaunch.key}
          open={identityFlowOpen}
          onOpenChange={setIdentityFlowOpen}
          detectedLocation={detectedLocation}
          initialState={flowLaunch.initialState}
          activeTravelModeUpdate={flowLaunch.activeTravelModeUpdate}
        />
      )}

      <AuthenticatedRoute>
        <div className="flex bg-gray-50">
          <LeftSidebar />
          <div className="flex-auto p-3.5 gap-x-8 flex md:p-6 min-[1024px]:pt-[50px] min-[1024px]:pb-8 min-[1024px]:pl-[var(--sidebar-content-pl,274px)] transition-[padding-left] duration-300 ease-in-out min-[1024px]:pr-[50px] overflow-hidden">
            <div className="flex-auto space-y-3 min-[1024px]:space-y-5 min-w-0">
              {profileBannerShown && !profileBannerDismissed && (
                // Welcome renders its header row inside a `md:contents` wrapper, so at
                // md+ the column's space-y margin never reaches that row (a
                // display:contents box has no margin). The banner therefore carries its
                // own bottom gap: 32px from md up (Figma content column gap), and below
                // md the wrapper is a normal box that already gets space-y-3 (12px).
                <Alert variant="warning" className="md:mb-8">
                  <AlertIcon>
                    <AlertTriangle className="h-5 w-5" />
                  </AlertIcon>
                  <AlertContent>
                    <AlertTitle className="text-warning-600">
                      Your profile is not public
                    </AlertTitle>
                    <AlertDescription>
                      To access full platform features, please verify your account
                    </AlertDescription>
                    <div className="mt-3 flex items-center gap-x-3 text-sm font-semibold">
                      <Button
                        variant="link"
                        className="h-5 gap-x-2 p-0 text-sm font-semibold leading-5 text-warning-600"
                        disabled={connectionCheckState === "checking"}
                        onClick={() => void handleVerifyMyAccount()}
                      >
                        Verify My Account
                        <ArrowRight className="size-5" />
                      </Button>
                    </div>
                  </AlertContent>
                  <CloseButton onClick={() => setProfileBannerDismissed(true)} />
                </Alert>
              )}
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
