import type { Request } from 'express'
import { isIP } from 'node:net'

/**
 * The visitor's IP, taken from the one header the platform vouches for.
 *
 * Render's confirmed model (Render support, 2026-10-30): every public request
 * passes Cloudflare and then Render's load balancers, the socket peer is
 * Render's load balancer, and the visitor IP is in `CF-Connecting-IP`.
 * Cloudflare rejects an external caller that supplies that header itself.
 * `X-Forwarded-For` is deliberately never read here: Render does not replace a
 * caller-supplied chain, so any position in it can be forged.
 *
 * Requests on Render's private network skip Cloudflare, and Render gives no
 * header that says which kind of request this is. This function therefore does
 * not try to tell them apart. The gateway is the only public entry point, and
 * the only thing it ever forwards downstream is the single value returned here.
 */

/** Exactly one syntactically valid IP, canonicalised; anything ambiguous is null. */
export function normalizeTrustedIp(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  // A list ("a, b"), a port, brackets or an IPv6 zone id make the value
  // ambiguous about which address is meant, so none of them are accepted.
  if (!value || value.length > 45 || /[\s,%[\]]/.test(value)) return null

  const mappedDotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(value)
  const mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(value)
  let candidate = value
  if (mappedDotted) {
    candidate = mappedDotted[1]
  } else if (mappedHex) {
    const high = parseInt(mappedHex[1], 16)
    const low = parseInt(mappedHex[2], 16)
    candidate = [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.')
  }

  const family = isIP(candidate)
  if (family === 0) return null
  return family === 6 ? candidate.toLowerCase() : candidate
}

/**
 * `CF-Connecting-IP` when it carries one valid address. When the header is
 * absent, only a local development run (no Cloudflare in front) may fall back
 * to the direct socket address. A present-but-invalid header never falls back,
 * and neither does any other environment: the caller gets null, and the
 * services behind the gateway then fail closed instead of being handed the
 * load balancer's address.
 */
export function resolveTrustedClientIp(
  req: Pick<Request, 'headers' | 'socket'>,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const header = req.headers['cf-connecting-ip']
  if (header !== undefined) {
    return typeof header === 'string' ? normalizeTrustedIp(header) : null
  }
  if (env.NODE_ENV === 'development') {
    return normalizeTrustedIp(req.socket?.remoteAddress)
  }
  return null
}
