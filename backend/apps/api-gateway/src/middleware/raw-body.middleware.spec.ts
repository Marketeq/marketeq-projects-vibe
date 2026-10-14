import * as express from 'express'
import { json, urlencoded } from 'express'
import * as request from 'supertest'
import { captureRawBody, isRawBodyPath } from './raw-body.middleware'

const DIDIT = '/v1/identity-verification/webhooks/didit-kyc'

// Same wiring order as main.ts: capture → json → urlencoded.
const buildApp = () => {
  const app = express()
  app.use((req, res, next) => (isRawBodyPath(req) ? captureRawBody(req, res, next) : json({ limit: '10mb' })(req, res, next)))
  app.use((req, res, next) => (isRawBodyPath(req) ? next() : urlencoded({ extended: true })(req, res, next)))
  app.all('*', (req, res) =>
    res.json({ raw: (req as any).rawBody ? (req as any).rawBody.toString('utf8') : null, body: req.body }),
  )
  return app
}

describe('raw-body middleware — Didit webhook byte preservation', () => {
  // Deliberately non-canonical: key order, odd whitespace, unicode escapes.
  const payload = '{"z":1,  "a":"caf\\u00e9",\n "session_id":"s-1"}'

  it('preserves the exact bytes on the Didit webhook path', async () => {
    const res = await request(buildApp()).post(DIDIT).set('content-type', 'application/json').send(payload)
    expect(res.body.raw).toBe(payload)
  })

  it('does not run json() on the Didit path (body untouched)', async () => {
    const res = await request(buildApp()).post(DIDIT).set('content-type', 'application/json').send(payload)
    expect(res.body).not.toHaveProperty('body')
  })

  it('preserves bytes with the /api prefix and a query string', async () => {
    const res = await request(buildApp()).post(`/api${DIDIT}?x=1`).set('content-type', 'application/json').send(payload)
    expect(res.body.raw).toBe(payload)
  })

  it('preserves bytes for a form-encoded post (urlencoded must not drain it)', async () => {
    const form = 'a=1&b=%C3%A9'
    const res = await request(buildApp()).post(DIDIT).set('content-type', 'application/x-www-form-urlencoded').send(form)
    expect(res.body.raw).toBe(form)
  })

  it('still preserves bytes for /v1/webhooks/* (Stripe/Ramp)', async () => {
    const res = await request(buildApp()).post('/v1/webhooks/stripe').set('content-type', 'application/json').send(payload)
    expect(res.body.raw).toBe(payload)
  })

  it.each([
    ['GET', DIDIT],
    ['PUT', DIDIT],
    ['POST', `${DIDIT}/`],
    ['POST', `${DIDIT}/extra`],
    ['POST', '/v1/identity-verification/webhooks/other'],
    ['POST', '/v1/identity-verification/sessions'],
  ])('does not capture raw body for %s %s', async (method, path) => {
    const res = await (request(buildApp()) as any)[method.toLowerCase()](path)
      .set('content-type', 'application/json')
      .send('{"a":1}')
    expect(res.body.raw).toBeNull()
  })

  it('still json-parses ordinary routes', async () => {
    const res = await request(buildApp()).post('/v1/users').set('content-type', 'application/json').send('{"a":1}')
    expect(res.body).toEqual({ raw: null, body: { a: 1 } })
  })
})
