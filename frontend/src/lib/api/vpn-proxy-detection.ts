// frontend/src/lib/api/vpn-proxy-detection.ts
//
// Real backend VPN/proxy connection check — identity-verification-service's
// GET /v1/identity-verification/connection-check, guarded server-side by
// VpnProxyCheckGuard (proxycheck.io-backed, real IP via extractClientIp).
// Replaces the earlier mock; the outcome type and call sites are unchanged.
//
// Blocked on the same pending gateway routing patch as detected-location.ts
// (.claude/pending-review/proxy.service.cto-review.{patch,md}) — until
// that's approved, this call 502s through the gateway, which this file
// correctly reports as "unavailable", never "none".
//
// Settled failure policy (identity-verification-service's
// ConnectionCheckUnavailableException / AllExceptionsFilter): a clean
// result is the only thing that resolves "none". VPN/proxy/both map to
// their own outcome from the backend's actual detected value — never
// invented client-side. Everything else (network failure, timeout, 502,
// 503, an unexpected response shape) resolves "unavailable". A caller
// must never treat "unavailable" as "none" — the two are never conflated.
import { IdentityVerificationAPI } from "@/service/http/identity-verification"

export type VpnProxyDetectionOutcome =
  | "none"
  | "vpn_detected"
  | "proxy_detected"
  | "vpn_and_proxy_detected"
  | "unavailable"

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

const DETECTED_RESULT_TO_OUTCOME: Record<string, VpnProxyDetectionOutcome> = {
  vpn_detected: "vpn_detected",
  proxy_detected: "proxy_detected",
  vpn_and_proxy_detected: "vpn_and_proxy_detected",
}

/**
 * Checks whether the current connection is behind a VPN, a proxy, both, or
 * neither. Real backend call — see file header for the failure policy.
 *
 * Dev-only override still works for testing without a real masked
 * connection, e.g.:
 *   localStorage.setItem('__mock_vpn_proxy_result', 'vpn_detected')
 */
export async function checkVpnProxy(): Promise<VpnProxyDetectionOutcome> {
  const override = readDevMockOverride()
  if (override) return override

  try {
    await IdentityVerificationAPI.checkConnection()
    return "none"
  } catch (err) {
    const data = (err as { response?: { data?: { code?: string; details?: unknown } } })
      ?.response?.data
    const code = data?.code
    const vpnProxyResult = (data?.details as { vpnProxyResult?: string } | undefined)
      ?.vpnProxyResult

    if (code === "VPN_PROXY_DETECTED" && vpnProxyResult) {
      return DETECTED_RESULT_TO_OUTCOME[vpnProxyResult] ?? "unavailable"
    }

    // CONNECTION_CHECK_UNAVAILABLE, a network error, a gateway 502 (routing
    // still pending CTO approval), or any other unexpected shape — all
    // fold into "unavailable", never "none".
    return "unavailable"
  }
}
