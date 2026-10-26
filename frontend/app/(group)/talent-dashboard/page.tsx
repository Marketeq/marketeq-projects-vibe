"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
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
  ClockStopwatch,
  MarkerPin01,
  Info,
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
import { StatusAlertsAPI } from "@/service/http/status-alerts"
import type { StatusAlert } from "@/src/lib/api/status-alerts"
import {
  type DismissalState,
  buildAlertStack,
  selectVisibleAlerts,
} from "@/src/lib/api/status-alert-state"
import {
  dismissPersistentAlertOptimistically,
  RENDERED_STATUS_ALERT_TYPES,
  type LiveDisplayAlert,
  dismissLiveAlert,
  isRenderedAlert,
} from "@/src/lib/api/status-alert-dismissal"
import { readLiveDismissals } from "@/src/lib/api/live-alert-dismissal"
import {
  readTravelActivationsInLogin,
  rememberTravelActivationInLogin,
} from "@/src/lib/api/travel-activation-login"
import {
  ALERT_RECENCY_WINDOW_MS,
  hasNewAlertOfType,
  hasRecentAlertOfType,
  isNewTravelActivation,
  reconcileStatusAlerts,
} from "@/src/lib/api/status-alert-reconcile"
import {
  STATUS_ALERT_CLOSE_LABEL,
  STATUS_ALERT_DISMISS_ERROR,
} from "@/src/lib/api/status-alert-copy"
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
  clearReviewedResult,
  markReviewedResult,
  reconcileReviewedSession,
  resolveReviewedResult,
  shouldMarkReviewedResult,
} from "@/src/lib/api/reviewed-approval-result"
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
  type TravelPopupKind,
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
  // Persistent status alerts (PMCM-651), kept by notification-service: dismissal is
  // stored per account on the backend, so it holds across sessions and devices. This
  // phase renders the Travel Mode alert only.
  const [statusAlerts, setStatusAlerts] = useState<StatusAlert[]>([])
  const [statusAlertDismissal, setStatusAlertDismissal] =
    useState<DismissalState>({
      dismissedPersistentIds: new Set(),
      dismissedLiveKeys: new Set(),
    })
  const [statusAlertDismissFailed, setStatusAlertDismissFailed] =
    useState(false)
  const statusAlertRequestRef = useRef(0)
  // The live "You are in Travel Mode" card (PMCM-651) is derived from the identity summary,
  // not stored: its dismissal is per login (loginSessionKey) and lives in this browser only.
  // A flow opened by its Update action re-reads the summary when it closes (see
  // handleIdentityFlowOpenChange), so the card goes away once Travel Mode has ended.
  const statusAlertsRef = useRef<StatusAlert[]>([])
  const alertReconcileGenRef = useRef(0)
  const previousTravelSummaryRef =
    useRef<IdentityVerificationSummaryView | null>(null)
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


  const runIdentityVerificationCheck = useCallback(async () => {
    // The backend's nextAction is the only input; an unreadable status or an
    // unknown value shows no banner.
    const summary = await fetchIdentityVerificationSummary()
    setProfileBannerShown(shouldShowProfileBanner(summary))
    setCooldownRetryTime(cooldownRetryAt(summary))
    setTravelSummary(summary)
    setLocationMismatchOpen(shouldShowLocationMismatchPrompt(summary))
  }, [])

  // Reads the persistent alerts on load and whenever the identity summary is re-read (a
  // Travel Mode activation in this session arrives as a new alert). Only the latest read
  // is applied, and a failed read leaves the alerts that are already showing.
  useEffect(() => {
    // Talent accounts only: a client that lands here is redirected away and has no alerts.
    if (!user || resolveDashboardRole(user) !== ROLE.TALENT) return
    const request = ++statusAlertRequestRef.current
    StatusAlertsAPI.list()
      .then((alerts) => {
        if (request === statusAlertRequestRef.current) setStatusAlerts(alerts)
      })
      .catch((error) => {
        console.error("[status-alerts] could not load the alerts", error)
      })
  }, [user, travelSummary])

  useEffect(() => {
    statusAlertsRef.current = statusAlerts
  }, [statusAlerts])
  // A page leaving ends any reconciliation still waiting to read.
  useEffect(
    () => () => {
      alertReconcileGenRef.current = -1
    },
    []
  )

  // A status alert that this page visit just caused (a Travel Mode activation, an approval) is
  // stored ASYNCHRONOUSLY by notification-service: the identity service publishes the event
  // after its write, and the consumer stores it (and supersedes the alert it replaces) a moment
  // later. The list read that comes with the page, or with a summary, can run before that, so
  // the list is re-read a bounded number of times (about 3 seconds in all, stopping at the
  // first read that has a NEW alert of an expected type). Nothing polls; a newer run or the
  // page leaving ends an older one, and the newest read always wins over an older, slower one.
  //
  // The awaited alert is a NEW one (an id the page did not already hold); with sinceMs it is
  // instead one created at or after that time, which also covers an alert the page's own first
  // read already contained, and cannot be satisfied by an older alert of the same type.
  const startAlertReconcile = useCallback(
    (expected: StatusAlert["type"][], options: { sinceMs?: number } = {}) => {
      const known = new Set(
        statusAlertsRef.current
          .filter((a) => expected.includes(a.type))
          .map((a) => a.id)
      )
      const generation = ++alertReconcileGenRef.current
      let latestRequest = 0
      void reconcileStatusAlerts({
        list: () => {
          latestRequest = ++statusAlertRequestRef.current
          return StatusAlertsAPI.list()
        },
        isSettled: (alerts) =>
          expected.some((type) =>
            options.sinceMs !== undefined
              ? hasRecentAlertOfType(alerts, type, options.sinceMs)
              : hasNewAlertOfType(alerts, type, known)
          ),
        apply: (alerts) => {
          if (latestRequest === statusAlertRequestRef.current) {
            setStatusAlerts(alerts)
          }
        },
        isCurrent: () => generation === alertReconcileGenRef.current,
        sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      })
    },
    []
  )

  // A Travel Mode activation made in this page visit (the first-time flow's "Done", the
  // traveler prompt, an Update that starts a new period): /me already says so, but the
  // persistent "Travel Mode is on" alert is not stored yet. An unfinished flow, which creates
  // no activation, never starts this.
  useEffect(() => {
    const previous = previousTravelSummaryRef.current
    previousTravelSummaryRef.current = travelSummary
    if (!user || !isNewTravelActivation(previous, travelSummary)) return
    startAlertReconcile(["travel_mode"])
  }, [user, travelSummary, startAlertReconcile])

  // Which login this is, for the live cards' per-login dismissal. Unknown until the
  // identity summary has been read; "unkeyed" (an older token) hides nothing across logins
  // but also remembers nothing.
  const liveLoginKey = travelSummary?.loginSessionKey ?? null
  // Travel Mode activations made in THIS login (kept in this browser under the login's key, so
  // a refresh keeps them and a new login starts empty): the persistent "Travel Mode is on"
  // card announces those, and the live Update card waits for a later login. Marked in a layout
  // effect, before the first paint that shows the new state, so Update never flashes.
  const [travelActivationsHere, setTravelActivationsHere] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  useEffect(() => {
    setTravelActivationsHere(
      readTravelActivationsInLogin(liveLoginKey, window.localStorage)
    )
  }, [liveLoginKey])
  useLayoutEffect(() => {
    if (!user || !isNewTravelActivation(previousTravelSummaryRef.current, travelSummary)) return
    const occurrence = travelSummary?.travelModeEndsAt
    if (!occurrence) return
    rememberTravelActivationInLogin(liveLoginKey, occurrence, window.localStorage)
    setTravelActivationsHere((prev) => new Set([...prev, occurrence]))
  }, [user, travelSummary, liveLoginKey])
  useEffect(() => {
    setStatusAlertDismissal((prev) => ({
      ...prev,
      dismissedLiveKeys: readLiveDismissals(liveLoginKey, window.localStorage),
    }))
  }, [liveLoginKey])
  // A live card is dismissed for this login only: hidden now, remembered in this browser
  // under the login's key, and never sent to the backend.
  const handleDismissLiveAlert = useCallback(
    (card: LiveDisplayAlert) =>
      dismissLiveAlert({
        alert: card,
        loginSessionKey: liveLoginKey,
        storage: window.localStorage,
        update: setStatusAlertDismissal,
      }),
    [liveLoginKey]
  )

  const statusAlertStack = useMemo(
    () =>
      selectVisibleAlerts(
        buildAlertStack({
          persistent: statusAlerts.filter((a) =>
            (RENDERED_STATUS_ALERT_TYPES as readonly string[]).includes(a.type)
          ),
          ...statusAlertDismissal,
          // Nothing live is shown while the profile is loading, or while the check-in
          // modal has priority (the same rule as the existing Travel Mode popup).
          loginSessionKey: travelSummary ? liveLoginKey ?? "unkeyed" : undefined,
          travelModeActive:
            travelSummary && !checkInHasPriorityNow
              ? isTravelModeInForce(travelSummary)
              : undefined,
          travelModeOccurrence: travelSummary?.travelModeEndsAt ?? null,
          travelModeActivatedThisLogin: Boolean(
            travelSummary?.travelModeEndsAt &&
              travelActivationsHere.has(travelSummary.travelModeEndsAt)
          ),
          travelModeActivatedAt: null,
        })
      ),
    [
      statusAlerts,
      statusAlertDismissal,
      travelSummary,
      liveLoginKey,
      travelActivationsHere,
      checkInHasPriorityNow,
    ]
  )

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
  // The modal's existing Done button only closes the modal. The top-right notification for
  // this event is the persistent Verified (or Home Country Updated) card of the status-alert
  // stack, loaded by startAlertReconcile when the approval was seen; the old temporary
  // "All set!" alert is not opened any more, so two cards never collide.
  const handleSuccessDone = () => {
    setVerifiedModalOpen(false)
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
        // The approval was just processed: its persistent alert (and the Submitted one it
        // replaces) is stored a moment later, so reload the list until it is there.
        startAlertReconcile(["verified", "home_country_updated"])
        // The immediate result is handled by the modal: no review alert may follow it.
        clearReviewedResult(window.localStorage, user.id)
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
        // A home-country approval arrives as a backend notification: no alert from here.
        clearHomeCountryChange(window.localStorage)
        // Either kind (first-time or a home-country change) remembers it is under review,
        // so the approved result can be shown (see reviewed-approval-result.ts); the
        // backend's own "home country was updated" notification is separate.
        if (shouldMarkReviewedResult(summary)) {
          markReviewedResult(window.localStorage, user.id)
        }
        setVerificationGateOpen(false)
        setProfileBannerShown(false)
        setPendingModalOpen(true)
        // In review, first-time or a home-country change: the persistent "location
        // verification was submitted" alert was stored (asynchronously) by the reconcile that
        // just ran, so load it without waiting for Done or a refresh. Only Submitted is
        // awaited: Home Country Updated exists only after an approval.
        startAlertReconcile(["submitted_for_review"], {
          sinceMs: Date.now() - ALERT_RECENCY_WINDOW_MS,
        })
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
    // Coming back from the provider with Back can restore this page from the browser's
    // back/forward cache without running anything again (no mount, no visibility change):
    // a restored page rechecks exactly like a tab that became visible.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted || !hasAwaitingResult(window.localStorage)) return
      attempts = 0
      if (timer) clearTimeout(timer)
      // Nothing reconciled this trip while the page was frozen, and without the webhook
      // the server still has the session as started: reconcile (once per return, the
      // shared reconciler dedupes) and then read /me, exactly as a fresh load does.
      returnReconcilerRef.current ??= createReturnReconciler({
        awaitingStorage: window.localStorage,
        markerStorage: window.sessionStorage,
      })
      void returnReconcilerRef.current.run().then((result) => apply(result.summary))
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("pageshow", onPageShow)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("pageshow", onPageShow)
    }
  }, [user, startAlertReconcile])

  // PMCM-653: a first-time verification that was shown as submitted and is approved
  // later shows the existing success alert once. The marker only says this browser is
  // waiting; the backend summary (nextAction complete AND fullyVerified) decides. It is
  // rechecked on load (one reconcile, then GET /me) and whenever the tab becomes
  // visible (GET only), with no timer: a review can take days. Nothing is shown while
  // the review continues, and the marker is consumed in the same step that shows it.
  const reviewedCheckStartedRef = useRef(false)
  useEffect(() => {
    if (!user) return
    if (resolveDashboardRole(user) !== ROLE.TALENT) return

    const check = async (withReconcile: boolean) => {
      const outcome = await resolveReviewedResult({
        storage: window.localStorage,
        userId: user.id,
        fetchSummary: fetchIdentityVerificationSummary,
        reconcile: withReconcile ? reconcileReviewedSession : undefined,
      })
      if (outcome !== "approved") return
      setVerificationGateOpen(false)
      setProfileBannerShown(false)
      // Approved after review: the page's first alert read may have run before the approval
      // was processed and still show "submitted". The persistent Verified card replaces it;
      // the old temporary "All set!" alert is not opened (it would sit on top of that card).
      startAlertReconcile(["verified", "home_country_updated"])
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void check(false)
    }

    // StrictMode runs this effect twice; the load check (and its reconcile) runs once.
    if (!reviewedCheckStartedRef.current) {
      reviewedCheckStartedRef.current = true
      void check(true)
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [user, startAlertReconcile])

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
    setDetectedLocation(location)
    setFlowLaunch((prev) => ({
      key: prev.key + 1,
      initialState: "current-location-showcase",
      activeTravelModeUpdate,
    }))
    setIdentityFlowOpen(true)
    },
    [travelPopup]
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
      setDetectedLocation(launch.location)
      setFlowLaunch((prev) => ({ key: prev.key + 1, initialState: launch.initialState }))
      setLocationMismatchOpen(false)
      setTravelerPromptOpen(false)
      setIdentityFlowOpen(true)
    },
    [travelSummary]
  )

  // The flow opened by a popup answer closed. If its duration save succeeded the login is
  // answered (marker written). Otherwise nothing was completed: nothing is written, the
  // in-memory hold is released and /me is read again, so the popup is offered again.
  // Flows opened by anything else are untouched.
  const handleIdentityFlowOpenChange = useCallback(
    (open: boolean) => {
      setIdentityFlowOpen(open)
      if (!open) {
        // For an Update on a Travel Mode that is already in force, the flow's "Temporarily
        // traveling" is a no-op: it opens its own temporary confirmation toast and
        // closes (components/identity-verification-flow.tsx, which is read-only). That toast
        // sits on top of this page's persistent alert stack, and the "You are in Travel Mode"
        // card already says it. The toast's state lives in that flow instance and the open
        // and the close are batched into one render, so replacing the instance with a fresh
        // one in the same update means the toast never mounts. Nothing is saved or sent, and
        // a first-time activation (no activeTravelModeUpdate) keeps its confirmation screen.
        setFlowLaunch((prev) =>
          prev.activeTravelModeUpdate ? { ...prev, key: prev.key + 1 } : prev
        )
      }
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

            <div className="mt-[50px] flex items-center justify-center gap-x-3">
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
                variant="light"
                size="md"
                disabled={checkInStarting}
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
                <div key={label} className="group flex w-fit origin-left items-center gap-x-3 transition-transform duration-150 ease-out active:scale-[0.99] has-[:disabled]:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100">
                  <RadioGroupItem
                    className="cursor-pointer disabled:cursor-not-allowed"
                    value={label}
                    id={`check-in-duration-${index}`}
                  />
                  <Label
                    htmlFor={`check-in-duration-${index}`}
                    className="transition-[color,font-weight] duration-150 ease-out group-hover:font-semibold group-hover:text-gray-900 group-has-[:disabled]:cursor-not-allowed group-has-[:disabled]:group-hover:font-medium group-has-[:disabled]:group-hover:text-gray-800 motion-reduce:transition-none"
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
                <div key={label} className="group flex w-fit origin-left items-center gap-x-3 transition-transform duration-150 ease-out active:scale-[0.99] has-[:disabled]:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100">
                  <RadioGroupItem
                    className="cursor-pointer disabled:cursor-not-allowed"
                    value={label}
                    id={`check-in-revise-duration-${index}`}
                  />
                  <Label
                    htmlFor={`check-in-revise-duration-${index}`}
                    className="transition-[color,font-weight] duration-150 ease-out group-hover:font-semibold group-hover:text-gray-900 group-has-[:disabled]:cursor-not-allowed group-has-[:disabled]:group-hover:font-medium group-has-[:disabled]:group-hover:text-gray-800 motion-reduce:transition-none"
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

            <div className="mt-[50px] grid grid-cols-2 gap-x-3">
              <Button
                variant="outlined"
                size="md"
                disabled={locationMismatchBusy}
                onClick={() =>
                  travelerPromptOpen
                    ? void handleTravelerStillTraveling()
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
          onOpenChange={handleIdentityFlowOpenChange}
          detectedLocation={detectedLocation}
          initialState={flowLaunch.initialState}
          activeTravelModeUpdate={flowLaunch.activeTravelModeUpdate}
        />
      )}

      {/* Persistent status alerts (PMCM-651): a fixed top-right overlay, outside the dashboard
          layout, so nothing on the page moves when an alert appears or is dismissed. Same
          corner as the existing toasts (right 20px), 20px below the header (64px from md up, 92px
          on phones, where it has a second row). Below md it spans the screen with 16px margins. Newest
          first, three at most, 12px apart, no timeout. The wrapper ignores the pointer so
          it never blocks the page; only the cards take it. */}
      {(statusAlertStack.visible.length > 0 ||
        statusAlertDismissFailed) && (
        <div
          data-status-alert-stack
          className="pointer-events-none fixed left-4 right-4 top-[112px] z-40 flex flex-col items-end gap-3 md:left-auto md:right-5 md:top-[84px] md:w-[400px]"
        >
          {statusAlertStack.visible.filter(isRenderedAlert).map((card) => (
            // Figma nodes 13101-46846 (Travel Mode, 98px), 13101-47555 (location verification
            // submitted, 118px), 13101-47566 (verified, 118px) and 13101-47577 (home country
            // updated, 98px): one card, a different icon and copy each. Figma's 16px padding
            // sits over its 1px stroke, so padding is 15px here (border-box + 1px border) to
            // keep the icon 16px from the edge and the content 368px; the 36px close button is
            // 8px from the corner, i.e. 7px from the padding box.
            <Alert
              key={card.key}
              data-status-alert={card.type}
              className="pointer-events-auto relative w-full max-w-[400px] items-start md:w-[400px] gap-x-5 rounded-xl border-gray-100 bg-white p-[15px] text-gray-900 shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08),0px_4px_6px_-2px_rgba(16,24,40,0.03)]"
            >
              <AlertIcon className="flex size-[66px] shrink-0 items-center justify-center rounded-full border-[9.9px] border-primary-25 bg-primary-50">
                {card.type === "submitted_for_review" ? (
                  <ClockStopwatch className="size-[24.75px] translate-x-[0.38px] -translate-y-[0.62px] text-primary-500" />
                ) : card.type === "verified" ? (
                  <CheckCircle className="size-[24.75px] translate-x-[0.38px] -translate-y-[0.62px] text-primary-500" />
                ) : card.type === "home_country_updated" ? (
                  <MarkerPin01 className="size-[24.75px] translate-x-[0.38px] -translate-y-[0.62px] text-primary-500" />
                ) : card.type === "travel_mode_ongoing" ? (
                  <Plane className="size-[24.75px] translate-x-[0.38px] translate-y-[0.38px] text-primary-500" />
                ) : (
                  <Plane className="size-[24.75px] text-primary-500" />
                )}
              </AlertIcon>
              <AlertContent className="flex min-w-0 flex-col gap-1 pr-10 pt-0.5">
                <AlertTitle className="text-sm font-semibold leading-5 text-gray-900">
                  {card.title}
                </AlertTitle>
                <AlertDescription className="mt-0 text-sm font-normal leading-5 text-gray-600">
                  {card.body}
                </AlertDescription>
                {card.source === "live" && (
                  // Figma node 13101-47532: 16px under the text block (4px gap + 12px).
                  <Button
                    variant="link"
                    className="mt-3 h-5 w-fit justify-start p-0 text-sm font-semibold leading-5"
                    onClick={() => void handleLiveTravelUpdate()}
                  >
                    {card.actionLabel}
                  </Button>
                )}
              </AlertContent>
              <IconButton
                aria-label={STATUS_ALERT_CLOSE_LABEL}
                className="absolute right-[7px] top-[7px] size-9 text-gray-500"
                size="md"
                visual="gray"
                variant="ghost"
                onClick={() => {
                  setStatusAlertDismissFailed(false)
                  if (card.source === "live") {
                    handleDismissLiveAlert(card)
                    return
                  }
                  void dismissPersistentAlertOptimistically({
                    alert: card,
                    dismiss: StatusAlertsAPI.dismiss,
                    update: setStatusAlertDismissal,
                  }).then((outcome) => {
                    if (outcome.ok) return
                    console.error(
                      "[status-alerts] could not dismiss the alert",
                      outcome.error
                    )
                    setStatusAlertDismissFailed(true)
                  })
                }}
              >
                <X className="size-5" />
              </IconButton>
            </Alert>
          ))}
          {statusAlertDismissFailed && (
            <Alert
              variant="error"
              data-status-alert-error
              className="pointer-events-auto w-full max-w-[400px] md:w-[400px]"
            >
              <AlertContent>
                <AlertTitle>{STATUS_ALERT_DISMISS_ERROR}</AlertTitle>
              </AlertContent>
              <CloseButton
                aria-label="Close"
                onClick={() => setStatusAlertDismissFailed(false)}
              />
            </Alert>
          )}
        </div>
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
