import type { Request, Response } from 'express'
import { buildTiers, normalizePath, parseMode, parseTrustedProxyHops } from './rate-limit.config'
import { resolveClientIp } from './client-ip'
import { MemoryRateLimitStore } from './rate-limit.store'
import { RateLimitService } from './rate-limit.service'

const makeConfig = (env: Record<string, string>) =>
  ({ get: (key: string) => env[key] }) as any

function makeReq(opts: {
  method?: string
  url: string
  ip?: string
  xff?: string
  userId?: string
}): Request {
  return {
    method: opts.method ?? 'GET',
    originalUrl: opts.url,
    headers: opts.xff ? { 'x-forwarded-for': opts.xff } : {},
    socket: { remoteAddress: opts.ip ?? '10.0.0.1' },
    user: opts.userId ? { userId: opts.userId } : undefined,
  } as unknown as Request
}

function makeRes() {
  const res: any = { headers: {} as Record<string, string>, statusCode: 200, body: undefined }
  res.setHeader = (k: string, v: string) => ((res.headers[k] = v), res)
  res.status = (code: number) => ((res.statusCode = code), res)
  res.json = (body: unknown) => ((res.body = body), res)
  return res as Response & { headers: Record<string, string>; statusCode: number; body: any }
}

async function send(
  svc: RateLimitService,
  stage: 'pre-auth' | 'post-auth',
  reqOpts: Parameters<typeof makeReq>[0],
) {
  const res = makeRes()
  let passed = false
  await svc.handle(stage, makeReq(reqOpts), res, () => {
    passed = true
  })
  return { passed, res }
}

describe('normalizePath', () => {
  it('strips /api, query, trailing slash, repeated slashes and case', () => {
    expect(normalizePath('/api/auth/login?x=1')).toBe('/auth/login')
    expect(normalizePath('//Auth//Login/')).toBe('/auth/login')
    expect(normalizePath('/auth/%6Cogin')).toBe('/auth/login')
    expect(normalizePath('/api')).toBe('/')
    expect(normalizePath('/%E0%A4%A')).toBe('/%e0%a4%a') // malformed escape does not throw
  })
})

describe('config parsing', () => {
  it('defaults to monitor and rejects unknown modes safely', () => {
    expect(parseMode(undefined)).toEqual({ mode: 'monitor', valid: true })
    expect(parseMode('ENFORCE')).toEqual({ mode: 'enforce', valid: true })
    expect(parseMode('block')).toEqual({ mode: 'monitor', valid: false })
  })

  it('reads per-rule overrides and ignores invalid ones', () => {
    const tiers = buildTiers((k) =>
      ({ RATE_LIMIT_AUTH_LOGIN_LIMIT: '25', RATE_LIMIT_USER_LIMIT: 'abc', RATE_LIMIT_MONEY_WINDOW_SEC: '120' })[k],
    )
    const byName = Object.fromEntries(tiers.map((t) => [t.name, t]))
    expect(byName['auth-login'].limit).toBe(25)
    expect(byName['user'].limit).toBe(300)
    expect(byName['money'].windowMs).toBe(120_000)
  })

  it('bounds proxy hops', () => {
    expect(parseTrustedProxyHops(undefined)).toBe(1)
    expect(parseTrustedProxyHops('2')).toBe(2)
    expect(parseTrustedProxyHops('-1')).toBe(1)
  })
})

describe('resolveClientIp', () => {
  it('ignores client-supplied leftmost x-forwarded-for entries', () => {
    const req = makeReq({ url: '/', xff: '6.6.6.6, 203.0.113.9', ip: '10.1.1.1' })
    expect(resolveClientIp(req, 1)).toBe('203.0.113.9')
    expect(resolveClientIp(req, 2)).toBe('6.6.6.6')
  })

  it('falls back to the socket when the chain is shorter than the trusted hops', () => {
    expect(resolveClientIp(makeReq({ url: '/', ip: '::ffff:127.0.0.1' }), 1)).toBe('127.0.0.1')
    expect(resolveClientIp(makeReq({ url: '/', xff: '1.1.1.1', ip: '10.1.1.1' }), 2)).toBe('10.1.1.1')
    expect(resolveClientIp(makeReq({ url: '/', xff: '1.1.1.1', ip: '10.1.1.1' }), 0)).toBe('10.1.1.1')
  })
})

describe('MemoryRateLimitStore', () => {
  it('counts within a window and resets after it', () => {
    let now = 1_000
    const store = new MemoryRateLimitStore(100, () => now)
    expect(store.hitSync('k', 1000)).toEqual({ count: 1, resetMs: 1000 })
    expect(store.hitSync('k', 1000).count).toBe(2)
    now += 1000
    expect(store.hitSync('k', 1000).count).toBe(1)
    store.close()
  })

  it('cannot grow past maxKeys', () => {
    const store = new MemoryRateLimitStore(3, () => 0)
    for (let i = 0; i < 10; i++) store.hitSync(`k${i}`, 60_000)
    expect(store.size()).toBeLessThanOrEqual(3)
    store.close()
  })
})

describe('RateLimitService', () => {
  const services: RateLimitService[] = []
  const make = (env: Record<string, string>) => {
    const svc = new RateLimitService(makeConfig(env))
    services.push(svc)
    return svc
  }
  afterAll(async () => {
    await Promise.all(services.map((s) => s.onModuleDestroy()))
  })

  it('enforce: blocks the 11th login attempt per IP with a 429 in the gateway error shape', async () => {
    const svc = make({ RATE_LIMIT_MODE: 'enforce' })
    for (let i = 0; i < 10; i++) {
      const { passed } = await send(svc, 'pre-auth', { method: 'POST', url: '/api/auth/login', ip: '1.2.3.4' })
      expect(passed).toBe(true)
    }
    const { passed, res } = await send(svc, 'pre-auth', { method: 'POST', url: '/auth/login', ip: '1.2.3.4' })
    expect(passed).toBe(false)
    expect(res.statusCode).toBe(429)
    expect(res.body).toMatchObject({ statusCode: 429, code: 'RATE_LIMITED', details: { retryAfterSeconds: expect.any(Number) } })
    expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0)

    // A different IP has its own bucket.
    expect((await send(svc, 'pre-auth', { method: 'POST', url: '/auth/login', ip: '5.6.7.8' })).passed).toBe(true)
  })

  it('monitor (default): over-limit requests are still served', async () => {
    const svc = make({})
    expect(svc.mode).toBe('monitor')
    for (let i = 0; i < 15; i++) {
      const { passed, res } = await send(svc, 'pre-auth', { method: 'POST', url: '/auth/login', ip: '1.2.3.4' })
      expect(passed).toBe(true)
      expect(res.statusCode).toBe(200)
    }
  })

  it('off: does nothing', async () => {
    const svc = make({ RATE_LIMIT_MODE: 'off', RATE_LIMIT_IP_LIMIT: '1' })
    for (let i = 0; i < 3; i++) expect((await send(svc, 'pre-auth', { url: '/v1/projects' })).passed).toBe(true)
  })

  it('never limits health checks or CORS preflights', async () => {
    const svc = make({ RATE_LIMIT_MODE: 'enforce', RATE_LIMIT_IP_LIMIT: '1' })
    for (let i = 0; i < 5; i++) {
      expect((await send(svc, 'pre-auth', { url: '/health' })).passed).toBe(true)
      expect((await send(svc, 'pre-auth', { method: 'OPTIONS', url: '/auth/login' })).passed).toBe(true)
    }
  })

  it('webhooks use their own bucket, not the general per-IP one', async () => {
    const svc = make({ RATE_LIMIT_MODE: 'enforce', RATE_LIMIT_IP_LIMIT: '1', RATE_LIMIT_WEBHOOK_LIMIT: '3' })
    const hook = { method: 'POST', url: '/api/v1/webhooks/stripe', ip: '9.9.9.9' }
    for (let i = 0; i < 3; i++) expect((await send(svc, 'pre-auth', hook)).passed).toBe(true)
    expect((await send(svc, 'pre-auth', hook)).passed).toBe(false)
    expect((await send(svc, 'pre-auth', { url: '/v1/projects', ip: '9.9.9.9' })).passed).toBe(true)
  })

  it('allowlisted IPs are never limited', async () => {
    const svc = make({ RATE_LIMIT_MODE: 'enforce', RATE_LIMIT_IP_LIMIT: '1', RATE_LIMIT_IP_ALLOWLIST: '4.4.4.4' })
    for (let i = 0; i < 3; i++) expect((await send(svc, 'pre-auth', { url: '/v1/projects', ip: '4.4.4.4' })).passed).toBe(true)
  })

  it('post-auth: counts signed-in users by user id, not by shared IP', async () => {
    const svc = make({ RATE_LIMIT_MODE: 'enforce', RATE_LIMIT_USER_LIMIT: '2' })
    const shared = '76.76.21.21'
    for (let i = 0; i < 2; i++) expect((await send(svc, 'post-auth', { url: '/v1/threads', ip: shared, userId: 'a' })).passed).toBe(true)
    expect((await send(svc, 'post-auth', { url: '/v1/threads', ip: shared, userId: 'a' })).passed).toBe(false)
    expect((await send(svc, 'post-auth', { url: '/v1/threads', ip: shared, userId: 'b' })).passed).toBe(true)
    // Anonymous requests are not re-counted post-auth (pre-auth IP rule covers them).
    for (let i = 0; i < 5; i++) expect((await send(svc, 'post-auth', { url: '/v1/projects', ip: shared })).passed).toBe(true)
  })

  it('money rule limits writes only', async () => {
    const svc = make({ RATE_LIMIT_MODE: 'enforce', RATE_LIMIT_MONEY_LIMIT: '2' })
    const post = { method: 'POST', url: '/api/v1/payouts/withdraw', userId: 'u1' }
    expect((await send(svc, 'post-auth', post)).passed).toBe(true)
    expect((await send(svc, 'post-auth', post)).passed).toBe(true)
    expect((await send(svc, 'post-auth', post)).passed).toBe(false)
    expect((await send(svc, 'post-auth', { url: '/v1/payouts/history', userId: 'u1' })).passed).toBe(true)
  })

  it('upload rule covers the gateway upload controllers', async () => {
    const svc = make({ RATE_LIMIT_MODE: 'enforce', RATE_LIMIT_UPLOAD_LIMIT: '1' })
    const up = { method: 'POST', url: '/api/user/me/avatar', userId: 'u2' }
    expect((await send(svc, 'post-auth', up)).passed).toBe(true)
    expect((await send(svc, 'post-auth', up)).passed).toBe(false)
  })

  it('2FA sends and verifies have separate buckets', async () => {
    const svc = make({ RATE_LIMIT_MODE: 'enforce' })
    const ip = '8.8.4.4'
    for (let i = 0; i < 5; i++) expect((await send(svc, 'pre-auth', { method: 'POST', url: '/auth/2fa/resend', ip })).passed).toBe(true)
    expect((await send(svc, 'pre-auth', { method: 'POST', url: '/auth/2fa/resend', ip })).passed).toBe(false)
    expect((await send(svc, 'pre-auth', { method: 'POST', url: '/auth/2fa/verify', ip })).passed).toBe(true)
  })
})
