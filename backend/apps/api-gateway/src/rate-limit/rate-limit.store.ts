import Redis from 'ioredis'
import { Logger } from '@nestjs/common'

export interface HitResult {
  /** Requests counted in the current window, including this one. */
  count: number
  /** Milliseconds until the current window resets. */
  resetMs: number
}

export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<HitResult>
  close(): Promise<void>
}

/**
 * Fixed-window counters held in this process. Used on its own when REDIS_URL
 * is unset (local dev), and as the fallback whenever Redis is unreachable so
 * limits keep applying instead of switching off.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>()
  private readonly sweepTimer: NodeJS.Timeout

  constructor(
    private readonly maxKeys = 100_000,
    private readonly now: () => number = Date.now,
  ) {
    // Drop expired windows so an attacker rotating keys cannot grow the map
    // forever. unref() so the timer never keeps the process alive.
    this.sweepTimer = setInterval(() => this.sweep(), 60_000)
    this.sweepTimer.unref?.()
  }

  async hit(key: string, windowMs: number): Promise<HitResult> {
    return this.hitSync(key, windowMs)
  }

  hitSync(key: string, windowMs: number): HitResult {
    const now = this.now()
    let bucket = this.buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      if (!bucket && this.buckets.size >= this.maxKeys) {
        this.sweep()
        // Still full after removing expired windows: start over rather than
        // let memory grow without bound. Under that much key churn the
        // gateway is being flooded and the edge/WAF is the real defence.
        if (this.buckets.size >= this.maxKeys) this.buckets.clear()
      }
      bucket = { count: 0, resetAt: now + windowMs }
      this.buckets.set(key, bucket)
    }
    bucket.count += 1
    return { count: bucket.count, resetMs: Math.max(0, bucket.resetAt - now) }
  }

  size(): number {
    return this.buckets.size
  }

  sweep(): void {
    const now = this.now()
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key)
    }
  }

  async close(): Promise<void> {
    clearInterval(this.sweepTimer)
    this.buckets.clear()
  }
}

// INCR and PEXPIRE in one atomic step, so concurrent requests on any number
// of gateway instances share one exact count and a key can never be left
// without an expiry (the PTTL check repairs a key that somehow lost it).
const HIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { count, ttl }
`

/**
 * Redis-backed counters shared by every gateway instance and surviving
 * restarts/redeploys. Never blocks a request on Redis: if the connection is
 * not ready, or a command errors or takes longer than commandTimeout, the
 * hit is counted in the in-memory fallback instead.
 */
export class RedisRateLimitStore implements RateLimitStore {
  private readonly redis: Redis
  private lastErrorLogAt = 0

  constructor(
    redisUrl: string,
    private readonly fallback: MemoryRateLimitStore,
    private readonly logger: Logger,
  ) {
    this.redis = new Redis(redisUrl, {
      // Fail fast instead of queueing commands while disconnected; the
      // fallback store covers the gap.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      commandTimeout: 250,
      // Keep reconnecting (capped backoff) so limits move back to Redis on
      // their own once it recovers, rather than giving up after N tries.
      retryStrategy: (times) => Math.min(times * 500, 30_000),
    })
    this.redis.on('error', (err) => this.logThrottled(`Redis error: ${err.message}`))
    this.redis.on('ready', () => this.logger.log('Rate-limit counters connected to Redis'))
  }

  async hit(key: string, windowMs: number): Promise<HitResult> {
    if (this.redis.status !== 'ready') {
      return this.fallback.hitSync(key, windowMs)
    }
    try {
      const [count, ttl] = (await this.redis.eval(HIT_SCRIPT, 1, key, String(windowMs))) as [
        number,
        number,
      ]
      return { count: Number(count), resetMs: Math.max(0, Number(ttl)) }
    } catch (err: any) {
      this.logThrottled(`Redis rate-limit command failed, using in-memory fallback: ${err?.message ?? err}`)
      return this.fallback.hitSync(key, windowMs)
    }
  }

  async close(): Promise<void> {
    await this.fallback.close()
    // quit() only makes sense on a live connection. While Redis is down the
    // client is in a reconnect loop, and only disconnect() stops it; without
    // this, shutdown would hang on the pending reconnect timer.
    if (this.redis.status !== 'ready') {
      this.redis.disconnect()
      return
    }
    try {
      await this.redis.quit()
    } catch {
      this.redis.disconnect()
    }
  }

  // At most one Redis warning per minute: render.yaml records that an
  // unreachable Redis once produced ~958 log lines per window and buried
  // real faults.
  private logThrottled(message: string) {
    const now = Date.now()
    if (now - this.lastErrorLogAt < 60_000) return
    this.lastErrorLogAt = now
    this.logger.warn(message)
  }
}
