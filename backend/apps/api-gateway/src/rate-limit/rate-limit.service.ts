import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request, Response, NextFunction } from 'express'
import {
  RateLimitMode,
  RateLimitStage,
  RateLimitTier,
  USER_ONLY_RULES,
  buildTiers,
  isExemptPath,
  normalizePath,
  parseAllowlist,
  parseMode,
  parseTrustedProxyHops,
} from './rate-limit.config'
import { forwardedChain, resolveClientIp } from './client-ip'
import { MemoryRateLimitStore, RateLimitStore, RedisRateLimitStore } from './rate-limit.store'

interface Check {
  tier: RateLimitTier
  key: string
}

export interface RateLimitDecision {
  tier: RateLimitTier
  key: string
  count: number
  retryAfterSec: number
  /** True only for the first request over the limit in a window (log once). */
  firstOverLimit: boolean
}

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly logger = new Logger('RateLimit')
  readonly mode: RateLimitMode
  readonly trustedProxyHops: number
  private readonly allowlist: Set<string>
  private readonly tiers: RateLimitTier[]
  private readonly keyPrefix: string
  private readonly store: RateLimitStore
  private loggedForwardedShape = false

  constructor(config: ConfigService) {
    const get = (key: string) => config.get<string>(key) ?? undefined

    const { mode, valid } = parseMode(get('RATE_LIMIT_MODE'))
    this.mode = mode
    if (!valid) {
      this.logger.warn(
        `RATE_LIMIT_MODE="${get('RATE_LIMIT_MODE')}" is not one of off|monitor|enforce; using "monitor"`,
      )
    }
    this.trustedProxyHops = parseTrustedProxyHops(get('RATE_LIMIT_TRUSTED_PROXY_HOPS'))
    this.allowlist = parseAllowlist(get('RATE_LIMIT_IP_ALLOWLIST'))
    this.tiers = buildTiers(get)
    this.keyPrefix = (get('RATE_LIMIT_KEY_PREFIX') || 'rl:gw').trim()

    const memory = new MemoryRateLimitStore()
    const redisUrl = get('REDIS_URL')
    this.store = redisUrl ? new RedisRateLimitStore(redisUrl, memory, this.logger) : memory

    this.logger.log(
      `Rate limiting mode=${this.mode} store=${redisUrl ? 'redis (in-memory fallback)' : 'in-memory'} ` +
        `trustedProxyHops=${this.trustedProxyHops} allowlisted=${this.allowlist.size}`,
    )
    if (!redisUrl && process.env.NODE_ENV === 'production') {
      this.logger.warn('REDIS_URL is not set: rate-limit counters are per-process and reset on restart')
    }
  }

  /**
   * Shared body of the pre-auth and post-auth middlewares. Never throws and
   * never fails closed on its own errors: if counting fails the request is
   * let through (the in-memory fallback already covers Redis outages).
   */
  async handle(stage: RateLimitStage, req: Request, res: Response, next: NextFunction): Promise<void> {
    if (this.mode === 'off' || req.method.toUpperCase() === 'OPTIONS') return next()

    const path = normalizePath(req.originalUrl)
    if (isExemptPath(path)) return next()

    if (stage === 'pre-auth') this.logForwardedShapeOnce(req)
    const ip = resolveClientIp(req, this.trustedProxyHops)
    if (this.allowlist.has(ip)) return next()

    const userId: string | undefined = (req as any).user?.userId || undefined
    const checks = this.checksFor(stage, req.method, path, ip, userId)
    if (checks.length === 0) return next()

    let decision: RateLimitDecision | null
    try {
      decision = await this.evaluate(checks)
    } catch (err: any) {
      this.logger.warn(`Rate-limit evaluation failed, allowing request: ${err?.message ?? err}`)
      return next()
    }
    if (!decision) return next()

    if (decision.firstOverLimit) {
      this.logger.warn(
        `${this.mode === 'enforce' ? 'BLOCK' : 'WOULD_BLOCK'} rule=${decision.tier.name} ` +
          `limit=${decision.tier.limit}/${decision.tier.windowMs / 1000}s key=${decision.key} ` +
          `ip=${ip} user=${userId ?? '-'} method=${req.method} path=${path}`,
      )
    }

    if (this.mode !== 'enforce') return next()
    this.reject(res, decision.retryAfterSec)
  }

  checksFor(
    stage: RateLimitStage,
    method: string,
    path: string,
    ip: string,
    userId: string | undefined,
  ): Check[] {
    const checks: Check[] = []
    for (const tier of this.tiers) {
      if (tier.stage !== stage || !tier.matches(method, path)) continue
      if (tier.keyBy === 'user') {
        if (!userId && USER_ONLY_RULES.has(tier.name)) continue
        checks.push({ tier, key: userId ? `u:${userId}` : `ip:${ip}` })
      } else {
        checks.push({ tier, key: `ip:${ip}` })
      }
    }
    return checks
  }

  /** Counts the request in every matching bucket; returns the tightest violation, if any. */
  async evaluate(checks: Check[]): Promise<RateLimitDecision | null> {
    const results = await Promise.all(
      checks.map(async (c) => ({
        check: c,
        hit: await this.store.hit(`${this.keyPrefix}:${c.tier.name}:${c.key}`, c.tier.windowMs),
      })),
    )

    let worst: RateLimitDecision | null = null
    for (const { check, hit } of results) {
      if (hit.count <= check.tier.limit) continue
      const retryAfterSec = Math.max(1, Math.ceil(hit.resetMs / 1000))
      if (!worst || retryAfterSec > worst.retryAfterSec) {
        worst = {
          tier: check.tier,
          key: check.key,
          count: hit.count,
          retryAfterSec,
          firstOverLimit: hit.count === check.tier.limit + 1,
        }
      }
    }
    return worst
  }

  // Same body shape GlobalExceptionFilter produces ({ statusCode, code,
  // message, details }) so the frontend's error handling reads it like any
  // other gateway error. Written directly instead of thrown so that a flood
  // does not also produce one GlobalExceptionFilter error log per request.
  private reject(res: Response, retryAfterSec: number) {
    res.setHeader('Retry-After', String(retryAfterSec))
    res.status(429).json({
      statusCode: 429,
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please wait a moment and try again.',
      details: { retryAfterSeconds: retryAfterSec },
    })
  }

  // One line per process showing how many x-forwarded-for entries arrive, so
  // RATE_LIMIT_TRUSTED_PROXY_HOPS can be checked against real traffic without
  // logging anyone's address.
  private logForwardedShapeOnce(req: Request) {
    if (this.loggedForwardedShape) return
    const entries = forwardedChain(req).length
    if (entries === 0) return
    this.loggedForwardedShape = true
    this.logger.log(
      `x-forwarded-for carries ${entries} entr${entries === 1 ? 'y' : 'ies'}; ` +
        `using entry ${this.trustedProxyHops} from the right (RATE_LIMIT_TRUSTED_PROXY_HOPS=${this.trustedProxyHops})`,
    )
  }

  async onModuleDestroy() {
    await this.store.close()
  }
}
