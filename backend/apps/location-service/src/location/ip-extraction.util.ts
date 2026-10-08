import { isIP } from 'node:net';

/**
 * Canonical IP extraction — the stronger of the two existing implementations.
 * Lifted from user-service/timezone-resolution.service.ts with its full
 * normalisation (bracketed IPv6, port stripping, x-real-ip, req.ip fallback).
 *
 * This is the single copy that both endpoints use. The earnings-service copy
 * (which lacked x-real-ip and bracketed IPv6) is superseded by this one.
 */

export interface IpExtractableRequest {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  ip?: string;
}

export function extractClientIp(req: IpExtractableRequest): string | null {
  const xForwardedFor = req.headers['x-forwarded-for'];
  const forwardedIps = getHeaderValues(xForwardedFor)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  for (const candidate of forwardedIps) {
    const normalized = normalizeIp(candidate);
    if (normalized) return normalized;
  }

  const xRealIp = getHeaderValues(req.headers['x-real-ip']);
  for (const candidate of xRealIp) {
    const normalized = normalizeIp(candidate);
    if (normalized) return normalized;
  }

  const socketIp = req.socket?.remoteAddress;
  const normalizedSocketIp = normalizeIp(socketIp ?? null);
  if (normalizedSocketIp) return normalizedSocketIp;

  const expressIp = normalizeIp(req.ip ?? null);
  if (expressIp) return expressIp;

  return null;
}

function getHeaderValues(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function normalizeIp(raw: string | null): string | null {
  if (!raw) return null;

  let ip = raw.trim();
  if (!ip || ip.toLowerCase() === 'unknown') return null;

  // Strip IPv6-mapped IPv4 prefix
  if (ip.startsWith('::ffff:')) {
    ip = ip.slice('::ffff:'.length);
  }

  // Strip bracketed IPv6 (e.g. [::1])
  if (ip.startsWith('[')) {
    const closingBracket = ip.indexOf(']');
    if (closingBracket > 0) {
      ip = ip.slice(1, closingBracket);
    }
  }

  // Strip port from IPv4:port (e.g. 1.2.3.4:8080)
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
