import { Request } from 'express';
import { isIP } from 'node:net';

/**
 * Extracts the caller's IP address from an inbound request. Same extraction
 * logic as user-service's TimezoneResolutionService.extractIp — duplicated
 * here rather than imported, since Marketeq's folder policy forbids
 * cross-imports between services' src (Technical Architecture §16).
 * Extracting this into /shared instead is flagged as an option in Technical
 * Architecture §11, not decided or approved there — it would need light
 * coordination with whoever owns user-service, out of scope for this change.
 *
 * Trusts X-Forwarded-For because api-gateway (the platform's single external
 * entry point) is expected to be the actual network edge; if that trust
 * boundary changes (Technical Architecture §12 — a "recommended default,
 * pending Infrastructure/Security confirmation"), this must be revisited.
 */
export function extractClientIp(req: Request): string | null {
  const forwardedIps = getHeaderValues(req.headers['x-forwarded-for'])
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  for (const candidate of forwardedIps) {
    const normalized = normalizeIp(candidate);
    if (normalized) return normalized;
  }

  for (const candidate of getHeaderValues(req.headers['x-real-ip'])) {
    const normalized = normalizeIp(candidate);
    if (normalized) return normalized;
  }

  const socketIp = normalizeIp(req.socket?.remoteAddress ?? null);
  if (socketIp) return socketIp;

  return normalizeIp(req.ip ?? null);
}

function getHeaderValues(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeIp(raw: string | null): string | null {
  if (!raw) return null;

  let ip = raw.trim();
  if (!ip || ip.toLowerCase() === 'unknown') return null;

  if (ip.startsWith('::ffff:')) {
    ip = ip.slice('::ffff:'.length);
  }

  if (ip.startsWith('[')) {
    const closingBracket = ip.indexOf(']');
    if (closingBracket > 0) {
      ip = ip.slice(1, closingBracket);
    }
  }

  const hasPort = ip.includes(':') && ip.includes('.');
  if (hasPort) {
    const lastColon = ip.lastIndexOf(':');
    const maybePort = ip.slice(lastColon + 1);
    if (/^\d+$/.test(maybePort)) {
      ip = ip.slice(0, lastColon);
    }
  }

  return isIP(ip) ? ip : null;
}
