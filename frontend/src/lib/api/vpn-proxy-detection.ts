// frontend/src/lib/api/vpn-proxy-detection.ts
//
// Isolated VPN/proxy detection client. The real identity-verification-service
// endpoint does not exist yet (backend work, tracked on a separate branch —
// this file must never call it, create it, or assume its shape beyond the
// outcome type below). This module is a temporary, self-contained mock so
// the frontend can be built and tested against all outcomes without
// depending on an unmerged backend branch. Swap `checkVpnProxy`'s body for
// a real fetch call once the endpoint ships; the return type and call
// sites do not need to change.
//
// Outcome values mirror identity-verification-service's own
// VpnProxyDetectionResult enum (none / vpn_detected / proxy_detected /
// vpn_and_proxy_detected) exactly, plus "unavailable" — a frontend-only
// sentinel for "the check itself failed or produced no answer," which is
// not a vendor signal and must never be treated the same as a clean
// ("none") result. Whether an "unavailable" result should eventually
// fail-open or fail-closed is an explicit, unresolved product/security
// decision (see docs/md/Identity Verification Service) — this file does
// not decide it, and neither does any caller of this function.
export type VpnProxyDetectionOutcome =
  | "none"
  | "vpn_detected"
  | "proxy_detected"
  | "vpn_and_proxy_detected"
  | "unavailable"

// Dev-only override so every outcome can be exercised without a real
// backend, e.g. in the browser console:
//   localStorage.setItem("__mock_vpn_proxy_result", "vpn_detected")
// then reload/retry. This override — and the "none" default below — are
// ONLY read outside production builds. A production build always resolves
// "unavailable", since there is genuinely no detection capability to ask
// yet; it must never fabricate a clean result. This entire mock (override
// mechanism included) is removed once the real endpoint is wired in.
const MOCK_OVERRIDE_KEY = "__mock_vpn_proxy_result"
const VALID_OUTCOMES: VpnProxyDetectionOutcome[] = [
  "none",
  "vpn_detected",
  "proxy_detected",
  "vpn_and_proxy_detected",
  "unavailable",
]

function readDevMockOverride(): VpnProxyDetectionOutcome | null {
  if (process.env.NODE_ENV === "production") return null
  try {
    if (typeof localStorage === "undefined") return null
    const value = localStorage.getItem(MOCK_OVERRIDE_KEY)
    return (VALID_OUTCOMES as string[]).includes(value ?? "")
      ? (value as VpnProxyDetectionOutcome)
      : null
  } catch {
    return null
  }
}

/**
 * Checks whether the current connection is behind a VPN, a proxy, both, or
 * neither. TEMPORARY MOCK — see file header.
 *
 * - Non-production: returns a dev override if one is set (see
 *   MOCK_OVERRIDE_KEY above), otherwise defaults to "none" purely for
 *   local development convenience.
 * - Production: always resolves "unavailable". There is no real backend
 *   endpoint to call yet, and this function must never silently assume a
 *   clean result in an environment real users reach.
 */
export async function checkVpnProxy(): Promise<VpnProxyDetectionOutcome> {
  if (process.env.NODE_ENV !== "production") {
    return readDevMockOverride() ?? "none"
  }
  return "unavailable"
}
