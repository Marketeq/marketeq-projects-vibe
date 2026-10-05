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
