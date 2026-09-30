import type { Request, Response } from 'express'
import { ForbiddenException } from '@nestjs/common'
import { CsrfOriginMiddleware } from './csrf-origin.middleware'

const cfg = (env: Record<string, string>) => ({ get: (k: string) => env[k] }) as any

const ALLOWED = 'https://live-marketeq-projects.vercel.app'
const PROD_ENV = { FRONTEND_URL: `${ALLOWED},http://localhost:3000` }

function makeReq(opts: {
  method?: string
  url?: string
  origin?: string
  cookie?: string
  authorization?: string
  secFetchSite?: string
}): Request {
  const headers: Record<string, string> = {}
  if (opts.origin) headers.origin = opts.origin
  if (opts.cookie) headers.cookie = opts.cookie
  if (opts.authorization) headers.authorization = opts.authorization
  if (opts.secFetchSite) headers['sec-fetch-site'] = opts.secFetchSite
  return {
    method: opts.method ?? 'POST',
    originalUrl: opts.url ?? '/v1/payouts/initiate',
    headers,
  } as unknown as Request
}

function run(mw: CsrfOriginMiddleware, req: Request) {
  let passed = false
  let error: unknown
  try {
    mw.use(req, {} as Response, () => {
      passed = true
    })
  } catch (e) {
    error = e
  }
  return { passed, error }
}

const AUTH_COOKIE = 'access_token=abc123; theme=dark'

describe('CsrfOriginMiddleware', () => {
  const prevEnv = process.env.NODE_ENV
  afterEach(() => {
    process.env.NODE_ENV = prevEnv
  })

  describe('unchanged behaviour', () => {
    it('lets safe methods through, whatever the origin', () => {
      const mw = new CsrfOriginMiddleware(cfg(PROD_ENV))
      for (const method of ['GET', 'HEAD', 'OPTIONS']) {
        expect(run(mw, makeReq({ method, origin: 'https://evil.example' })).passed).toBe(true)
      }
    })

    it('allows a write from an allow-listed origin', () => {
      const mw = new CsrfOriginMiddleware(cfg(PROD_ENV))
      expect(run(mw, makeReq({ origin: ALLOWED, cookie: AUTH_COOKIE })).passed).toBe(true)
    })

    it('rejects a write from an unknown origin, in either mode', () => {
      for (const mode of ['monitor', 'enforce']) {
        const mw = new CsrfOriginMiddleware(cfg({ ...PROD_ENV, CSRF_STRICT_MODE: mode }))
        const { passed, error } = run(mw, makeReq({ origin: 'https://evil.example', cookie: AUTH_COOKIE }))
        expect(passed).toBe(false)
        expect(error).toBeInstanceOf(ForbiddenException)
        expect((error as ForbiddenException).getResponse()).toMatchObject({ code: 'CSRF_ORIGIN_BLOCKED' })
      }
    })
  })

  describe('missing Origin header', () => {
    it('enforce: rejects a cookie-authenticated write with no Origin', () => {
      const mw = new CsrfOriginMiddleware(cfg({ ...PROD_ENV, CSRF_STRICT_MODE: 'enforce' }))
      const { passed, error } = run(mw, makeReq({ cookie: AUTH_COOKIE }))
      expect(passed).toBe(false)
      expect((error as ForbiddenException).getResponse()).toMatchObject({ code: 'CSRF_ORIGIN_BLOCKED' })
    })

    it('monitor (default): logs but allows the same request', () => {
      const mw = new CsrfOriginMiddleware(cfg(PROD_ENV))
      expect(run(mw, makeReq({ cookie: AUTH_COOKIE })).passed).toBe(true)
    })

    it('allows a bearer-authenticated write (desktop app) — cannot be forged', () => {
      const mw = new CsrfOriginMiddleware(cfg({ ...PROD_ENV, CSRF_STRICT_MODE: 'enforce' }))
      expect(run(mw, makeReq({ authorization: 'Bearer token.value.here' })).passed).toBe(true)
    })

    it('allows a write with no auth cookie (webhooks, server-to-server)', () => {
      const mw = new CsrfOriginMiddleware(cfg({ ...PROD_ENV, CSRF_STRICT_MODE: 'enforce' }))
      expect(run(mw, makeReq({ url: '/v1/webhooks/stripe' })).passed).toBe(true)
      expect(run(mw, makeReq({ cookie: 'theme=dark; locale=en' })).passed).toBe(true)
    })

    it('trusts Sec-Fetch-Site when it rules out a cross-site request', () => {
      const mw = new CsrfOriginMiddleware(cfg({ ...PROD_ENV, CSRF_STRICT_MODE: 'enforce' }))
      for (const site of ['same-origin', 'same-site', 'none']) {
        expect(run(mw, makeReq({ cookie: AUTH_COOKIE, secFetchSite: site })).passed).toBe(true)
      }
      expect(run(mw, makeReq({ cookie: AUTH_COOKIE, secFetchSite: 'cross-site' })).passed).toBe(false)
    })

    it('recognises every auth cookie name, not just access_token', () => {
      const mw = new CsrfOriginMiddleware(cfg({ ...PROD_ENV, CSRF_STRICT_MODE: 'enforce' }))
      for (const c of ['refresh_token=x', 'session_id=x', 'accessToken=x', 'theme=a; access_token=x']) {
        expect(run(mw, makeReq({ cookie: c })).passed).toBe(false)
      }
      // a cookie that merely ends in the same text must not count
      expect(run(mw, makeReq({ cookie: 'my_access_token=x' })).passed).toBe(true)
    })
  })

  describe('localhost in the production allow-list', () => {
    it('is not trusted in production', () => {
      process.env.NODE_ENV = 'production'
      const mw = new CsrfOriginMiddleware(cfg(PROD_ENV))
      expect(run(mw, makeReq({ origin: 'http://localhost:3000', cookie: AUTH_COOKIE })).passed).toBe(false)
      expect(run(mw, makeReq({ origin: ALLOWED, cookie: AUTH_COOKIE })).passed).toBe(true)
    })

    it('is still trusted outside production', () => {
      process.env.NODE_ENV = 'development'
      const mw = new CsrfOriginMiddleware(cfg({ FRONTEND_URL: ALLOWED }))
      expect(run(mw, makeReq({ origin: 'http://localhost:3000', cookie: AUTH_COOKIE })).passed).toBe(true)
    })

    it('can be restored in production with the explicit escape hatch', () => {
      process.env.NODE_ENV = 'production'
      const mw = new CsrfOriginMiddleware(cfg({ ...PROD_ENV, ALLOW_LOCALHOST_ORIGIN: 'true' }))
      expect(run(mw, makeReq({ origin: 'http://localhost:3000', cookie: AUTH_COOKIE })).passed).toBe(true)
    })

    it('honours CSRF_ALLOWED_ORIGINS alongside FRONTEND_URL', () => {
      const mw = new CsrfOriginMiddleware(
        cfg({ FRONTEND_URL: ALLOWED, CSRF_ALLOWED_ORIGINS: 'https://admin.marketeq.com/' }),
      )
      expect(run(mw, makeReq({ origin: 'https://admin.marketeq.com', cookie: AUTH_COOKIE })).passed).toBe(true)
    })
  })
})
