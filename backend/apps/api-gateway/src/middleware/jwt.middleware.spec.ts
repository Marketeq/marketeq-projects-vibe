import { UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { JwtMiddleware } from './jwt.middleware'

const DIDIT_WEBHOOK = '/v1/identity-verification/webhooks/didit-kyc'

describe('JwtMiddleware — Didit Free KYC webhook allowlist', () => {
  const jwt = { verify: jest.fn() } as unknown as JwtService
  const middleware = new JwtMiddleware(jwt)

  const run = (method: string, originalUrl: string, headers: Record<string, string> = {}) => {
    const next = jest.fn()
    const call = () => middleware.use({ method, originalUrl, headers, cookies: {} } as any, {} as any, next)
    return { next, call }
  }

  beforeEach(() => (jwt.verify as jest.Mock).mockReset())

  it('lets the exact webhook POST through without a JWT', () => {
    const { next, call } = run('POST', DIDIT_WEBHOOK)
    call()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('lets the webhook POST through with the /api prefix and a query string', () => {
    const { next, call } = run('POST', `/api${DIDIT_WEBHOOK}?x=1`)
    call()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('lets the webhook POST through even when an invalid token is sent', () => {
    ;(jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('bad')
    })
    const { next, call } = run('POST', DIDIT_WEBHOOK, { authorization: 'Bearer junk' })
    call()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it.each(['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])('returns 401 for %s on the webhook path', (method) => {
    const { next, call } = run(method, DIDIT_WEBHOOK)
    expect(call).toThrow(UnauthorizedException)
    expect(next).not.toHaveBeenCalled()
  })

  it.each([
    `${DIDIT_WEBHOOK}/`,
    `${DIDIT_WEBHOOK}/extra`,
    `${DIDIT_WEBHOOK}2`,
    `${DIDIT_WEBHOOK.toUpperCase()}`,
    '/v1/identity-verification/webhooks/didit',
    '/v1/identity-verification/webhooks/didit-biometric-session',
    '/v1/identity-verification/webhooks',
    '/v1/identity-verification/free-kyc/session',
    '/v1/identity-verification/webhooks/../status',
    '/x/v1/identity-verification/webhooks/didit-kyc',
  ])('returns 401 for POST on nearby path %s', (path) => {
    const { next, call } = run('POST', path)
    expect(call).toThrow(UnauthorizedException)
    expect(next).not.toHaveBeenCalled()
  })

  it('still requires a valid JWT for other identity-verification routes', () => {
    ;(jwt.verify as jest.Mock).mockReturnValue({ sub: 'u1', email: 'a@b.c' })
    const { next, call } = run('POST', '/v1/identity-verification/free-kyc/session', { authorization: 'Bearer ok' })
    call()
    expect(next).toHaveBeenCalledTimes(1)
  })

  describe('existing public routes behave as before', () => {
    it.each([
      ['GET', '/health'],
      ['POST', '/auth/login'],
      ['GET', '/v1/projects/abc'],
      ['POST', '/v1/webhooks/stripe'],
      ['POST', '/v1/webhooks/ramp'],
      ['GET', '/v1/invitations/preview'],
    ])('%s %s is public', (method, path) => {
      const { next, call } = run(method, path)
      call()
      expect(next).toHaveBeenCalledTimes(1)
    })

    it.each([
      ['GET', '/v1/webhooks/didit-kyc'],
      ['GET', '/v1/billing'],
      ['POST', '/v1/webhooks/other'],
    ])('%s %s stays protected', (method, path) => {
      const { call } = run(method, path)
      expect(call).toThrow(UnauthorizedException)
    })
  })
})
