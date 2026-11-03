import { ConfigService } from '@nestjs/config'
import { of } from 'rxjs'
import { Readable } from 'stream'
import { ProxyService } from './proxy.service'

describe('ProxyService — Didit webhook header forwarding', () => {
  const makeService = () => {
    const request = jest.fn().mockReturnValue(
      of({ status: 200, headers: {}, data: Readable.from(['ok']) }),
    )
    const service = new ProxyService({ request } as any, new ConfigService({}))
    return { service, request }
  }
  const res = () => ({ status: jest.fn(), setHeader: jest.fn(), on: jest.fn(), once: jest.fn(), emit: jest.fn(), write: jest.fn(), end: jest.fn() }) as any
  const path = '/v1/identity-verification/webhooks/didit-kyc'

  const forward = async (headers: Record<string, string>) => {
    const { service, request } = makeService()
    const req = { method: 'POST', headers, body: {}, rawBody: Buffer.from('{"a":1}'), ip: '1.2.3.4' } as any
    await service.forward('identityVerification', path, req, res())
    return request.mock.calls[0][0]
  }

  it('forwards X-Signature-V2 and X-Timestamp unchanged to identity-verification-service', async () => {
    const sig = 'AbC123==/+deadBEEF'
    const ts = '1790000000'
    const cfg = await forward({ 'content-type': 'application/json', 'x-signature-v2': sig, 'x-timestamp': ts })
    expect(cfg.url).toBe(`http://localhost:3019${path}`)
    expect(cfg.headers['x-signature-v2']).toBe(sig)
    expect(cfg.headers['x-timestamp']).toBe(ts)
  })

  it('does not fabricate headers that were not sent', async () => {
    const cfg = await forward({ 'content-type': 'application/json' })
    expect(cfg.headers).not.toHaveProperty('x-signature-v2')
    expect(cfg.headers).not.toHaveProperty('x-timestamp')
  })

  it('does not fabricate the one that is missing', async () => {
    const cfg = await forward({ 'x-signature-v2': 'sig' })
    expect(cfg.headers['x-signature-v2']).toBe('sig')
    expect(cfg.headers).not.toHaveProperty('x-timestamp')
  })

  it('still forwards existing webhook signature headers', async () => {
    const cfg = await forward({ 'stripe-signature': 's', 'x-ramp-signature': 'r' })
    expect(cfg.headers['stripe-signature']).toBe('s')
    expect(cfg.headers['x-ramp-signature']).toBe('r')
  })
})

describe('ProxyService — client IP forwarding (D6)', () => {
  const originalNodeEnv = process.env.NODE_ENV
  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
  })

  const forward = async (headers: Record<string, any>, extra: Record<string, any> = {}) => {
    const request = jest.fn().mockReturnValue(of({ status: 200, headers: {}, data: Readable.from(['ok']) }))
    const service = new ProxyService({ request } as any, new ConfigService({}))
    const res = { status: jest.fn(), setHeader: jest.fn(), on: jest.fn(), once: jest.fn(), emit: jest.fn(), write: jest.fn(), end: jest.fn() } as any
    const req = { method: 'GET', headers: { 'content-type': 'application/json', ...headers }, body: {}, ip: '10.1.1.1', socket: { remoteAddress: '10.1.1.1' }, ...extra } as any
    await service.forward('identityVerification', '/v1/identity-verification/connection-check', req, res)
    return request.mock.calls[0][0].headers as Record<string, string>
  }

  it('forwards exactly one canonical client IP, overwriting (not appending to) both headers', async () => {
    process.env.NODE_ENV = 'production'
    const headers = await forward({
      'cf-connecting-ip': '::ffff:185.59.221.75',
      'x-forwarded-for': '8.8.8.8, 1.1.1.1',
      'x-real-ip': '8.8.8.8',
    })
    expect(headers['cf-connecting-ip']).toBe('185.59.221.75')
    expect(headers['x-forwarded-for']).toBe('185.59.221.75')
    expect(headers).not.toHaveProperty('x-real-ip')
    expect(headers['x-forwarded-for']).not.toContain(',')
  })

  it('discards multiple supplied x-forwarded-for values and never relays the load balancer socket', async () => {
    process.env.NODE_ENV = 'production'
    const headers = await forward({ 'cf-connecting-ip': '8.8.8.8', 'x-forwarded-for': ['1.1.1.1', '2.2.2.2'] })
    expect(headers['x-forwarded-for']).toBe('8.8.8.8')
    expect(JSON.stringify(headers)).not.toContain('10.1.1.1')
  })

  it.each([
    ['missing (spoofed x-forwarded-for only)', { 'x-forwarded-for': '8.8.8.8' }],
    ['malformed', { 'cf-connecting-ip': 'junk', 'x-forwarded-for': '8.8.8.8' }],
    ['a list', { 'cf-connecting-ip': '8.8.8.8, 1.1.1.1' }],
    ['repeated', { 'cf-connecting-ip': ['8.8.8.8', '1.1.1.1'] }],
  ])('production with a CF-Connecting-IP that is %s forwards no client IP at all', async (_n, hdrs) => {
    process.env.NODE_ENV = 'production'
    const headers = await forward(hdrs)
    expect(headers).not.toHaveProperty('cf-connecting-ip')
    expect(headers).not.toHaveProperty('x-forwarded-for')
  })

  it('local development without the header forwards the direct socket IP, and ignores a spoofed x-forwarded-for', async () => {
    process.env.NODE_ENV = 'development'
    const headers = await forward({ 'x-forwarded-for': '8.8.8.8' }, { socket: { remoteAddress: '::ffff:127.0.0.1' } })
    expect(headers['cf-connecting-ip']).toBe('127.0.0.1')
    expect(headers['x-forwarded-for']).toBe('127.0.0.1')
  })

  it('leaves auth forwarding untouched (bearer from cookie, cookie, user headers)', async () => {
    process.env.NODE_ENV = 'production'
    const headers = await forward(
      { 'cf-connecting-ip': '8.8.8.8', cookie: 'access_token=t; refresh_token=r' },
      { cookies: { access_token: 't' } },
    )
    expect(headers['authorization']).toBe('Bearer t')
    expect(headers['cookie']).toBe('access_token=t; refresh_token=r')
  })
})
