import type { Request } from 'express'

/**
 * Client IP for rate limiting.
 *
 * Deliberately NOT the leftmost x-forwarded-for entry (which is what
 * controllers/client-ip.controller.ts shows the user). The leftmost entry is
 * whatever the client chose to send, so keying limits on it would let an
 * attacker get a fresh bucket on every request just by changing a header.
 *
 * Each proxy in front of the gateway appends the address it received the
 * connection from. With `trustedHops` proxies we trust (Render's edge by
 * default), the entry `trustedHops` places from the right was written by the
 * outermost trusted proxy and cannot be forged by the client. If the chain is
 * shorter than expected, the request did not come through the proxies, so
 * the socket address is the only trustworthy value.
 */
export function resolveClientIp(req: Request, trustedHops: number): string {
  const socketIp = normaliseIp(req.socket?.remoteAddress) ?? 'unknown'
  if (trustedHops <= 0) return socketIp

  const chain = forwardedChain(req)
  if (chain.length < trustedHops) return socketIp
  return normaliseIp(chain[chain.length - trustedHops]) ?? socketIp
}

export function forwardedChain(req: Request): string[] {
  const header = req.headers['x-forwarded-for']
  const joined = Array.isArray(header) ? header.join(',') : header ?? ''
  return joined
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Strips the IPv4-mapped IPv6 prefix so ::ffff:1.2.3.4 and 1.2.3.4 share a bucket. */
export function normaliseIp(value: string | undefined | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed
}
