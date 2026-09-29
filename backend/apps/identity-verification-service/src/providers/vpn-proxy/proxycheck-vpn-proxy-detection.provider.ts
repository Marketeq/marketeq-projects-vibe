import { Injectable, Logger } from '@nestjs/common';
import { VpnProxyDetectionResult } from '../../entities/enums/identity-verification.enums';
import { ConnectionCheckUnavailableException } from '../../common/errors/domain-exceptions';
import {
  DetectVpnProxyInput,
  VpnProxyDetectionProvider,
} from './vpn-proxy-detection-provider.interface';

// Real proxycheck.io v3 integration. Verified live (not assumed) before
// writing this: no `vpn=` query parameter is needed — `detections.vpn` and
// `detections.proxy` are both present, independent booleans, by default.
// An invalid API key does NOT produce a distinguishable error from this
// endpoint — proxycheck.io silently falls back to unregistered-tier
// behavior and still returns status "ok". This is a known, real gap: key
// misconfiguration is not detectable from this call alone. Confirmed via a
// real (keyless) test request; documented here rather than invented.
interface ProxyCheckDetections {
  vpn?: unknown;
  proxy?: unknown;
}

interface ProxyCheckResponse {
  status?: string;
  [ip: string]: unknown;
}

// proxycheck.io does not reliably reject a private/loopback/reserved IP:
// IPv4 private ranges (127.0.0.1, 10.x, 192.168.x) do correctly come back
// status "error" — but IPv6 loopback (::1) comes back status "ok" with
// vpn:false, proxy:false and every other field null/zero. Confirmed live
// before writing this check. A request whose only resolvable IP is one of
// these is never something this check can meaningfully answer for, so it
// must never be allowed to reach the provider and produce a "clean" pass.
// Local development only (see the NODE_ENV gate in detect()): the exact
// loopback spellings a browser on the same machine produces. Deliberately
// not the whole 127.0.0.0/8 block, and not any private/link-local range —
// those keep failing closed everywhere, development included.
const LOOPBACK_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

function isUsablePublicIp(ip: string): boolean {
  if (ip === '::1' || ip === '::' || ip === '0.0.0.0') return false;

  const ipv4Match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (ipv4Match) {
    const [a, b] = ipv4Match.slice(1, 3).map(Number);
    if (a === 127) return false; // loopback
    if (a === 10) return false; // RFC1918
    if (a === 172 && b >= 16 && b <= 31) return false; // RFC1918
    if (a === 192 && b === 168) return false; // RFC1918
    if (a === 169 && b === 254) return false; // link-local
    return true;
  }

  const lower = ip.toLowerCase();
  if (lower.startsWith('fe80:')) return false; // IPv6 link-local
  if (/^fc[0-9a-f]{2}:|^fd[0-9a-f]{2}:/.test(lower)) return false; // IPv6 unique-local

  return true;
}

@Injectable()
export class ProxyCheckVpnProxyDetectionProvider implements VpnProxyDetectionProvider {
  private readonly logger = new Logger(ProxyCheckVpnProxyDetectionProvider.name);
  private readonly baseUrl = 'https://proxycheck.io/v3';
  private readonly apiKey = process.env.PROXYCHECK_API_KEY;
  private readonly timeoutMs = 5000;

  async detect(input: DetectVpnProxyInput): Promise<VpnProxyDetectionResult> {
    // No real client IP could be established — a failed check, never NONE.
    if (!input.ipAddress) {
      this.logger.warn('VPN/proxy check attempted with no resolvable client IP');
      throw new ConnectionCheckUnavailableException({ reason: 'no_client_ip' });
    }
    // Local development only: a developer running the whole stack on their own
    // machine always reaches this service from loopback, which can never be
    // checked, so the fail-closed rule below would block every guarded route
    // (e.g. document upload) locally. Allow exactly the loopback addresses
    // when NODE_ENV is 'development'. Read at call time; any other NODE_ENV
    // (production, staging, test, unset) keeps the unchanged fail-closed path
    // below, and public IPs are always checked normally.
    if (process.env.NODE_ENV === 'development' && LOOPBACK_IPS.has(input.ipAddress)) {
      this.logger.debug(`VPN/proxy check skipped for loopback ${input.ipAddress} (development only)`);
      return VpnProxyDetectionResult.NONE;
    }
    // A private/loopback/reserved IP can never be meaningfully checked —
    // never let it reach the provider and risk a false "clean" pass.
    if (!isUsablePublicIp(input.ipAddress)) {
      this.logger.warn(`VPN/proxy check attempted with an unusable IP: ${input.ipAddress}`);
      throw new ConnectionCheckUnavailableException({ reason: 'unusable_client_ip' });
    }
    if (!this.apiKey) {
      this.logger.error('PROXYCHECK_API_KEY is not configured');
      throw new ConnectionCheckUnavailableException({ reason: 'missing_api_key' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(
        `${this.baseUrl}/${encodeURIComponent(input.ipAddress)}?key=${this.apiKey}`,
        { signal: controller.signal },
      );
    } catch (err) {
      this.logger.warn(`proxycheck.io request failed: ${(err as Error).message}`);
      throw new ConnectionCheckUnavailableException({ reason: 'request_failed' });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new ConnectionCheckUnavailableException({
        reason: 'http_error',
        httpStatus: response.status,
      });
    }

    let body: ProxyCheckResponse;
    try {
      body = (await response.json()) as ProxyCheckResponse;
    } catch {
      throw new ConnectionCheckUnavailableException({ reason: 'malformed_json' });
    }

    // proxycheck.io's denied/error statuses (quota exhausted, blocked,
    // malformed request) surface as status !== "ok" with no per-IP
    // detections object — verified live. Never coerced into a clean result.
    if (body.status !== 'ok') {
      throw new ConnectionCheckUnavailableException({
        reason: 'provider_status',
        providerStatus: body.status,
      });
    }

    const record = body[input.ipAddress] as { detections?: ProxyCheckDetections } | undefined;
    const detections = record?.detections;

    // Strict validation: both fields must be real booleans, or this is a
    // failed check, never a clean result — missing/invalid fields must
    // never become "none".
    if (typeof detections?.vpn !== 'boolean' || typeof detections?.proxy !== 'boolean') {
      throw new ConnectionCheckUnavailableException({ reason: 'malformed_detections' });
    }

    const { vpn, proxy } = detections;
    if (vpn && proxy) return VpnProxyDetectionResult.VPN_AND_PROXY_DETECTED;
    if (vpn) return VpnProxyDetectionResult.VPN_DETECTED;
    if (proxy) return VpnProxyDetectionResult.PROXY_DETECTED;
    return VpnProxyDetectionResult.NONE;
  }
}
