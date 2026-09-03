import { Controller, Get, HttpCode, HttpStatus, Req } from '@nestjs/common'
import { Request } from 'express'

/**
 * Reports the caller's own public IP address.
 *
 * Settings > IP Restrictions has to tell a person which address to allow, and
 * nothing produced that value — the screen carried a constant, identical for
 * every user. The same value is what the two lockout guards have to be
 * evaluated against: the server refuses to enable the restriction unless the
 * caller's address is covered by the list, and refuses to delete the last
 * entry covering the caller while it is on. Neither can be checked against a
 * hardcoded string.
 *
 * This lives in the gateway because the gateway is the only service that sees
 * the real client. Everything downstream is reached over an internal HTTP hop,
 * so a downstream service asking Express for the remote address gets the
 * gateway. That is the same reason `proxy.service.ts` builds an
 * `x-forwarded-for` chain for the services that geolocate.
 *
 * Authentication comes from `JwtMiddleware`, which is applied to every route
 * and only exempts the patterns on its public list. Your own IP is not
 * sensitive to you, but it is tied to a session, so it stays behind auth like
 * the rest of Settings.
 */
@Controller('v1/client-ip')
export class ClientIpController {
  @Get()
  @HttpCode(HttpStatus.OK)
  getClientIp(@Req() req: Request): { ip: string | null } {
    return { ip: resolveClientIp(req) }
  }
}

/**
 * The client is the **leftmost** entry of `x-forwarded-for`. Each proxy appends
 * its own view of who called it, so the chain reads oldest-to-newest and the
 * original caller is first. Reading the last entry instead would report the
 * nearest load balancer, which is the mistake that makes an allow-list quietly
 * match nothing in production while looking fine locally.
 *
 * Falls back to Express's `req.ip`, then the raw socket, for the direct-hit
 * case with no proxy in front — which is what local development is.
 *
 * Returns null rather than a placeholder when nothing can be determined. A
 * wrong-but-plausible address is worse than an absent one here: it would be
 * offered to someone as the value to whitelist.
 */
function resolveClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for']
  const chain = Array.isArray(forwarded) ? forwarded.join(',') : forwarded

  const candidate =
    chain?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    ''

  return normaliseIp(candidate)
}

/**
 * Strips the IPv4-mapped IPv6 prefix. Node reports IPv4 clients on a
 * dual-stack socket as `::ffff:127.0.0.1`, which would never match an IPv4
 * allow-list entry a person typed in. Genuine IPv6 addresses are returned
 * untouched — the CTO's answer accepts both families.
 */
function normaliseIp(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(trimmed)
  return mapped ? mapped[1] : trimmed
}
