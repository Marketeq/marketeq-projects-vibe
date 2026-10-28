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
import { usePathname } from "next/navigation"
import { useAuth, resolveDashboardRole } from "@/contexts/auth"
import { ROLE } from "@/types/user"
import { AlertTriangle, CheckCircle, RefreshCw } from "@blend-metrics/icons"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
} from "@/components/ui"
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
  clearReviewedResult,
  markReviewedResult,
  shouldMarkReviewedResult,
} from "@/src/lib/api/reviewed-approval-result"
import {
  clearHomeCountryChange,
  consumeHomeCountryChange,
  markHomeCountryChange,
  successAlertKindFor,
  type SuccessAlertKind,
} from "@/src/lib/api/home-country-change-result"
import { isTravelModeInForce } from "@/src/lib/api/travel-popup"
import { ALERT_RECENCY_WINDOW_MS } from "@/src/lib/api/status-alert-reconcile"
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
  /** The host saw a result whose persistent alert is stored asynchronously. */
  startAlertReconcile?: (
    expected: StatusAlert["type"][],
    options?: { sinceMs?: number }
  ) => void
  /** A start attempt was refused as not startable: the page re-reads the real status. */
  runIdentityVerificationCheck?: () => Promise<void>
  /** An approval was just shown; the kind says which success alert would follow it. */
  setSuccessAlertKind?: (kind: SuccessAlertKind) => void
  /** The flow's already-active traveler confirmation ("Temporarily traveling" on Update). */
  handleTravelModeConfirmed?: () => Promise<void>
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
  // Didit-return results are handled only while a page that shows them is mounted: the awaiting
  // marker is consumed by the page that can announce the result, never by another page.
  const [resultsSurfaceMounted, setResultsSurfaceMounted] = useState(false)
  const observerRef = useRef<IdentityHostObserver | null>(null)
  const statusRefreshedListenersRef = useRef(new Set<StatusRefreshedListener>())
  const openOnClosedRef = useRef<(() => void) | null>(null)

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
  const startAlertReconcile = useCallback(
    (expected: StatusAlert["type"][], options?: { sinceMs?: number }) =>
      observerRef.current?.startAlertReconcile?.(expected, options),
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
  const handleTravelModeConfirmed = useCallback(
    async () => observerRef.current?.handleTravelModeConfirmed?.(),
    []
  )

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

  // Everything above belongs to one account on one page. When the page, the account, the role
  // or the sign-in changes (or a public page is entered, or nobody is signed in), it is all
  // closed and forgotten, exactly as it was when the dashboard unmounted and a new one mounted.
  // A layout effect, so it settles before the new page's own effects start anything.
  const resetKey = identityHostResetKey({
    pathname,
    userId: user?.id,
    role: user ? resolveDashboardRole(user) : null,
  })
  const resetKeyRef = useRef(resetKey)
  useLayoutEffect(() => {
    if (resetKeyRef.current === resetKey) return
    resetKeyRef.current = resetKey
    setVerificationGateOpen(false)
    setConnectionCheckState("idle")
    setVpnProxyResult(null)
    setVpnProxyModalOpen(false)
    setIdentityFlowOpen(false)
    setDetectedLocation(null)
    setFlowLaunch({ key: 0 })
    setVerifiedModalOpen(false)
    setPendingModalOpen(false)
    setCooldownRetryTime(null)
    openOnClosedRef.current = null
  }, [resetKey])

  // Held in a ref so rerenders and StrictMode's double effect share one reconcile.
  const returnReconcilerRef = useRef<ReturnType<
    typeof createReturnReconciler
  > | null>(null)

  useEffect(() => {
    if (!user) return
    if (resolveDashboardRole(user) !== ROLE.TALENT) return
    if (!hostActive || !resultsSurfaceMounted) return

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
  }, [user, startAlertReconcile, hostActive, resultsSurfaceMounted])

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
    observerRef.current?.handleIdentityFlowOpenChange?.(open)
    if (open) return
    const onClosed = openOnClosedRef.current
    openOnClosedRef.current = null
    onClosed?.()
  }, [])

  const openFlow = useCallback(
    (launch: IdentityFlowLaunch, options: IdentityFlowOpenOptions = {}) => {
      if (options.detectedLocation) setDetectedLocation(options.detectedLocation)
      setFlowLaunch((prev) => ({ key: prev.key + 1, ...launch }))
      openOnClosedRef.current = options.onClosed ?? null
      setIdentityFlowOpen(true)
    },
    []
  )

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

  const value = useMemo<IdentityVerificationHostContextValue>(
    () => ({
      host: {
        startVerification,
        openFlow,
        flowOpen: identityFlowOpen,
        connectionCheckState,
        setCooldownRetryTime,
        closeGate,
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
      subscribeStatusRefreshed,
    ]
  )

  return (
    <IdentityVerificationHostContext.Provider value={value}>
      {children}

      {hostActive && (
      <>
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
          onTravelModeConfirmed={() => void handleTravelModeConfirmed()}
          onPermanentlyRelocated={
            flowLaunch.detectBrowserLocationOnRelocate
              ? refreshLocationForRelocation
              : undefined
          }
        />
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
