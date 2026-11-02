import { Request } from 'express';
import { isIP } from 'node:net';

/**
 * The caller's IP as vouched for by the platform, or null.
 *
 * Trust model (Render support, 2026-10-30): the visitor IP arrives in
 * `CF-Connecting-IP`; Cloudflare rejects an external caller that supplies that
 * header itself. api-gateway, the only public entry point, overwrites it with
 * one validated address before forwarding, so on the private hop to this
 * service the header was set by our own gateway. `X-Forwarded-For` and
 * `X-Real-IP` are never read: Render appends to a caller-supplied chain, so
 * every position in it can be forged (a clean fake first entry hid a VPN exit).
 *
 * Render provides no header that tells public from private traffic, so no such
 * distinction is attempted here.
 *
 * Returns null — and callers fail closed — when the header is missing, repeated,
 * a list, or not one valid address. The socket address is used only when
 * NODE_ENV is 'development' and the header is absent, i.e. a developer machine
 * with no Cloudflare in front. In every other environment the socket peer is
 * Render's load balancer and must never stand in for the client.
 */
export function extractClientIp(req: Request): string | null {
  const header = req.headers['cf-connecting-ip'];
  if (header !== undefined) {
    return typeof header === 'string' ? normalizeIp(header) : null;
  }

  if (process.env.NODE_ENV === 'development') {
    return normalizeIp(req.socket?.remoteAddress ?? null);
  }

  return null;
}

function normalizeIp(raw: string | null): string | null {
  if (!raw) return null;

  const value = raw.trim();
  // A list, port, brackets or IPv6 zone id make the value ambiguous.
  if (!value || value.length > 45 || /[\s,%[\]]/.test(value)) return null;

  let candidate = value;
  const mappedDotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(value);
  const mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(value);
  if (mappedDotted) {
    candidate = mappedDotted[1];
  } else if (mappedHex) {
    const high = parseInt(mappedHex[1], 16);
    const low = parseInt(mappedHex[2], 16);
    candidate = [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
  }

  const family = isIP(candidate);
  if (family === 0) return null;
  return family === 6 ? candidate.toLowerCase() : candidate;
}
