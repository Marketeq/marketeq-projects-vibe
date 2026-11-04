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
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ChevronRight,
  MarkerPin01,
  Info,
  Plane,
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
  DialogTitle,
  DialogTrigger,
  IconButton,
  Label,
  RadioGroup,
  RadioGroupItem,
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
  cooldownRetryAt,
  shouldShowProfileBanner,
} from "@/src/lib/api/identity-next-step"
import {
  TRAVEL_DURATION_OPTION_LABEL_CLASS,
  TRAVEL_DURATION_OPTION_RADIO_CLASS,
  TRAVEL_DURATION_OPTION_ROW_CLASS,
} from "@/lib/travel-duration-option-styles"
import {
  isPasswordSetupRequired,
  shouldStartIdentityCheck,
} from "@/src/lib/api/identity-check-gate"
import {
  fetchIdentityVerificationSummary,
} from "@/src/lib/api/identity-verification-state"
import {
  getDetectedLocation,
} from "@/src/lib/api/detected-location"
import {
  answerCheckIn,
  CHECK_IN_COPY,
  CHECK_IN_DURATION_LABELS,
  checkInAnswerCount,
  checkInHasPriority,
  checkInScope,
  createCheckInDismissals,
  createCheckInTimer,
  durationCopyFor,
  reconcileCheckIn,
  recordCheckInAnswerOutcome,
  showCheckInConfirmation,
  confirmationBack,
  reviseCheckIn,
  applyCheckInRevision,
  type CheckInConfirmation,
  shouldRecheckOnVisibility,
} from "@/src/lib/api/travel-check-in"
import {
  dismissTravelExpiryPopup,
  shouldShowTravelExpiryPopup,
} from "@/src/lib/api/travel-expiry-popup"
import {
  createTravelerPromptHandled,
  markTravelerPromptShown,
  mismatchFlowCompleted,
  shouldOpenTravelerPrompt,
  type MismatchFlowKind,
} from "@/src/lib/api/travel-location-prompt"
import {
  HOME_COUNTRY_UPDATED_ALERT,
  type SuccessAlertKind,
} from "@/src/lib/api/home-country-change-result"
import {
  createTravelPopupCloseGuard,
  isActiveTravelUpdate,
  type TravelPopupKind,
  TRAVEL_POPUP_DURATION_MS,
} from "@/src/lib/api/travel-popup"
import {
  shouldShowLocationMismatchPrompt,
  startChangeHomeCountry,
  startStillTraveling,
  type MismatchLaunch,
} from "@/src/lib/api/location-mismatch"
import {
  useIdentityVerification,
  useIdentityVerificationObserver,
} from "@/contexts/identity-verification-host"
import { startVerificationRequestedInBrowser } from "@/src/lib/api/start-verification-handoff"

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
  // The verification flow and everything that answers it is hosted by
  // IdentityVerificationHostProvider (contexts/identity-verification-host.tsx); this page
  // keeps its banner, alerts and prompts and calls the host.
  const {
    startVerification: handleVerifyMyAccount,
    openFlow,
    flowOpen: identityFlowOpen,
    connectionCheckState,
    setCooldownRetryTime,
    summary: travelSummary,
    setSummary: setTravelSummary,
    setLiveAlertsHeld,
  } = useIdentityVerification()
  const identityStatusCheckStartedRef = useRef(false)
  // The banner's own Verify My Account press, for its loading spinner only. The shared host
  // already runs one check at a time and disables the button while it does; this only shows
  // the spinner on the button that was pressed (not when the check came from elsewhere). The
  // token keeps an older press from clearing a newer one.
  const [bannerVerifyPending, setBannerVerifyPending] = useState(false)
  const bannerVerifyTokenRef = useRef(0)
  const handleBannerVerifyMyAccount = useCallback(async () => {
    const token = ++bannerVerifyTokenRef.current
    setBannerVerifyPending(true)
    try {
      await handleVerifyMyAccount()
    } finally {
      if (bannerVerifyTokenRef.current === token) setBannerVerifyPending(false)
    }
  }, [handleVerifyMyAccount])
  // Travel Mode popup (Figma node 13101-46860): the latest backend answer and which
  // popup, if any, is showing. "reminder" = a day-3/day-7 occurrence this tab claimed;
  // "expiry" = Travel Mode ended for an account that is not fully verified yet.
  const [travelPopup, setTravelPopup] = useState<"reminder" | "expiry" | null>(
    null
  )
  // Returning-user new-location prompt (Storybook ChangeLocation). The backend's
  // locationMismatch decides. It has only its two buttons: no outside click, no Escape,
  // no X, so it is closed only by answering it.
  const [locationMismatchOpen, setLocationMismatchOpen] = useState(false)
  const [locationMismatchBusy, setLocationMismatchBusy] = useState(false)
  // Which of the prompt's two buttons started the request in flight, so only that one shows
  // the spinner while the other stays disabled (the busy flag above still guards both).
  const [locationMismatchAction, setLocationMismatchAction] = useState<
    "still-traveling" | "change-home-country" | null
  >(null)
  // The same dialog for an account whose Travel Mode is in force and that was detected
  // in another country (travelModeLocationMismatch). Offered once per login: see
  // travel-location-prompt.ts. The login is marked only when a button is chosen.
  // "I'm still traveling" only closes it.
  const [travelerPromptOpen, setTravelerPromptOpen] = useState(false)
  // Handled in THIS login while a flow opened by the popup is on screen: a summary read
  // behind it must not reopen the popup. Memory only. It is cleared when that flow closes
  // unfinished, and dropped whenever the loginSessionKey changes (a logout and login that
  // keeps this page mounted must not inherit it). The per-login marker is written only
  // when a path has COMPLETED.
  const travelerPromptHandledRef = useRef(createTravelerPromptHandled())
  // Which popup answer opened the flow now on screen, or null (any other launcher).
  const mismatchFlowKindRef = useRef<MismatchFlowKind>(null)
  // A completed path: write the per-login marker and hold the popup closed for it.
  const markTravelerPromptCompleted = useCallback(
    (loginSessionKey: string | null) => {
      travelerPromptHandledRef.current.markHandled(loginSessionKey)
      markTravelerPromptShown(loginSessionKey, window.localStorage)
    },
    []
  )
  // Tells a user's close of the popup (X, Escape, swipe) from the toast closing itself.
  const travelPopupCloseGuardRef = useRef(createTravelPopupCloseGuard())

  // "Still traveling?" check-in (PMCM-641). The backend decides when it is due (/me:
  // travelReminderDue, travelReminderAvailableAt) and keeps it due until a duration answer
  // is saved or the home-country update flow is started. `occurrence` is the
  // travelReminderAvailableAt captured when the modal opened: it is what the answer sends
  // as checkInAt, and it is never re-read at submit. Closing, skipping, a refresh or
  // navigating away send nothing.
  const [checkIn, setCheckIn] = useState<{
    occurrence: string
    answerCount: number
    phase: "prompt" | "duration"
  } | null>(null)
  const [checkInSelected, setCheckInSelected] = useState<string | undefined>(
    undefined
  )
  const [checkInSaving, setCheckInSaving] = useState(false)
  const [checkInStarting, setCheckInStarting] = useState(false)
  const checkInSavingRef = useRef(false)
  // Closed in this page: memory only, scoped to this account and login, cleared by every
  // real re-check (load, a visible tab, the timer) so the still-due occurrence returns.
  const checkInDismissalsRef = useRef(createCheckInDismissals())
  const checkInReadRef = useRef<{ inFlight: boolean; lastAt: number | null }>({
    inFlight: false,
    lastAt: null,
  })
  // Shared across timer instances so a skewed clock can never loop (see createCheckInTimer).
  const checkInRetriesRef = useRef(new Map<string, number>())
  const checkInScopeKey = checkInScope(
    user?.id,
    travelSummary?.loginSessionKey ?? null
  )
  // The check-in wins while it is due or open: the traveler location prompt and the small
  // Travel Mode alert wait, and come back once it is resolved.
  // The "Travel Mode is now active!" confirmation after a saved answer, and the duration
  // screen its Back arrow returns to, are part of the check-in: the whole flow keeps holding
  // them back until it closes. Memory only; a refresh never brings it back.
  const [checkInConfirmation, setCheckInConfirmation] =
    useState<CheckInConfirmation | null>(null)
  const checkInHasPriorityNow = checkInHasPriority(
    travelSummary,
    checkIn !== null || checkInConfirmation !== null
  )
  // The dashboard reads the summary itself on every visit and starts from none, so nothing it
  // shows (popups, check-in, prompts) is decided by a copy the host kept from another page.
  useLayoutEffect(() => {
    setTravelSummary(null)
  }, [setTravelSummary])
  // The live Travel Mode card (shown by the host) waits while the check-in has priority.
  useLayoutEffect(() => {
    setLiveAlertsHeld(checkInHasPriorityNow)
    return () => setLiveAlertsHeld(false)
  }, [checkInHasPriorityNow, setLiveAlertsHeld])


  const runIdentityVerificationCheck = useCallback(async () => {
    // The backend's nextAction is the only input; an unreadable status or an
    // unknown value shows no banner.
    const summary = await fetchIdentityVerificationSummary()
    setProfileBannerShown(shouldShowProfileBanner(summary))
    setCooldownRetryTime(cooldownRetryAt(summary))
    setTravelSummary(summary)
    setLocationMismatchOpen(shouldShowLocationMismatchPrompt(summary))
  }, [])

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
  // PMCM-653 (a reviewed session approved later) is resolved by the identity verification host,
  // on whatever page the talent is on; the dashboard no longer runs a second resolver.

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

  // Start Verification on the Job Apply blocked modal lands here with a one-shot marker.
  // It is the talent's own click on that button, so it runs the same Verify My Account
  // action (VPN check, then the flow) instead of asking for a second click. It waits for
  // the Secure your account dialog like the status read does, runs once, and strips the
  // marker so a refresh or Back never starts it again.
  const startVerificationHandledRef = useRef(false)
  useEffect(() => {
    if (!startVerificationRequestedInBrowser()) return
    if (
      !shouldStartIdentityCheck({
        user,
        isTalent: !!user && resolveDashboardRole(user) === ROLE.TALENT,
        securityDialogOpen: showSecurityModal,
        alreadyStarted: startVerificationHandledRef.current,
      })
    ) {
      return
    }
    startVerificationHandledRef.current = true
    router.replace("/talent-dashboard")
    void handleVerifyMyAccount()
  }, [user, showSecurityModal, handleVerifyMyAccount, router])

  // Travel Mode expiry popup: when the backend says Travel Mode ended, show it (verified
  // or not) unless it was closed in THIS login (the opaque loginSessionKey from /me: a
  // refresh keeps it, a new login changes it; the HttpOnly session_id is never read).
  useEffect(() => {
    if (!travelSummary) return
    if (
      shouldShowTravelExpiryPopup({
        expired: travelSummary.travelModeExpired,
        loginSessionKey: travelSummary.loginSessionKey,
        storage: window.localStorage,
      })
    ) {
      setTravelPopup("expiry")
    }
  }, [travelSummary])

  // "Still traveling?" for an account whose Travel Mode is in force and that logged in
  // from a country other than its verified home country. The backend decides whether it
  // applies; the once-per-login rule is the loginSessionKey marker, written when the
  // user answers it (not when it opens), so an unanswered prompt returns after a refresh.
  useEffect(() => {
    // A due or open check-in goes first; this prompt is evaluated again when it is resolved.
    if (checkInHasPriorityNow) {
      setTravelerPromptOpen(false)
      return
    }
    if (
      !shouldOpenTravelerPrompt({
        summary: travelSummary,
        storage: window.localStorage,
        handled: travelerPromptHandledRef.current,
      })
    ) {
      return
    }
    setTravelerPromptOpen(true)
  }, [travelSummary, checkInHasPriorityNow])

  // The check-in. /me alone drives it: travelReminderDue opens the modal, no claim.
  // The summary is read on dashboard load/login (runIdentityVerificationCheck), when the tab
  // becomes visible, and when the one timer for travelReminderAvailableAt fires. A read
  // that clears the dismissals is a real re-check; the occurrence, still due on the
  // server, then opens again. Without the account switch below, a closed modal never
  // reopens in a render loop.
  const readTravelSummary = useCallback(async (clearDismissals: boolean) => {
    const next = await fetchIdentityVerificationSummary()
    if (!next) return null
    if (clearDismissals) checkInDismissalsRef.current.clear()
    setTravelSummary(next)
    return next
  }, [])
  const recheckCheckIn = useCallback(async () => {
    const read = checkInReadRef.current
    if (read.inFlight) return
    read.inFlight = true
    read.lastAt = Date.now()
    try {
      await readTravelSummary(true)
    } finally {
      read.inFlight = false
    }
  }, [readTravelSummary])

  // Opens the modal for the due occurrence, and closes one that /me no longer calls due
  // (answered in another tab, Travel Mode ended, replaced by another occurrence).
  useEffect(() => {
    setCheckIn((current) => {
      const occurrence = reconcileCheckIn(current?.occurrence ?? null, {
        summary: travelSummary,
        scope: checkInScopeKey,
        dismissals: checkInDismissalsRef.current,
        busy: identityFlowOpen,
      })
      if (current && occurrence === current.occurrence) return current
      if (!occurrence) return null
      return {
        occurrence,
        answerCount: checkInAnswerCount(travelSummary),
        phase: "prompt",
      }
    })
  }, [travelSummary, checkInScopeKey, identityFlowOpen])

  useEffect(() => {
    setCheckInSelected(undefined)
  }, [checkIn?.occurrence, checkIn?.phase])

  // One timer for the next occurrence; no polling.
  useEffect(() => {
    const timer = createCheckInTimer({
      onFire: () => void recheckCheckIn(),
      retries: checkInRetriesRef.current,
    })
    timer.update(travelSummary)
    return () => timer.dispose()
  }, [travelSummary, recheckCheckIn])

  // A tab that becomes visible looks again (an answer in another tab, a new occurrence).
  useEffect(() => {
    if (!user || resolveDashboardRole(user) !== ROLE.TALENT) return
    const onVisible = () => {
      if (!identityStatusCheckStartedRef.current) return
      if (
        !shouldRecheckOnVisibility({
          visibilityState: document.visibilityState,
          inFlight: checkInReadRef.current.inFlight,
          lastCheckAt: checkInReadRef.current.lastAt,
          now: Date.now(),
        })
      ) {
        return
      }
      void recheckCheckIn()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [user, recheckCheckIn])

  // Another account in the same mounted page never inherits this one's check-in state.
  const checkInUserRef = useRef<string | undefined>(user?.id)
  useEffect(() => {
    if (checkInUserRef.current === user?.id) return
    const previous = checkInUserRef.current
    checkInUserRef.current = user?.id
    if (previous === undefined) return // the first user to load, not a switch
    checkInDismissalsRef.current.reset()
    checkInRetriesRef.current.clear()
    setCheckIn(null)
    setTravelSummary(null)
  }, [user?.id])

  // Closing the popup (X, swipe or Escape). A closed reminder is spent: its occurrence
  // was claimed when it opened. A closed expiry popup is remembered for this login only.
  const handleTravelPopupClose = useCallback(() => {
    if (travelPopup === "expiry") {
      dismissTravelExpiryPopup(travelSummary?.loginSessionKey ?? null, window.localStorage)
    }
    setTravelPopup(null)
  }, [travelPopup, travelSummary])

  // "Update": hide the popup (nothing is remembered) and open the existing verification
  // flow at "Tell us more about your current location", which keeps its own
  // Temporarily traveling / Permanently relocated choices. The location shown behind it
  // comes from the server only; no browser location permission is requested here.
  // WHY the popup opened decides one thing: for a reminder while Travel Mode is still in
  // force, "Temporarily traveling" must not start a new period (the flow is told so and
  // skips the duration screen); for an expired Travel Mode it continues to the duration
  // screen so a new period can be activated. A reminder popup can stay open for a long
  // time, so /me is re-read to make sure Travel Mode has not ended meanwhile.
  const handleTravelUpdate = useCallback(
    async (kindOverride?: TravelPopupKind) => {
    const kind = kindOverride ?? travelPopup
    setTravelPopup(null)
    const fresh = kind === "reminder" ? await fetchIdentityVerificationSummary() : null
    const activeTravelModeUpdate = isActiveTravelUpdate(kind, fresh)
    const location = await getDetectedLocation()
    openFlow(
      {
        initialState: "current-location-showcase",
        activeTravelModeUpdate,
        detectBrowserLocationOnRelocate: true,
      },
      { detectedLocation: location }
    )
    },
    [travelPopup, openFlow]
  )

  // The live Travel Mode card's Update: the same flow and the same detection as the popup's
  // Update for a reminder (Travel Mode in force, so "Temporarily traveling" changes nothing).
  // It is not a dismissal: the card stays eligible, and the flow's close re-reads the state.
  const handleLiveTravelUpdate = useCallback(
    () => handleTravelUpdate("reminder"),
    [handleTravelUpdate]
  )

  // The new-location prompt's two answers. Each records the choice, then opens the
  // existing verification flow: "currently traveling" on its duration screen, "change my
  // home country" from the top so the home country is confirmed again.
  const openFlowFromMismatch = useCallback(
    (launch: MismatchLaunch, kind: MismatchFlowKind) => {
      // Held only while the flow is on screen; handleIdentityFlowOpenChange releases it.
      travelerPromptHandledRef.current.markHandled(
        travelSummary?.loginSessionKey ?? null
      )
      mismatchFlowKindRef.current = kind
      setLocationMismatchOpen(false)
      setTravelerPromptOpen(false)
      openFlow(
        { initialState: launch.initialState },
        { detectedLocation: launch.location }
      )
    },
    [travelSummary, openFlow]
  )

  // The flow opened by a popup answer closed. If its duration save succeeded the login is
  // answered (marker written). Otherwise nothing was completed: nothing is written, the
  // in-memory hold is released and /me is read again, so the popup is offered again.
  // Flows opened by anything else are untouched.
  // (The host owns the flow's open state and, for an Update on a Travel Mode that is already
  // in force, replaces the flow instance on close so its own no-op confirmation toast never
  // mounts: see handleIdentityFlowOpenChange in contexts/identity-verification-host.tsx. It
  // then calls this.)
  const handleIdentityFlowOpenChange = useCallback(
    (open: boolean) => {
      const kind = mismatchFlowKindRef.current
      if (!open && kind === null) {
        // An ordinary flow closed (Verify My Account, or an Update): re-read /me so what it
        // completed shows up without a refresh. A finished Travel Mode activation turns the
        // live "You are in Travel Mode" card on (and, through the effect on travelSummary,
        // loads and reconciles the persistent alert); a completed change that ended Travel
        // Mode turns it off; an unfinished flow changes nothing. Only the summary is
        // updated here: the banner, the prompts and the completion markers are the
        // mismatch flows' own business, below.
        void fetchIdentityVerificationSummary().then((fresh) => {
          if (fresh) setTravelSummary(fresh)
        })
        return
      }
      if (open || kind === null) return
      mismatchFlowKindRef.current = null
      void fetchIdentityVerificationSummary().then((fresh) => {
        if (mismatchFlowCompleted(kind, fresh)) {
          markTravelerPromptCompleted(fresh?.loginSessionKey ?? null)
        } else {
          travelerPromptHandledRef.current.reset()
        }
        if (!fresh) return
        setProfileBannerShown(shouldShowProfileBanner(fresh))
        setCooldownRetryTime(cooldownRetryAt(fresh))
        setTravelSummary(fresh)
        setLocationMismatchOpen(shouldShowLocationMismatchPrompt(fresh))
      })
    },
    [markTravelerPromptCompleted]
  )

  const handleStillTraveling = useCallback(async () => {
    setLocationMismatchBusy(true)
    try {
      // Saves nothing: the duration screen's Confirm/Skip is what activates Travel Mode.
      openFlowFromMismatch(await startStillTraveling(), "traveling")
    } catch (error) {
      // Nothing was started: the prompt stays open to try again.
      console.error("[identity-verification] could not open the flow", error)
    } finally {
      setLocationMismatchBusy(false)
    }
  }, [openFlowFromMismatch])

  // "I'm still traveling" for an active traveler: Travel Mode and the verified home
  // country stay exactly as they are and the prompt closes (the duration is not asked
  // again here). The only write is dropping a home-country claim that has no live
  // session (an abandoned or expired Didit session), which the backend refuses for a
  // running or in-review one. The login is marked only after that has succeeded.
  const handleTravelerStillTraveling = useCallback(async () => {
    setLocationMismatchBusy(true)
    try {
      if (travelSummary?.pendingHomeCountry) {
        const { IdentityVerificationAPI } = await import(
          "@/service/http/identity-verification"
        )
        await IdentityVerificationAPI.recordTravelClassification(
          "temporarily_traveling"
        )
      }
      markTravelerPromptCompleted(travelSummary?.loginSessionKey ?? null)
      setTravelerPromptOpen(false)
    } catch (error) {
      // Nothing was changed: the prompt stays open to try again.
      console.error("[identity-verification] could not confirm still traveling", error)
    } finally {
      setLocationMismatchBusy(false)
    }
  }, [markTravelerPromptCompleted, travelSummary])

  const handleChangeHomeCountry = useCallback(async () => {
    setLocationMismatchBusy(true)
    try {
      // Saves nothing and marks nothing: the claim is created only by the flow's own
      // explicit country confirmation, and the backend then keeps the prompt quiet.
      openFlowFromMismatch(await startChangeHomeCountry(), "change-country")
    } catch (error) {
      // Nothing was started: the prompt stays open to try again.
      console.error("[identity-verification] could not open the flow", error)
    } finally {
      setLocationMismatchBusy(false)
    }
  }, [openFlowFromMismatch])

  // Skip, X, Escape or a click outside: not an answer. Nothing is sent and the occurrence
  // stays due; it is only kept from reopening until the next real re-check.
  const handleCheckInDismiss = useCallback(() => {
    if (checkIn) {
      checkInDismissalsRef.current.dismiss(checkInScopeKey, checkIn.occurrence)
    }
    setCheckIn(null)
  }, [checkIn, checkInScopeKey])

  // "I'm still traveling": ask the duration question (first-time or "asked before" copy).
  const handleCheckInStillTraveling = useCallback(() => {
    setCheckIn((current) => (current ? { ...current, phase: "duration" } : current))
  }, [])

  const handleCheckInBack = useCallback(() => {
    setCheckIn((current) => (current ? { ...current, phase: "prompt" } : current))
  }, [])

  // A duration choice IS the answer ("Not sure" included): it is sent once, with the
  // occurrence captured when the modal opened.
  const handleCheckInAnswer = useCallback(
    async (label: string) => {
      if (!checkIn || checkInSavingRef.current) return
      const occurrence = checkIn.occurrence
      checkInSavingRef.current = true
      setCheckInSaving(true)
      setCheckInSelected(label)
      try {
        const outcome = await answerCheckIn(
          {
            post: async (duration, checkInAt) => {
              const { IdentityVerificationAPI } = await import(
                "@/service/http/identity-verification"
              )
              return IdentityVerificationAPI.updateActiveTravelDuration(
                duration,
                checkInAt
              )
            },
          },
          label,
          occurrence
        )
        if (outcome === "failed") {
          // Nothing was saved: the screen stays open to try again.
          console.error("[identity-verification] could not save the check-in answer")
          setCheckInSelected(undefined)
          return
        }
        // Resolve the occurrence locally first: no render, and no summary read before the
        // answer was saved, may reopen the modal while /me is read again below.
        recordCheckInAnswerOutcome({
          outcome,
          scope: checkInScopeKey,
          occurrence,
          dismissals: checkInDismissalsRef.current,
        })
        // Opened in the same batch that closes the question, so the small alert and the
        // location-mismatch popup never get a gap to appear in.
        if (outcome === "saved") {
          setCheckInConfirmation(showCheckInConfirmation(label, checkIn.answerCount))
        }
        setCheckIn(null)
        if (outcome === "in_progress") {
          // A home-country change owns the account now: follow the state /me returns.
          await runIdentityVerificationCheck()
        } else {
          // Saved, or another tab already answered it: read the real state.
          await readTravelSummary(false)
        }
      } finally {
        checkInSavingRef.current = false
        setCheckInSaving(false)
      }
    },
    [checkIn, checkInScopeKey, readTravelSummary, runIdentityVerificationCheck]
  )

  // Done or X on the confirmation, or Skip or X on the duration screen Back returned to,
  // closes the WHOLE flow and sends nothing: the duration that was saved stays. Releasing
  // the check-in's priority lets the traveler prompt effect run again; the location-mismatch
  // prompt is evaluated against the summary read after the answer was saved.
  const handleCheckInConfirmationClose = useCallback(() => {
    setCheckInConfirmation(null)
    setLocationMismatchOpen(shouldShowLocationMismatchPrompt(travelSummary))
  }, [travelSummary])

  // Back toggles between the confirmation and the duration screen (the saved option is
  // preselected there); it never closes the flow and sends nothing.
  const handleCheckInConfirmationBack = useCallback(() => {
    setCheckInConfirmation((current) => (current ? confirmationBack(current) : current))
  }, [])

  // A different duration chosen on the revision screen: the same update endpoint without
  // checkInAt (no extra check-in is counted, the original occurrence stays resolved).
  // Saved: the confirmation is shown again. Failed: the screen stays on the saved option.
  const handleCheckInRevise = useCallback(
    async (label: string) => {
      if (!checkInConfirmation || checkInSavingRef.current) return
      if (label === checkInConfirmation.saved) return
      checkInSavingRef.current = true
      setCheckInSaving(true)
      setCheckInSelected(label)
      try {
        const outcome = await reviseCheckIn(
          {
            post: async (duration) => {
              const { IdentityVerificationAPI } = await import(
                "@/service/http/identity-verification"
              )
              return IdentityVerificationAPI.reviseActiveTravelDuration(duration)
            },
          },
          label
        )
        if (outcome === "failed") {
          console.error("[identity-verification] could not save the new duration")
        }
        const next = applyCheckInRevision(checkInConfirmation, label, outcome)
        setCheckInConfirmation(next)
        setCheckInSelected(undefined)
        if (outcome === "in_progress") {
          await runIdentityVerificationCheck()
        } else if (outcome !== "failed") {
          await readTravelSummary(false)
        }
      } finally {
        checkInSavingRef.current = false
        setCheckInSaving(false)
      }
    },
    [checkInConfirmation, readTravelSummary, runIdentityVerificationCheck]
  )

  // "Update my home country" enters the existing home-country flow: the current location
  // (city, region, country and map), "Is this your home country?", then Didit. Starting
  // that flow is what resolves the check-in on the server; until then it stays due, so it
  // is only kept from reopening while the flow is on screen.
  const handleCheckInUpdateHomeCountry = useCallback(async () => {
    if (!checkIn || checkInStarting) return
    setCheckInStarting(true)
    try {
      const launch = await startChangeHomeCountry()
      checkInDismissalsRef.current.dismiss(checkInScopeKey, checkIn.occurrence)
      setCheckIn(null)
      openFlowFromMismatch(launch, "change-country")
    } catch (error) {
      // Nothing was started: the modal stays open to try again.
      console.error("[identity-verification] could not open the flow", error)
    } finally {
      setCheckInStarting(false)
    }
  }, [checkIn, checkInStarting, checkInScopeKey, openFlowFromMismatch])

  // The host calls these when what it did concerns something this page owns.
  useIdentityVerificationObserver({
    handleIdentityFlowOpenChange,
    setProfileBannerShown,
    runIdentityVerificationCheck,
    setSuccessAlertKind,
    handleLiveTravelUpdate,
  })

  return (
    <>
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <SecuritySettingsStepper
            onCloseModal={() => setShowSecurityModal(false)}
          />
        </div>
      )}

      {/* "Still traveling?" check-in (Figma 13101-46785) and its duration question
          (13101-46818, "asked before" copy from the second answer on). Built from the
          design system's Dialog, Button, RadioGroup and Alert only. Closing is not an
          answer; a duration choice is. */}
      <Dialog
        open={checkIn !== null}
        onOpenChange={(open) => {
          if (!open) handleCheckInDismiss()
        }}
      >
        {checkIn?.phase === "prompt" && (
          <DialogContent className="w-[405px] pt-[50px]">
            <div className="flex items-center justify-center">
              <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
                <AlertTriangle className="size-6" />
              </div>
            </div>

            <div className="mt-5 flex flex-col items-center gap-y-2">
              <DialogTitle className="max-w-[317px] text-center text-lg font-semibold leading-7 text-dark-blue-400">
                {CHECK_IN_COPY.prompt.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-center leading-5 text-dark-blue-400">
                {CHECK_IN_COPY.prompt.body}
              </DialogDescription>
            </div>

            <div className="mx-auto mt-[50px] flex w-[calc(100%+2rem)] max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-3">
              <Button
                variant="outlined"
                visual="gray"
                size="md"
                disabled={checkInStarting}
                onClick={handleCheckInStillTraveling}
              >
                {CHECK_IN_COPY.prompt.stillTraveling}
              </Button>
              <Button
                className="min-w-[227px]"
                variant="light"
                size="md"
                disabled={checkInStarting}
                loading={checkInStarting}
                aria-busy={checkInStarting}
                onClick={() => void handleCheckInUpdateHomeCountry()}
              >
                {CHECK_IN_COPY.prompt.updateHomeCountry}
              </Button>
            </div>
          </DialogContent>
        )}

        {checkIn?.phase === "duration" && (
          <DialogContent className="max-w-[650px]">
            <div className="flex items-start justify-between">
              <IconButton
                size="md"
                visual="gray"
                variant="ghost"
                disabled={checkInSaving}
                onClick={handleCheckInBack}
              >
                <ArrowLeft className="size-5" />
              </IconButton>

              <IconButton
                className="text-gray-500/50 hover:text-gray-500"
                size="md"
                visual="gray"
                variant="ghost"
                onClick={handleCheckInDismiss}
              >
                <X className="size-5" />
              </IconButton>
            </div>

            <div className="mt-3 max-w-[554px] pt-[9px]">
              <DialogTitle className="text-lg font-medium leading-5 text-dark-blue-400">
                {durationCopyFor(checkIn.answerCount).title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm font-light leading-5 text-dark-blue-400">
                {durationCopyFor(checkIn.answerCount).body}
              </DialogDescription>
            </div>

            <RadioGroup
              className="mt-6"
              aria-label={durationCopyFor(checkIn.answerCount).title}
              value={checkInSelected}
              disabled={checkInSaving}
              onValueChange={(label) => void handleCheckInAnswer(label)}
            >
              {CHECK_IN_DURATION_LABELS.map((label, index) => (
                <div key={label} className={TRAVEL_DURATION_OPTION_ROW_CLASS}>
                  <RadioGroupItem
                    className={TRAVEL_DURATION_OPTION_RADIO_CLASS}
                    value={label}
                    id={`check-in-duration-${index}`}
                  />
                  <Label
                    htmlFor={`check-in-duration-${index}`}
                    className={TRAVEL_DURATION_OPTION_LABEL_CLASS}
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <Alert className="mt-6">
              <AlertIcon>
                <Info className="size-5" />
              </AlertIcon>
              <AlertContent>
                <AlertTitle>{durationCopyFor(checkIn.answerCount).alert}</AlertTitle>
              </AlertContent>
            </Alert>

            <div className="mt-6 grid">
              <Button
                variant="outlined"
                visual="gray"
                disabled={checkInSaving}
                onClick={handleCheckInDismiss}
              >
                {CHECK_IN_COPY.skip}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* "Travel Mode is now active!": the Storybook TravelMode design (stories/
          identity-verfication.stories.tsx), shown once after a saved duration answer.
          Back opens the duration screen with the saved option selected; a different choice
          is saved as a revision and the confirmation is shown again. Done, X, or Skip/X on
          the duration screen close the whole flow; nothing is persisted, so a refresh never
          shows it again. */}
      <Dialog
        open={checkInConfirmation !== null}
        onOpenChange={(open) => {
          if (!open) handleCheckInConfirmationClose()
        }}
      >
        {checkInConfirmation?.screen === "confirmation" && (
          <DialogContent className="max-w-[650px]">
            <div className="flex items-center justify-between">
              <IconButton
                size="md"
                visual="gray"
                variant="ghost"
                onClick={handleCheckInConfirmationBack}
              >
                <ArrowLeft className="size-5" />
              </IconButton>

              <IconButton
                className="text-gray-500/50 hover:text-gray-500"
                size="md"
                visual="gray"
                variant="ghost"
                onClick={handleCheckInConfirmationClose}
              >
                <X className="size-5" />
              </IconButton>
            </div>

            <div className="mt-3 pt-[9px]">
              <DialogTitle className="text-lg font-medium text-dark-blue-400">
                {CHECK_IN_COPY.confirmation.title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm font-light text-dark-blue-400">
                {CHECK_IN_COPY.confirmation.body}
              </DialogDescription>
            </div>

            <div className="mt-6 space-y-6">
              <Alert>
                <AlertIcon>
                  <Info className="size-5" />
                </AlertIcon>
                <AlertContent>
                  <AlertTitle>{CHECK_IN_COPY.confirmation.alert}</AlertTitle>
                </AlertContent>
              </Alert>

              <div className="grid">
                <Button onClick={handleCheckInConfirmationClose}>
                  {CHECK_IN_COPY.confirmation.done}
                </Button>
              </div>
            </div>
          </DialogContent>
        )}

        {checkInConfirmation?.screen === "revise" && (
          <DialogContent className="max-w-[650px]">
            <div className="flex items-start justify-between">
              <IconButton
                size="md"
                visual="gray"
                variant="ghost"
                disabled={checkInSaving}
                onClick={handleCheckInConfirmationBack}
              >
                <ArrowLeft className="size-5" />
              </IconButton>

              <IconButton
                className="text-gray-500/50 hover:text-gray-500"
                size="md"
                visual="gray"
                variant="ghost"
                onClick={handleCheckInConfirmationClose}
              >
                <X className="size-5" />
              </IconButton>
            </div>

            <div className="mt-3 max-w-[554px] pt-[9px]">
              <DialogTitle className="text-lg font-medium leading-5 text-dark-blue-400">
                {durationCopyFor(checkInConfirmation.answerCount).title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm font-light leading-5 text-dark-blue-400">
                {durationCopyFor(checkInConfirmation.answerCount).body}
              </DialogDescription>
            </div>

            <RadioGroup
              className="mt-6"
              aria-label={durationCopyFor(checkInConfirmation.answerCount).title}
              value={checkInSelected ?? checkInConfirmation.saved}
              disabled={checkInSaving}
              onValueChange={(label) => void handleCheckInRevise(label)}
            >
              {CHECK_IN_DURATION_LABELS.map((label, index) => (
                <div key={label} className={TRAVEL_DURATION_OPTION_ROW_CLASS}>
                  <RadioGroupItem
                    className={TRAVEL_DURATION_OPTION_RADIO_CLASS}
                    value={label}
                    id={`check-in-revise-duration-${index}`}
                  />
                  <Label
                    htmlFor={`check-in-revise-duration-${index}`}
                    className={TRAVEL_DURATION_OPTION_LABEL_CLASS}
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <Alert className="mt-6">
              <AlertIcon>
                <Info className="size-5" />
              </AlertIcon>
              <AlertContent>
                <AlertTitle>{durationCopyFor(checkInConfirmation.answerCount).alert}</AlertTitle>
              </AlertContent>
            </Alert>

            <div className="mt-6 grid">
              <Button
                variant="outlined"
                visual="gray"
                disabled={checkInSaving}
                onClick={handleCheckInConfirmationClose}
              >
                {CHECK_IN_COPY.skip}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Not rendered while the check-in is due or open: it goes first. */}
      {!checkInHasPriorityNow && (
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

            <div className="mx-auto mt-[50px] grid w-full max-w-[calc(100vw-2rem)] grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
              <Button
                variant="outlined"
                size="md"
                disabled={locationMismatchBusy}
                loading={
                  locationMismatchBusy &&
                  locationMismatchAction === "still-traveling"
                }
                aria-busy={
                  locationMismatchBusy &&
                  locationMismatchAction === "still-traveling"
                }
                onClick={() => {
                  if (locationMismatchBusy) return
                  setLocationMismatchAction("still-traveling")
                  void (travelerPromptOpen
                    ? handleTravelerStillTraveling()
                    : handleStillTraveling())
                }}
              >
                I’m still traveling
              </Button>
              <Button
                size="md"
                disabled={locationMismatchBusy}
                loading={
                  locationMismatchBusy &&
                  locationMismatchAction === "change-home-country"
                }
                aria-busy={
                  locationMismatchBusy &&
                  locationMismatchAction === "change-home-country"
                }
                onClick={() => {
                  if (locationMismatchBusy) return
                  setLocationMismatchAction("change-home-country")
                  void handleChangeHomeCountry()
                }}
              >
                Change my home country
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

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
          open={travelPopup !== null && !checkInHasPriorityNow}
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
                        className="h-5 min-w-[178px] justify-start gap-x-2 p-0 text-sm font-semibold leading-5 text-warning-600"
                        disabled={connectionCheckState === "checking"}
                        loading={bannerVerifyPending}
                        aria-busy={bannerVerifyPending}
                        onClick={() => void handleBannerVerifyMyAccount()}
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
