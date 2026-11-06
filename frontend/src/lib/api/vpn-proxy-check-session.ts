// frontend/src/lib/api/vpn-proxy-check-session.ts
//
// The decision logic behind the shared host's VPN/proxy connection check. It holds no UI and
// calls no API: the host passes in the real check and its own state setters. Kept apart so the
// rules below can be tested without rendering the host.
//
// The host's handleVerifyMyAccount applies these rules around its own, unchanged steps.
//
// Rules (PMCM-637):
//   - The detection copy comes only from a final VPN/proxy answer. "checking", null, "none" and
//     "unavailable" have no copy, so they can never fall through to the combined message.
//   - One check at a time: a second request while one runs shares it instead of sending another.
//   - A result is applied only if its check is still the current one. Any change of context
//     (page, account, role, dismissal, unmount) invalidates the check in flight.

// The same three states as the gate's ConnectionCheckState (components/account-verification-gate.tsx);
// the host passes this module's result straight to the gate, so the compiler keeps the two equal.
export type ConnectionCheckState = "idle" | "checking" | "unavailable"

// The outcomes of vpn-proxy-detection.ts's checkVpnProxy(). The host hands checkVpnProxy to
// runConnectionCheck, so the compiler keeps this union equal to the real one.
export type VpnProxyDetectionOutcome =
  | "none"
  | "vpn_detected"
  | "proxy_detected"
  | "vpn_and_proxy_detected"
  | "unavailable"

export type VpnProxyDetection = Exclude<
  VpnProxyDetectionOutcome,
  "none" | "unavailable"
>

export interface VpnProxyModalCopy {
  title: string
  description: string
  instruction: string
}

const VPN_ONLY: VpnProxyModalCopy = {
  title: "VPN Detected",
  description:
    "To protect the integrity of your account and to verify your actual location, we do not allow using vpn services.",
  instruction: "Please turn off your VPN to continue",
}

const PROXY_ONLY: VpnProxyModalCopy = {
  title: "Proxy Detected",
  description:
    "To protect the integrity of your account and to verify your actual location, we do not allow the use of proxy services.",
  instruction: "Please disable your proxy to continue",
}

const VPN_AND_PROXY: VpnProxyModalCopy = {
  title: "VPN & Proxy Detected",
  description:
    "To protect the integrity of your account and to verify your actual location, we do not allow the use of vpn or proxy services.",
  instruction: "Please disable your VPN and proxy to continue",
}

/** The detection a final outcome stands for, or null for anything that is not a detection. */
export function detectionOf(
  outcome: VpnProxyDetectionOutcome | "checking" | null | undefined
): VpnProxyDetection | null {
  return outcome === "vpn_detected" ||
    outcome === "proxy_detected" ||
    outcome === "vpn_and_proxy_detected"
    ? outcome
    : null
}

/** The modal copy for a detection; null for every other state (never the combined copy). */
export function vpnProxyModalCopyFor(
  outcome: VpnProxyDetectionOutcome | "checking" | null | undefined
): VpnProxyModalCopy | null {
  switch (detectionOf(outcome)) {
    case "vpn_detected":
      return VPN_ONLY
    case "proxy_detected":
      return PROXY_ONLY
    case "vpn_and_proxy_detected":
      return VPN_AND_PROXY
    default:
      return null
  }
}

/**
 * What the verification gate is told while a check runs. A Retry pressed on the connection-error
 * presentation keeps showing it until the answer arrives; every other state passes through.
 */
export function gateConnectionStateFor(
  state: ConnectionCheckState,
  retryingFromUnavailable: boolean
): ConnectionCheckState {
  return state === "checking" && retryingFromUnavailable ? "unavailable" : state
}

/**
 * The shared checking presentation (the gate's "Checking...") is opened only when nothing else
 * is already showing the check: not over the detection modal (whose own button is disabled), not
 * over the gate that is already open, and not on a page that has its own checking state.
 */
export function shouldShowCheckingGate(input: {
  detectionModalOpen: boolean
  gateOpen: boolean
  pageShowsOwnChecking: boolean
}): boolean {
  return (
    !input.detectionModalOpen && !input.gateOpen && !input.pageShowsOwnChecking
  )
}

export interface ConnectionCheckSession {
  /**
   * Runs `task` as the current check. While a check is running, returns that check's promise
   * instead of starting another one. `isCurrent` turns false as soon as the check is invalidated.
   */
  run(task: (isCurrent: () => boolean) => Promise<void>): Promise<void>
  /** Drops the check in flight (its result will not be applied) and frees the next one. */
  invalidate(): void
  readonly active: boolean
}

export function createConnectionCheckSession(): ConnectionCheckSession {
  let generation = 0
  let active: Promise<void> | null = null
  return {
    run(task) {
      if (active) return active
      const mine = ++generation
      const isCurrent = () => mine === generation
      const promise = task(isCurrent).finally(() => {
        if (isCurrent()) active = null
      })
      active = promise
      return promise
    },
    invalidate() {
      generation += 1
      active = null
    },
    get active() {
      return active !== null
    },
  }
}
