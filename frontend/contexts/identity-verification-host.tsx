"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import dynamic from "next/dynamic"
import { usePathname, useRouter } from "next/navigation"
import { useAuth, resolveDashboardRole } from "@/contexts/auth"
import { ROLE } from "@/types/user"
import {
  AlertTriangle,
  CheckCircle,
  ClockStopwatch,
  MarkerPin01,
  Plane,
  RefreshCw,
  X,
} from "@blend-metrics/icons"
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
  IconButton,
} from "@/components/ui"
import { StatusAlertsAPI } from "@/service/http/status-alerts"
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
  type PendingConfirmation,
  confirmActiveTravelMode,
} from "@/src/lib/api/travel-mode-confirmation"
import {
  readTravelActivationsInLogin,
  rememberTravelActivationInLogin,
} from "@/src/lib/api/travel-activation-login"
import {
  STATUS_ALERT_CLOSE_LABEL,
  STATUS_ALERT_DISMISS_ERROR,
} from "@/src/lib/api/status-alert-copy"
import { checkVpnProxy } from "@/src/lib/api/vpn-proxy-detection"
import {
  createLocationConsentGate,
  type LocationConsentAnswer,
} from "@/src/lib/api/location-consent"
import {
  createConnectionCheckSession,
  detectionOf,
  gateConnectionStateFor,
  shouldShowCheckingGate,
  vpnProxyModalCopyFor,
  type VpnProxyDetection,
} from "@/src/lib/api/vpn-proxy-check-session"
import {
  clearAwaitingResult,
  markAwaitingResult,
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
  createReturnReconciler,
  fetchIdentityVerificationSummary,
  shouldShowPendingModal,
  shouldShowSuccessModal,
  type IdentityVerificationSummaryView,
} from "@/src/lib/api/identity-verification-state"
import {
  getDetectedLocation as detectLocation,
  type DetectedLocation,
  type GetDetectedLocationOptions,
  withoutConsentDenied,
} from "@/src/lib/api/detected-location"
import {
  clearReviewedResult,
  hasReviewedResult,
  markReviewedResult,
  reconcileReviewedSession,
  shouldMarkReviewedResult,
} from "@/src/lib/api/reviewed-approval-result"
import { createStatusRefresher } from "@/src/lib/api/status-refresh"
import { scheduleOneShot } from "@/src/lib/api/one-shot"
import {
  closeDiditOverlay,
  isDiditOverlayActive,
  setDiditPresentationGate,
  subscribeDiditOverlay,
  waitForClosingDialogsToLeave,
  type DiditOverlayEvent,
} from "@/src/lib/api/didit-overlay"
import { createDiditLifecycle } from "@/src/lib/api/didit-launch-lifecycle"
import {
  createTripAccountGuard,
  createTripWatcher,
  readCurrentAccountIdFromAuth,
} from "@/src/lib/api/trip-account-guard"
import {
  markRetryGatePresented,
  readAwaitingFlag,
  shouldPresentRetryGate,
} from "@/src/lib/api/retry-gate-presentation"
import { readReturnCallbackSearch } from "@/src/lib/api/verification-return-origin-browser"
import {
  buildHandoffTarget,
  clearReturnOrigins,
  consumeReturnOrigin,
  setReturnOriginAccount,
  shouldHandOffReturn,
} from "@/src/lib/api/verification-return-origin"
import {
  clearHomeCountryChange,
  consumeHomeCountryChange,
  markHomeCountryChange,
  successAlertKindFor,
  type SuccessAlertKind,
} from "@/src/lib/api/home-country-change-result"
import {
  isActiveTravelUpdate,
  isTravelModeInForce,
} from "@/src/lib/api/travel-popup"
import {
  ALERT_RECENCY_WINDOW_MS,
  hasNewAlertOfType,
  hasRecentAlertOfType,
  isNewTravelActivation,
  reconcileStatusAlerts,
  TRAVEL_ACTIVATION_RECONCILE_DELAYS_MS,
} from "@/src/lib/api/status-alert-reconcile"
import type { StatusAlert } from "@/src/lib/api/status-alerts"
import {
  identityHostResetKey,
  isIdentityHostActive,
} from "@/src/lib/api/identity-host-routes"
import {
  AccountVerificationGate,
  type ConnectionCheckState,
} from "@/components/account-verification-gate"

// The flow is large (a map, a camera, a dozen screens) and the host is mounted for every page,
// so it is loaded on demand: when the dashboard mounts (so Verify My Account opens it as fast as
// it always did) or when a verification is started. A page that never starts one never loads it.
const loadIdentityVerificationFlow = () =>
  import("@/components/identity-verification-flow").then(
    (module) => module.IdentityVerificationFlow
  )
const IdentityVerificationFlow = dynamic(loadIdentityVerificationFlow, {
  ssr: false,
})

// The one place the Identity Verification flow is hosted: the flow dialog, the Verify My
// Account action (VPN/proxy check, fresh status read, Didit hand-off or the location
// screen), the dialogs that answer it, and the single owner of the Didit-return
// reconciliation. It was moved here from the talent dashboard without changing what any
// of it does. It is mounted once, in the root layout, inside AuthProvider, so it can
// open over any page; in this phase the talent dashboard is still its only caller. It is inert
// (renders nothing, reads nothing) when nobody is signed in and on the public authentication
// pages (identity-host-routes.ts), and it closes and forgets everything when the page, the
// account, the role or the sign-in changes.
//
// Everything that belongs to the dashboard itself (the profile banner, the persistent
// status alerts, the load-time prompts, the Travel Mode check-in and popups) stays on the
// dashboard and talks to this host through the observer below, so the host never needs
// to know about them.

/** How the flow is (re)started. A new key remounts it, since the flow reads its start screen once. */
export interface IdentityFlowLaunch {
  initialState?: "current-location-showcase" | "traveling-showcase"
  activeTravelModeUpdate?: boolean
  // Set only by the Travel Mode Update action: "Permanently relocated" then re-detects
  // the location with the browser (see refreshLocationForRelocation).
  detectBrowserLocationOnRelocate?: boolean
}

export interface IdentityFlowOpenOptions {
  /** The location shown behind the first screen. Omitted: the one already held is kept. */
  detectedLocation?: DetectedLocation
  /** Runs once, after this particular opening of the flow closes. */
  onClosed?: () => void
}

/**
 * What the page that mounts the host reacts to. The members carry the names of the page's
 * own state setters and callbacks they stand for (the host's moved code calls them by those
 * names), and every one is optional: a page that registers none just ignores them.
 */
export interface IdentityHostObserver {
  /** The flow opened or closed (after the host's own bookkeeping): the page re-reads what it shows. */
  handleIdentityFlowOpenChange?: (open: boolean) => void
  /** Shows or hides the page's unverified-profile banner. */
  setProfileBannerShown?: (shown: boolean) => void
  /** A start attempt was refused as not startable: the page re-reads the real status. */
  runIdentityVerificationCheck?: () => Promise<void>
  /** An approval was just shown; the kind says which success alert would follow it. */
  setSuccessAlertKind?: (kind: SuccessAlertKind) => void
  /**
   * The live "You are in Travel Mode" card's Update action. A page that has its own popup state
   * (the dashboard) handles it; any other page gets the host's own default.
   */
  handleLiveTravelUpdate?: () => Promise<void>
}

export type StatusRefreshedListener = (status: string | undefined) => void

export interface IdentityVerificationHost {
  /** Verify My Account: exactly what the dashboard's button has always run. */
  startVerification: () => Promise<void>
  /** Opens the flow over the current page. */
  openFlow: (
    launch: IdentityFlowLaunch,
    options?: IdentityFlowOpenOptions
  ) => void
  flowOpen: boolean
  connectionCheckState: ConnectionCheckState
  /** The retry window of the "You've used all three attempts" dialog (null closes it). */
  setCooldownRetryTime: (retryAt: string | null) => void
  /** Closes the verification gate dialog. */
  closeGate: () => void
  /** The latest identity summary the host holds (the page that reads one hands it over). */
  summary: IdentityVerificationSummaryView | null
  setSummary: (summary: IdentityVerificationSummaryView | null) => void
  /** A result whose persistent alert is stored asynchronously: re-read the list until it is there. */
  startAlertReconcile: (
    expected: StatusAlert["type"][],
    options?: { sinceMs?: number }
  ) => void
  /** A page with its own Travel Mode modal asks for the live card to wait (the check-in has priority). */
  setLiveAlertsHeld: (held: boolean) => void
  /** Hears every identity-status-refreshed event after the host has acted on it. */
  subscribeStatusRefreshed: (listener: StatusRefreshedListener) => () => void
}

interface IdentityVerificationHostContextValue {
  host: IdentityVerificationHost
  observerRef: { current: IdentityHostObserver | null }
  /** A page that shows verification results (the dashboard) is mounted. */
  setResultsSurfaceMounted: (mounted: boolean) => void
}

const IdentityVerificationHostContext =
  createContext<IdentityVerificationHostContextValue | null>(null)

export function IdentityVerificationHostProvider({
  children,
}: {
  children: ReactNode
}) {
  const { user } = useAuth()
  const pathname = usePathname()
  const hostActive = isIdentityHostActive({ pathname, userId: user?.id })
  // The dashboard reads the identity summary itself (and owns the banner and prompts that need
  // it). While it is mounted the host does not read a second copy.
  const pageReadsSummaryRef = useRef(false)
  const setResultsSurfaceMounted = useCallback((mounted: boolean) => {
    pageReadsSummaryRef.current = mounted
  }, [])
  const observerRef = useRef<IdentityHostObserver | null>(null)
  const statusRefreshedListenersRef = useRef(new Set<StatusRefreshedListener>())
  const openOnClosedRef = useRef<(() => void) | null>(null)

  const [verificationGateOpen, setVerificationGateOpen] = useState(false)
  // The gate as the RESULT of a Didit decline (retry_identity): the same gate, with Cancel. The
  // standard gate above never has it.
  const [retryGateOpen, setRetryGateOpen] = useState(false)
  const retryVerifyRunningRef = useRef(false)
  const retryGateKeyRef = useRef<string | null>(null)
  // The return marker (its timestamp) of the decline the gate is showing, so the marker can be
  // put back if the gate is brought back after Didit is cancelled and the provider is remounted.
  const retryGateFlagRef = useRef<string | null>(null)
  // True from the moment Verify My Account is pressed on the retry gate until Didit ends.
  const retryLaunchRef = useRef(false)
  // The talent has seen and acted on this decline: it is recorded as shown and the return marker
  // is cleared, so nothing (focus, visibility, a route change, a reload, another /me read) can
  // present the same occurrence again. A later decline is a new trip with a new marker.
  const acknowledgeRetryGate = useCallback(() => {
    const key = retryGateKeyRef.current
    retryGateKeyRef.current = null
    retryGateFlagRef.current = null
    retryLaunchRef.current = false
    if (key) {
      markRetryGatePresented(window.localStorage, key)
      clearAwaitingResult(window.localStorage)
    }
    setRetryGateOpen(false)
  }, [])
  const [connectionCheckState, setConnectionCheckState] =
    useState<ConnectionCheckState>("idle")
  // The last FINAL detection the modal showed. It changes only when a newer detection arrives,
  // never to "checking", "none" or "unavailable", so a Reload (and the modal's close animation)
  // keeps the copy that is on screen instead of falling back to another variant.
  const [vpnProxyDetection, setVpnProxyDetection] =
    useState<VpnProxyDetection | null>(null)
  const [vpnProxyModalOpen, setVpnProxyModalOpen] = useState(false)
  // One connection check at a time; any change of context invalidates the one in flight.
  const checkSessionRef = useRef(createConnectionCheckSession())
  // A Retry pressed on the connection-error presentation: it stays visible until the answer.
  const [retryingFromUnavailable, setRetryingFromUnavailable] = useState(false)
  const vpnProxyModalOpenRef = useRef(false)
  // "Allow approximate location?" — asked only when the browser gave no position (see
  // detected-location.ts). It authorizes the network (IP) lookup for ONE detection attempt
  // and is never stored. It is not the browser permission and never re-asks for it.
  const [locationConsentOpen, setLocationConsentOpen] = useState(false)
  const [locationConsentGate] = useState(() =>
    createLocationConsentGate(setLocationConsentOpen)
  )
  // Bumped when the page, account or role changes and on unmount: a detection that started
  // before then is stale (its question is cancelled and its answer is never applied).
  const locationAttemptRef = useRef(0)
  const locationAbortsRef = useRef(new Set<AbortController>())
  // Every detection that asks for the browser's location goes through this, so the two entry
  // points (Verify My Account, "Permanently relocated") share ONE consent behavior without
  // their own code changing: when the browser gives no position, the user is asked before the
  // network (IP) lookup runs, and the attempt is dropped if the page/account changes meanwhile.
  // A call that does not ask the browser (Travel Mode Update) is passed through untouched.
  const getDetectedLocation = useCallback(
    (options: GetDetectedLocationOptions = {}) => {
      if (!options.useBrowserLocation) return detectLocation(options)
      const attempt = locationAttemptRef.current
      // The wait for the browser's own permission prompt can be long (the user may not
      // have answered yet), so it is cancellable: a route/account/role change or an
      // unmount aborts it, and nothing is left listening.
      const controller = new AbortController()
      locationAbortsRef.current.add(controller)
      return detectLocation({
        ...options,
        requestApproximateConsent: locationConsentGate.request,
        cancelApproximateConsent: locationConsentGate.cancel,
        signal: controller.signal,
        isCurrent: () => attempt === locationAttemptRef.current,
      }).finally(() => locationAbortsRef.current.delete(controller))
    },
    [locationConsentGate]
  )
  // Deny is the non-consenting choice, so it holds the dialog's initial focus.
  const denyLocationButtonRef = useRef<HTMLButtonElement>(null)
  const answerLocationConsent = useCallback(
    (answer: LocationConsentAnswer) => locationConsentGate.decide(answer),
    [locationConsentGate]
  )
  const cancelLocationDetection = useCallback(() => {
    locationAttemptRef.current += 1
    locationConsentGate.cancel()
    locationAbortsRef.current.forEach((controller) => controller.abort())
    locationAbortsRef.current.clear()
  }, [locationConsentGate])
  vpnProxyModalOpenRef.current = vpnProxyModalOpen
  const connectionCheckStateRef = useRef<ConnectionCheckState>("idle")
  connectionCheckStateRef.current = connectionCheckState
  const [identityFlowOpen, setIdentityFlowOpen] = useState(false)
  const [detectedLocation, setDetectedLocation] =
    useState<DetectedLocation | null>(null)
  // How the existing verification flow is (re)started. The default is exactly what it
  // always was; only the popup's Update action starts it at "Tell us more about your
  // current location" (a new key remounts it, since the flow reads its start screen once).
  const [flowLaunch, setFlowLaunch] = useState<{
    key: number
    initialState?: "current-location-showcase" | "traveling-showcase"
    activeTravelModeUpdate?: boolean
    // Set only by the Travel Mode Update action: "Permanently relocated" then re-detects
    // the location with the browser (see refreshLocationForRelocation).
    detectBrowserLocationOnRelocate?: boolean
  }>({ key: 0 })

  // The page's own reactions, reached through its observer. They keep the names of what they
  // stand for so the code moved here reads exactly as it did on the page.
  const setProfileBannerShown = useCallback(
    (shown: boolean) => observerRef.current?.setProfileBannerShown?.(shown),
    []
  )
  const runIdentityVerificationCheck = useCallback(
    async () => observerRef.current?.runIdentityVerificationCheck?.(),
    []
  )
  const setSuccessAlertKind = useCallback(
    (kind: SuccessAlertKind) => observerRef.current?.setSuccessAlertKind?.(kind),
    []
  )

  // The identity summary the host holds. The dashboard (which reads it itself, for its banner
  // and prompts) and every other page share this one copy, so there is one read and one set of
  // alerts. The persistent alert stack below was moved here from the dashboard unchanged, so an
  // alert caused by a flow opened over any page is shown on that page.
  const [travelSummary, setTravelSummary] =
    useState<IdentityVerificationSummaryView | null>(null)
  // A page with its own Travel Mode modal (the dashboard check-in) asks the live card to wait.
  const [liveAlertsHeld, setLiveAlertsHeld] = useState(false)
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

  // Reads the persistent alerts on load and whenever the identity summary is re-read (a
  // Travel Mode activation in this session arrives as a new alert). Only the latest read
  // is applied, and a failed read leaves the alerts that are already showing.
  useEffect(() => {
    // Talent accounts only, and only where the host is active (never on a public or
    // authentication page, and never for a client).
    if (!user || !hostActive || resolveDashboardRole(user) !== ROLE.TALENT) return
    const request = ++statusAlertRequestRef.current
    StatusAlertsAPI.list()
      .then((alerts) => {
        if (request === statusAlertRequestRef.current) setStatusAlerts(alerts)
      })
      .catch((error) => {
        console.error("[status-alerts] could not load the alerts", error)
      })
  }, [user, travelSummary, hostActive])

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
        // A Travel Mode activation waits longer for its alert than the other results do.
        delaysMs: expected.every((type) => type === "travel_mode")
          ? TRAVEL_ACTIVATION_RECONCILE_DELAYS_MS
          : undefined,
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
            travelSummary && !liveAlertsHeld
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
      liveAlertsHeld,
    ]
  )


  // The alerts and the summary belong to one signed-in account. Another account, a sign-out,
  // a role change or a public page starts empty. (Not the page: alerts follow the talent from
  // page to page.)
  const accountKey = [
    hostActive ? "active" : "inactive",
    user?.id ?? "",
    user ? resolveDashboardRole(user) ?? "" : "",
  ].join("|")
  const accountKeyRef = useRef(accountKey)
  const summaryReadForRef = useRef<string | null>(null)
  useLayoutEffect(() => {
    if (accountKeyRef.current === accountKey) return
    accountKeyRef.current = accountKey
    summaryReadForRef.current = null
    previousTravelSummaryRef.current = null
    alertReconcileGenRef.current += 1
    setTravelSummary(null)
    setLiveAlertsHeld(false)
    setStatusAlerts([])
    setStatusAlertDismissal({
      dismissedPersistentIds: new Set(),
      dismissedLiveKeys: new Set(),
    })
    setStatusAlertDismissFailed(false)
    setTravelActivationsHere(new Set())
  }, [accountKey])

  // Off the dashboard, the host reads the summary once per account so the live Travel Mode card
  // and the list of alerts are right wherever the talent is. While the dashboard is mounted it
  // does the reading (and hands the result over), so there is never a second request.
  useEffect(() => {
    if (!hostActive || !user || resolveDashboardRole(user) !== ROLE.TALENT) return
    if (pageReadsSummaryRef.current || travelSummary !== null) return
    if (summaryReadForRef.current === accountKey) return
    // A review marker is resolved by the status refresh below, which reads the summary itself.
    if (hasReviewedResult(window.localStorage, user.id)) return
    summaryReadForRef.current = accountKey
    void fetchIdentityVerificationSummary().then((next) => {
      if (next && accountKeyRef.current === accountKey) setTravelSummary(next)
    })
  }, [hostActive, user, travelSummary, accountKey])

    // A start attempt rejected as not startable re-reads the real status; a
  // verified account closes everything that was open. Whoever subscribed hears every
  // refresh first (the dashboard needs none of them yet; the gates will).
  useEffect(() => {
    const onRefreshed = (event: Event) => {
      const status = (event as CustomEvent<{ status?: string }>).detail?.status
      statusRefreshedListenersRef.current.forEach((listener) => listener(status))
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

  // Status that changed while the talent was elsewhere (a review approved in another tab, an
  // alert stored a moment late) is picked up on a page load, when the tab becomes visible and on
  // a route change: read-only, one refresh at a time, no timer. A reviewed session that was
  // approved shows the existing Verified result once and loads its alert; the dashboard no
  // longer runs a resolver of its own. See status-refresh.ts.
  const refreshLiveRef = useRef({ hostActive, user })
  refreshLiveRef.current = { hostActive, user }
  const statusRefresher = useMemo(
    () =>
      createStatusRefresher({
        active: () => {
          const live = refreshLiveRef.current
          return Boolean(
            live.hostActive && live.user && resolveDashboardRole(live.user) === ROLE.TALENT
          )
        },
        dashboardReadsSummary: () => pageReadsSummaryRef.current,
        awaitingDiditReturn: () => hasAwaitingResult(window.localStorage),
        storage: () => window.localStorage,
        userId: () => refreshLiveRef.current.user?.id,
        hasReviewedMarker: () =>
          hasReviewedResult(window.localStorage, refreshLiveRef.current.user?.id),
        // A read that finishes after the account changed is dropped, never applied.
        readSummary: async () => {
          const key = accountKeyRef.current
          const next = await fetchIdentityVerificationSummary()
          return accountKeyRef.current === key ? next : null
        },
        onSummary: (next) => setTravelSummary(next),
        reconcile: reconcileReviewedSession,
        schedule: scheduleOneShot,
        onApproved: () => {
          setVerificationGateOpen(false)
          setProfileBannerShown(false)
          setVerifiedModalOpen(true)
          startAlertReconcile(["verified", "home_country_updated"])
        },
      }),
    [startAlertReconcile, setProfileBannerShown]
  )
  // A deferred reconcile belongs to one signed-in talent: it is dropped on sign-out, another account
  // or role, a public page, and when the host unmounts.
  useEffect(() => {
    statusRefresher.cancel()
  }, [accountKey, statusRefresher])
  useEffect(() => () => statusRefresher.cancel(), [statusRefresher])
  const statusLoadCheckedForRef = useRef<string | null>(null)
  useEffect(() => {
    if (!hostActive || !user) return
    if (statusLoadCheckedForRef.current === accountKey) return
    statusLoadCheckedForRef.current = accountKey
    void statusRefresher.run("load")
  }, [hostActive, user, accountKey, statusRefresher])
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void statusRefresher.run("visible")
    }
    // The window regaining focus while the tab stayed visible (no visibility change fires):
    // the same check. The two together are one refresh (the second is dropped as busy).
    const onFocus = () => {
      if (document.visibilityState === "visible") void statusRefresher.run("focus")
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onFocus)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onFocus)
    }
  }, [statusRefresher])
  // An account whose verification is under review (read from any summary, in this or another
  // browser) is waiting for its result: remember it so the later approval shows once.
  useEffect(() => {
    if (!hostActive || !user || resolveDashboardRole(user) !== ROLE.TALENT) return
    if (!shouldMarkReviewedResult(travelSummary)) return
    if (hasReviewedResult(window.localStorage, user.id)) return
    markReviewedResult(window.localStorage, user.id)
  }, [hostActive, user, travelSummary])
  const statusPathRef = useRef(pathname)
  useEffect(() => {
    if (statusPathRef.current === pathname) return
    statusPathRef.current = pathname
    void statusRefresher.run("route")
  }, [pathname, statusRefresher])

  // Everything above belongs to one account on one page. When the page, the account, the role
  // or the sign-in changes (or a public page is entered, or nobody is signed in), it is all
  // closed and forgotten, exactly as it was when the dashboard unmounted and a new one mounted.
  // A layout effect, so it settles before the new page's own effects start anything.
  // Didit opens over the page, never over another verification dialog: the flow (or the gate)
  // that launched it is closed first (see didit-launch-lifecycle.ts). Mirrors in refs so the
  // lifecycle reads what is open at the moment of launch.
  const identityFlowOpenRef = useRef(identityFlowOpen)
  identityFlowOpenRef.current = identityFlowOpen
  const verificationGateOpenRef = useRef(verificationGateOpen)
  verificationGateOpenRef.current = verificationGateOpen
  const closeCommitWaitersRef = useRef<Array<() => void>>([])
  // Closing a Didit overlay that is still on screen (sign-out, account, role or page change) also
  // ends the wait for its result: the trip markers belong to that account's trip, so they must not
  // outlive it and make the next account's page look for (and show) a result that is not its own.
  const dropActiveDiditTrip = useCallback((userId: string | null | undefined) => {
    if (!isDiditOverlayActive()) return
    clearAwaitingResult(window.localStorage)
    clearHomeCountryChange(window.localStorage)
    if (userId) clearReturnOrigins(window.localStorage, userId)
  }, [])
  const [diditLifecycle] = useState(() =>
    createDiditLifecycle({
      getFlowOpen: () => identityFlowOpenRef.current,
      getGateOpen: () => verificationGateOpenRef.current,
      setFlowOpen: (open) => setIdentityFlowOpen(open),
      setGateOpen: (open) => setVerificationGateOpen(open),
      // Resolves after React has committed the close (so Radix has marked the dialogs closed),
      // then waits for those dialogs to leave the DOM. Not a frame guess.
      waitForExit: () =>
        new Promise<void>((resolve) => {
          closeCommitWaitersRef.current.push(resolve)
        }).then(() => waitForClosingDialogsToLeave()),
    })
  )
  // Who is signed in, asked of the canonical auth read (GET /user/me) only while a Didit overlay is
  // active: on a tab focus / visibility return and before a Didit callback is accepted. One read at
  // a time, reused for a second, no timer.
  const [tripGuard] = useState(() =>
    createTripAccountGuard({ readCurrentAccountId: readCurrentAccountIdFromAuth })
  )
  // The signed-in account is no longer the one that launched Didit (or that cannot be verified):
  // the overlay is closed and its callbacks invalidated, every trip marker and the retry-gate
  // occurrence are dropped, and nothing is reconciled, confirmed, started, reopened or navigated.
  // Backend verification state is not touched.
  const abortDiditTrip = useCallback(
    (userId: string) => {
      closeDiditOverlay()
      diditLifecycle.discard()
      clearAwaitingResult(window.localStorage)
      clearHomeCountryChange(window.localStorage)
      clearReturnOrigins(window.localStorage, userId)
      acknowledgeRetryGate() // consumes the retry occurrence and closes the retry gate
      setConnectionCheckState("idle")
    },
    [diditLifecycle, acknowledgeRetryGate]
  )
  useEffect(() => {
    if (identityFlowOpen || verificationGateOpen) return
    const waiters = closeCommitWaitersRef.current.splice(0)
    waiters.forEach((resolve) => resolve())
  }, [identityFlowOpen, verificationGateOpen])
  const resetKey = identityHostResetKey({
    pathname,
    userId: user?.id,
    role: user ? resolveDashboardRole(user) : null,
  })
  const resetKeyRef = useRef(resetKey)
  useLayoutEffect(() => {
    if (resetKeyRef.current === resetKey) return
    resetKeyRef.current = resetKey
    dropActiveDiditTrip(user?.id)
    closeDiditOverlay() // never outlives its account, role or page
    diditLifecycle.discard() // and never brings an old dialog back
    setVerificationGateOpen(false)
    acknowledgeRetryGate() // a page or account change is a decision: the gate is not brought back
    checkSessionRef.current.invalidate() // a check still in flight belongs to the page/account it started on
    cancelLocationDetection() // and so does a pending location question
    setRetryingFromUnavailable(false)
    setConnectionCheckState("idle")
    setVpnProxyModalOpen(false)
    setIdentityFlowOpen(false)
    setDetectedLocation(null)
    setFlowLaunch({ key: 0 })
    setVerifiedModalOpen(false)
    setPendingModalOpen(false)
    setCooldownRetryTime(null)
    openOnClosedRef.current = null
  }, [resetKey])

  // Didit opens over this page (see didit-overlay.ts). Its result is only a hint: a finished
  // session is reconciled and read back exactly like a return from Didit (a fresh reconciler,
  // then the same effect below), so the matching dialog and alert appear here. A dismissed
  // overlay (closed, camera denied, expired) is not a result: nothing is reconciled, the
  // page stays as it was, and the verification step that launched it is usable again.
  const returnUserId = user?.id
  useEffect(() => {
    if (!returnUserId) return
    const removeGate = setDiditPresentationGate(diditLifecycle.beforePresent)
    let disposed = false
    const handleOverlayEvent = (event: DiditOverlayEvent) => {
      clearReturnOrigins(window.localStorage, returnUserId)
      setConnectionCheckState("idle")
      if (event.type === "completed") {
        diditLifecycle.discard() // the dialogs that launched it stay closed
        setIdentityFlowOpen(false)
        if (retryLaunchRef.current) {
          // Started from the retry gate and finished: the backend's answer decides what is
          // shown next, and the gate is not brought back. The decline it showed is consumed;
          // the trip marker is left for the reconcile below.
          const key = retryGateKeyRef.current
          retryLaunchRef.current = false
          retryGateKeyRef.current = null
          retryGateFlagRef.current = null
          if (key) markRetryGatePresented(window.localStorage, key)
        }
        returnReconcilerRef.current = null // run() is memoized: this is a new trip
        setReturnGen((g) => g + 1)
        return
      }
      clearAwaitingResult(window.localStorage)
      clearHomeCountryChange(window.localStorage)
      if (retryLaunchRef.current) {
        // Didit was opened from the retry gate and cancelled or dismissed: the same gate comes
        // back once, on this page, with the decline still unconsumed (its marker is put back so
        // a remount shows it too). Nothing is started: only Verify My Account launches Didit.
        retryLaunchRef.current = false
        const flag = retryGateFlagRef.current
        if (flag && Number.isFinite(Number(flag))) {
          markAwaitingResult(window.localStorage, Number(flag))
        }
        setRetryGateOpen(true)
        return
      }
      // Back to where the talent was, on the same step: the dialogs were only closed.
      diditLifecycle.reopen()
    }
    // A Didit callback is accepted only if the account that launched it is still the one signed
    // in (a fresh read); otherwise it is ignored and the trip is dropped.
    const watcher = createTripWatcher({
      guard: tripGuard,
      accountId: returnUserId,
      isOverlayActive: isDiditOverlayActive,
      isTabVisible: () => document.visibilityState !== "hidden",
      isDisposed: () => disposed,
      abort: () => abortDiditTrip(returnUserId),
    })
    const unsubscribe = subscribeDiditOverlay((event) => {
      void watcher.accept(event, handleOverlayEvent)
    })
    // Back on this tab while Didit is open: is the signed-in account still the one that launched
    // it? Only while an overlay is active, only on these events, never on a timer.
    const onTabReturn = () => void watcher.onTabReturn()
    document.addEventListener("visibilitychange", onTabReturn)
    window.addEventListener("focus", onTabReturn)
    return () => {
      disposed = true
      document.removeEventListener("visibilitychange", onTabReturn)
      window.removeEventListener("focus", onTabReturn)
      removeGate()
      unsubscribe()
      dropActiveDiditTrip(returnUserId)
      closeDiditOverlay()
      diditLifecycle.discard()
    }
  }, [returnUserId, diditLifecycle, dropActiveDiditTrip, tripGuard, abortDiditTrip])

  // Back from Didit. The backend sends the browser to /talent-dashboard (its callback is not
  // changed), so a return that left from another page is handed straight back to it: the
  // origin route stored when verification started (internal, per account, consumed here) with
  // every callback parameter carried over. The decision is made before anything is painted and
  // the result is NOT processed on the dashboard: the Didit-return handling below waits until
  // the origin page is reached, so the result dialog and alert appear there. No origin (a
  // bookmark, another account, expired, unavailable storage) and nothing changes: the result
  // shows on the dashboard as before. A reload, Back or restored page is never handed off.
  const router = useRouter()
  const [handingOff, setHandingOff] = useState(false)
  const [returnGen, setReturnGen] = useState(0)
  const handoffRef = useRef<{ target: string; pathname: string } | null>(null)
  const handoffDecidedRef = useRef(false)
  useEffect(() => {
    setReturnOriginAccount(user?.id ?? null)
    return () => setReturnOriginAccount(null)
  }, [user?.id])
  useLayoutEffect(() => {
    if (handoffDecidedRef.current) return
    if (!hostActive || !user || resolveDashboardRole(user) !== ROLE.TALENT) return
    handoffDecidedRef.current = true // one decision per page load
    let navigationType: string | undefined
    try {
      const entry = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined
      navigationType = entry?.type
    } catch {
      navigationType = undefined
    }
    if (
      !shouldHandOffReturn({
        pathname,
        navigationType,
        awaitingResult: hasAwaitingResult(window.localStorage),
      })
    ) {
      return
    }
    const search = readReturnCallbackSearch()
    const origin = consumeReturnOrigin({
      storage: window.localStorage,
      userId: user.id,
      callbackSearch: search,
    })
    const target = origin ? buildHandoffTarget(origin, search) : null
    if (!target) return
    handoffRef.current = { target, pathname: new URL(target, "http://x").pathname }
    setHandingOff(true)
    router.replace(target)
  }, [hostActive, user, pathname, router])
  useEffect(() => {
    const handoff = handoffRef.current
    if (!handoff) return
    if (pathname !== handoff.pathname) return
    handoffRef.current = null
    setHandingOff(false)
    setReturnGen((g) => g + 1) // the Didit-return handling now runs on the origin page
  }, [pathname])
  useEffect(() => {
    if (!handingOff) return
    // One-shot guard, not polling: if the navigation never lands, fall back to the dashboard.
    const guard = setTimeout(() => {
      if (!handoffRef.current) return
      handoffRef.current = null
      setHandingOff(false)
      setReturnGen((g) => g + 1)
    }, 5000)
    return () => clearTimeout(guard)
  }, [handingOff])

  // Held in a ref so rerenders and StrictMode's double effect share one reconcile.
  const returnReconcilerRef = useRef<ReturnType<
    typeof createReturnReconciler
  > | null>(null)

  useEffect(() => {
    if (!user) return
    if (resolveDashboardRole(user) !== ROLE.TALENT) return
    if (!hostActive) return
    // Handing the return to its origin page: the result is processed there, not here.
    if (handoffRef.current) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0

    const apply = (summary: IdentityVerificationSummaryView | null) => {
      if (cancelled) return
      // Off the dashboard nothing else hands the host the post-result summary (the dashboard
      // reads its own), so keep it current: what the live card and the alert list follow.
      if (summary && !pageReadsSummaryRef.current) setTravelSummary(summary)
      if (shouldShowSuccessModal(summary)) {
        clearAwaitingResult(window.localStorage)
        setVerificationGateOpen(false)
        setProfileBannerShown(false)
        setVerifiedModalOpen(true)
        setRetryGateOpen(false)
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
        setRetryGateOpen(false)
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
      // A Didit result just reconciled to a declined attempt with attempts left: the existing
      // verification gate opens over this page, once (see retry-gate-presentation.ts), and the
      // result marker is cleared so nothing can present it again. Nothing is started here: the
      // gate's own "Verify My Account" is the explicit retry. No alert is created for a decline.
      const retryGate = shouldPresentRetryGate({
        summary,
        userId: user.id,
        flag: readAwaitingFlag(window.localStorage),
        storage: window.localStorage,
      })
      if (retryGate.present && retryGate.key) {
        // The occurrence is consumed when the talent acts on the gate (Cancel, Escape, an outside
        // click or Verify My Account) or the page / account changes (acknowledgeRetryGate), not
        // here: if this provider is remounted while the gate is open, the result is presented
        // again instead of being lost.
        retryGateKeyRef.current = retryGate.key
        retryGateFlagRef.current = readAwaitingFlag(window.localStorage)
        setIdentityFlowOpen(false)
        setProfileBannerShown(shouldShowProfileBanner(summary))
        setConnectionCheckState("idle")
        setRetryGateOpen(true)
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
  }, [user, startAlertReconcile, hostActive, returnGen])

    // Real required check, attempted only on "Verify My Account" / Retry. Never
  // fakes a clean result and never marks anything verified itself.
  //
  // PMCM-637: one check runs at a time (a second press shares it), and every answer is applied
  // only while its check is still the current one. A page, account or role change, a dismissal
  // or an unmount invalidates it (checkSessionRef), so a late answer cannot open a modal, start
  // verification or start Didit; every step after an await below re-checks that.
  const handleVerifyMyAccount = useCallback(async () => {
    await checkSessionRef.current.run(async (isCurrent) => {
    const retrying = connectionCheckStateRef.current === "unavailable"
    // A page-level gate closes before the check ends: the shared gate's own "Checking..."
    // treatment stands in for it, unless the check is already shown (the detection modal's
    // disabled Reload, the open gate) or the page has its own checking state.
    const showChecking = shouldShowCheckingGate({
      detectionModalOpen: vpnProxyModalOpenRef.current,
      gateOpen: verificationGateOpenRef.current,
      pageShowsOwnChecking: pageReadsSummaryRef.current,
    })
    setRetryingFromUnavailable(retrying)
    if (showChecking) setVerificationGateOpen(true)
    setConnectionCheckState("checking")
    const outcome = await checkVpnProxy()
    if (!isCurrent()) return
    setRetryingFromUnavailable(false)
    // Only a final detection changes the modal copy (never "checking", "none" or "unavailable").
    const detection = detectionOf(outcome)
    if (detection) setVpnProxyDetection(detection)

    if (outcome === "none") {
      setVpnProxyModalOpen(false)
      if (showChecking) setVerificationGateOpen(false)
      // The backend's state is re-read now, not trusted from page load.
      const summary = await fetchIdentityVerificationSummary()
      if (!isCurrent()) return
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
        if (!isCurrent()) return
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
      const location = await getDetectedLocation({ useBrowserLocation: true })
      if (!isCurrent()) return
      setDetectedLocation(location)
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
    })
  }, [runIdentityVerificationCheck])

  // Dismissing the detection modal (its button, Escape or an outside click) or the connection
  // error ends the check in flight: a late answer must not bring either back.
  const dismissConnectionCheck = useCallback(() => {
    checkSessionRef.current.invalidate()
    setRetryingFromUnavailable(false)
    setConnectionCheckState("idle")
  }, [])
  useEffect(() => () => checkSessionRef.current.invalidate(), [])
  // Unmount: a pending location question and a detection in flight belong to nobody.
  useEffect(() => cancelLocationDetection, [cancelLocationDetection])

    // The Update action shows the server-derived location behind its first screen and asks
  // for no permission. Choosing "Permanently relocated" is the explicit user action that
  // asks the browser for its location, through the same call Verify My Account uses; a
  // denied or failed detection yields the flow's own "couldn't detect" state, never a
  // made-up location.
  const refreshLocationForRelocation = useCallback(async () => {
    setDetectedLocation(await getDetectedLocation({ useBrowserLocation: true }))
  }, [])

  // The flow opened or closed. What the page re-reads afterwards (its own summary, prompts
  // and completion markers) is the page's business: it hears about it through its observer.
  const handleIdentityFlowOpenChange = useCallback((open: boolean) => {
    setIdentityFlowOpen(open)
    if (!open) {
      // For an Update on a Travel Mode that is already in force, the flow's "Temporarily
      // traveling" is a no-op: it opens its own temporary confirmation toast and
      // closes (components/identity-verification-flow.tsx, which is read-only). That toast
      // sits on top of the page's persistent alert stack, and the "You are in Travel Mode"
      // card already says it. The toast's state lives in that flow instance and the open
      // and the close are batched into one render, so replacing the instance with a fresh
      // one in the same update means the toast never mounts. Nothing is saved or sent, and
      // a first-time activation (no activeTravelModeUpdate) keeps its confirmation screen.
      setFlowLaunch((prev) =>
        prev.activeTravelModeUpdate ? { ...prev, key: prev.key + 1 } : prev
      )
    }
    const pageHandler = observerRef.current?.handleIdentityFlowOpenChange
    if (pageHandler) {
      pageHandler(open)
    } else if (!open) {
      // Any other page: re-read the summary so what the flow completed (a Travel Mode
      // activation) shows up without a refresh, exactly as the dashboard's close handler does.
      void fetchIdentityVerificationSummary().then((fresh) => {
        if (fresh) setTravelSummary(fresh)
      })
    }
    if (open) return
    const onClosed = openOnClosedRef.current
    openOnClosedRef.current = null
    onClosed?.()
  }, [])

  const openFlow = useCallback(
    (launch: IdentityFlowLaunch, options: IdentityFlowOpenOptions = {}) => {
      // A flow that starts again never inherits an earlier consent denial.
      setDetectedLocation((prev) =>
        options.detectedLocation
          ? withoutConsentDenied(options.detectedLocation)
          : prev && withoutConsentDenied(prev)
      )
      setFlowLaunch((prev) => ({ key: prev.key + 1, ...launch }))
      openOnClosedRef.current = options.onClosed ?? null
      setIdentityFlowOpen(true)
    },
    []
  )

  // The flow's "Temporarily traveling" for an already-active traveler (Update): Travel Mode is
  // confirmed again. The backend creates a new persistent "Travel Mode is on" occurrence (the
  // period's dates are untouched); on success the live Update card is hidden for the rest of
  // this login (the same per-login marker an activation uses) and the new alert is awaited.
  // The flow's own toast never mounts (the instance is replaced on close). On failure nothing
  // is hidden or announced: the Update card stays and the Update screen opens again to retry
  // with the same confirmation id, so a request that did succeed is stored once.
  const travelConfirmationRef = useRef<PendingConfirmation>({ current: null })
  const handleTravelModeConfirmed = useCallback(async () => {
    const { IdentityVerificationAPI } = await import(
      "@/service/http/identity-verification"
    )
    await confirmActiveTravelMode({
      confirm: (id) => IdentityVerificationAPI.confirmTravelMode(id),
      pending: travelConfirmationRef.current,
      newId: () => globalThis.crypto.randomUUID(),
      loginSessionKey: liveLoginKey,
      occurrence: travelSummary?.travelModeEndsAt ?? null,
      storage: window.localStorage,
      onConfirmed: (occurrence) => {
        if (occurrence) {
          setTravelActivationsHere((prev) => new Set([...prev, occurrence]))
        }
        startAlertReconcile(["travel_mode"])
      },
      onFailed: (error) => {
        console.error("[identity-verification] could not confirm Travel Mode", error)
        openFlow({
          initialState: "current-location-showcase",
          activeTravelModeUpdate: true,
        })
      },
    })
  }, [travelSummary, liveLoginKey, startAlertReconcile, openFlow])

  // The live "You are in Travel Mode" card's Update. The dashboard registers its own (it hides
  // its popup first); any other page opens the same flow, with the same detection, directly.
  const handleLiveTravelUpdate = useCallback(async () => {
    const pageHandler = observerRef.current?.handleLiveTravelUpdate
    if (pageHandler) return pageHandler()
    const fresh = await fetchIdentityVerificationSummary()
    const activeTravelModeUpdate = isActiveTravelUpdate("reminder", fresh)
    const location = await getDetectedLocation()
    openFlow(
      {
        initialState: "current-location-showcase",
        activeTravelModeUpdate,
        detectBrowserLocationOnRelocate: true,
      },
      { detectedLocation: location }
    )
  }, [openFlow])

  const closeGate = useCallback(() => setVerificationGateOpen(false), [])

  // Verify My Account, with the flow's code requested first so it is ready when the location
  // step opens it.
  const startVerification = useCallback(() => {
    void loadIdentityVerificationFlow()
    return handleVerifyMyAccount()
  }, [handleVerifyMyAccount])

  const subscribeStatusRefreshed = useCallback(
    (listener: StatusRefreshedListener) => {
      statusRefreshedListenersRef.current.add(listener)
      return () => {
        statusRefreshedListenersRef.current.delete(listener)
      }
    },
    []
  )

  // From the last final detection only (see vpnProxyDetection): null until one has arrived, and
  // the modal below is not rendered until then.
  const vpnProxyModalCopy = vpnProxyModalCopyFor(vpnProxyDetection)

  const value = useMemo<IdentityVerificationHostContextValue>(
    () => ({
      host: {
        startVerification,
        openFlow,
        flowOpen: identityFlowOpen,
        connectionCheckState,
        setCooldownRetryTime,
        closeGate,
        summary: travelSummary,
        setSummary: setTravelSummary,
        startAlertReconcile,
        setLiveAlertsHeld,
        subscribeStatusRefreshed,
      },
      observerRef,
      setResultsSurfaceMounted,
    }),
    [
      startVerification,
      openFlow,
      identityFlowOpen,
      connectionCheckState,
      closeGate,
      travelSummary,
      startAlertReconcile,
      subscribeStatusRefreshed,
    ]
  )

  return (
    <IdentityVerificationHostContext.Provider value={value}>
      {handingOff ? null : children}

      {hostActive && (
      <>
      {vpnProxyModalCopy && (
      <Dialog
        open={vpnProxyModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            dismissConnectionCheck()
            setVpnProxyModalOpen(false)
          }
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
              onClick={() => {
                dismissConnectionCheck()
                setVpnProxyModalOpen(false)
              }}
            >
              Dismiss
            </Button>
            <Button
              className="text-primary-500 bg-primary-50 hover:text-white hover:bg-primary-500"
              size="md"
              disabled={connectionCheckState === "checking"}
              onClick={() => void handleVerifyMyAccount()}
            >
              <RefreshCw className="size-[15px]" />
              Reload
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}

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

      <AccountVerificationGate
        open={verificationGateOpen}
        reason="unstarted"
        connectionCheckState={gateConnectionStateFor(
          connectionCheckState,
          retryingFromUnavailable
        )}
        onVerify={() => void handleVerifyMyAccount()}
        onRetryConnectionCheck={() => void handleVerifyMyAccount()}
        onDismissConnectionError={dismissConnectionCheck}
      />

      {/* After a Didit decline (retry_identity): the same gate, with Cancel. Verify My Account is the
          explicit retry (the same handler as everywhere); Cancel, Escape and an outside click
          only close it. */}
      <AccountVerificationGate
        open={retryGateOpen}
        reason="unstarted"
        connectionCheckState="idle"
        onVerify={() => {
          // One start per press, however fast it is double clicked: the gate closes on the
          // next render, so a second click can still land before it has.
          if (retryVerifyRunningRef.current) return
          retryVerifyRunningRef.current = true
          // The gate closes while the check runs, but the decline is not consumed yet: if Didit
          // opens and is cancelled the gate comes back; if the result arrives it is replaced by
          // the backend's answer.
          retryLaunchRef.current = true
          setRetryGateOpen(false)
          void handleVerifyMyAccount().finally(() => {
            retryVerifyRunningRef.current = false
            // Nothing opened (a limit, a block, an unavailable check): the decline is consumed.
            if (retryLaunchRef.current && !isDiditOverlayActive()) acknowledgeRetryGate()
          })
        }}
        onRetryConnectionCheck={() => void handleVerifyMyAccount()}
        onDismissConnectionError={acknowledgeRetryGate}
        onCancel={acknowledgeRetryGate}
      />

      {detectedLocation && (
        <IdentityVerificationFlow
          key={flowLaunch.key}
          open={identityFlowOpen}
          onOpenChange={handleIdentityFlowOpenChange}
          detectedLocation={detectedLocation}
          initialState={flowLaunch.initialState}
          activeTravelModeUpdate={flowLaunch.activeTravelModeUpdate}
          onTravelModeConfirmed={() => void handleTravelModeConfirmed()}
          onPermanentlyRelocated={
            flowLaunch.detectBrowserLocationOnRelocate
              ? refreshLocationForRelocation
              : undefined
          }
        />
      )}

      {/* Approximate-location consent. Mounted after the flow so, for "Permanently relocated"
          (asked while the flow is open), it stacks above it. Escape, an outside click and the
          dialog closing any other way all count as Deny. Allow authorizes the network (IP)
          lookup only; it never overrides or re-asks the browser's location permission. */}
      <Dialog
        open={locationConsentOpen}
        onOpenChange={(open) => {
          if (!open) answerLocationConsent("deny")
        }}
      >
        <DialogContent
          className="w-[calc(100%-32px)] max-w-[531px] pt-[50px]"
          accessibilityTitle="Location Access Needed"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            denyLocationButtonRef.current?.focus()
          }}
        >
          <div className="flex items-center justify-center">
            <div className="size-[48px] rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
              <AlertTriangle className="size-6" />
            </div>
          </div>

          <div className="mt-5 px-[19px]">
            <h1 className="text-lg text-center leading-7 text-dark-blue-400 font-semibold">
              Location Access Needed
            </h1>
            <DialogDescription className="mt-2 text-sm text-center leading-5 text-dark-blue-400">
              We couldn’t access your device location. Allow Marketeq to estimate your
              approximate location using your network connection.
            </DialogDescription>
          </div>

          <div className="mt-[50px] flex justify-center items-center gap-x-3">
            <Button
              ref={denyLocationButtonRef}
              className="w-[133px] bg-white focus-visible:ring-4 focus-visible:ring-primary-100"
              variant="outlined"
              visual="gray"
              size="md"
              onClick={() => answerLocationConsent("deny")}
            >
              Deny
            </Button>
            <Button
              className="w-[133px] text-primary-500 bg-primary-50 shadow-none hover:text-white hover:bg-primary-500 focus-visible:ring-4 focus-visible:ring-primary-100"
              size="md"
              onClick={() => answerLocationConsent("allow")}
            >
              Allow
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
      </>
      )}
    </IdentityVerificationHostContext.Provider>
  )
}

export function useIdentityVerification(): IdentityVerificationHost {
  const context = useContext(IdentityVerificationHostContext)
  if (!context) {
    throw new Error(
      "useIdentityVerification must be used inside IdentityVerificationHostProvider"
    )
  }
  return context.host
}

/** Registers the page's observer. The latest object passed is the one the host calls. */
export function useIdentityVerificationObserver(
  observer: IdentityHostObserver
) {
  const context = useContext(IdentityVerificationHostContext)
  const registration = context?.observerRef
  const setResultsSurfaceMounted = context?.setResultsSurfaceMounted
  // A page that registers an observer is a page that shows verification results.
  useLayoutEffect(() => {
    if (!setResultsSurfaceMounted) return
    setResultsSurfaceMounted(true)
    void loadIdentityVerificationFlow()
    return () => setResultsSurfaceMounted(false)
  }, [setResultsSurfaceMounted])
  useLayoutEffect(() => {
    if (!registration) return
    registration.current = observer
    return () => {
      if (registration.current === observer) registration.current = null
    }
  })
}
