import 'reflect-metadata'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Observable, of, throwError, NEVER } from 'rxjs'
import * as request from 'supertest'
import { HireRequestsController } from './hire-requests.controller'
import { HireRequestsService } from './hire-requests.service'
import { HireRequestGate } from './hire-request-gate'
import { HireRequests } from './hire-requests.entity'
import { HireStatus } from './enums/hire-status.enums'
import { User } from '../user/entities/user.entity'
import { UserRole } from '../user/enums/user-role.enum'
import {
  IDENTITY_VERIFICATION_CLIENT,
  IdentityVerificationGateClient,
} from '../identity-gate/identity-verification-gate.client'
// Cross-check only (test code): the offer path's own filter and exceptions, so
// "same status, code and structure" is asserted against the real thing.
import { OfferExceptionFilter } from '../../../offer-service/src/filters/offer-exception.filter'
import {
  IdentityVerificationUnavailableException,
  TalentNotHireableException,
  VerificationRequiredException,
} from '../../../offer-service/src/common/exceptions/offer.exceptions'

// G4 (Christopher): /hire-requests is gated on the TALENT's verification gate,
// like offers and counter-offers. Real controller + real service + real gate +
// real gate client over a stubbed RabbitMQ transport; repositories in memory.

const CLIENT = '11111111-1111-4111-8111-111111111111'
const TALENT = '22222222-2222-4222-8222-222222222222'
const OTHER = '33333333-3333-4333-8333-333333333333'
const HR_ID = '44444444-4444-4444-8444-444444444444'

const OPEN = { gateOpen: true, missingRequirements: 'none' } // verified
const GRACE = { gateOpen: true, missingRequirements: 'none' } // inside the 30-day grace window: identity reports it open
const CLOSED = (m: string) => ({ gateOpen: false, missingRequirements: m })

const body = { talentUserId: TALENT, budgetUsd: 500, message: 'hi' }

describe('G4 - /hire-requests talent gate (user-service)', () => {
  let app: INestApplication
  let transport: jest.Mock
  let brokerUrl: string | undefined
  let users: Record<string, any>
  let stored: any[]
  let saves: any[]
  let creates: any[]

  const build = async (impl?: (pattern: string, record: any) => Observable<unknown>) => {
    transport = jest.fn(impl ?? ((_p, _r) => of(OPEN)))
    brokerUrl = 'amqp://test'
    users = {
      [CLIENT]: { id: CLIENT, role: UserRole.CLIENT },
      [TALENT]: { id: TALENT, role: UserRole.TALENT },
      [OTHER]: { id: OTHER, role: UserRole.CLIENT },
    }
    stored = [{ id: HR_ID, clientUserId: CLIENT, talentUserId: TALENT, status: HireStatus.PENDING, budgetUsd: 500, createdAt: new Date() }]
    saves = []
    creates = []
    const hireRepo = {
      create: jest.fn((d: any) => (creates.push(d), { ...d })),
      save: jest.fn(async (e: any) => (saves.push({ ...e }), { id: e.id ?? 'new-id', ...e })),
      findOne: jest.fn(async ({ where }: any) => stored.find((r) => r.id === where.id) ?? null),
      find: jest.fn(async () => stored),
    }
    const userRepo = { findOne: jest.fn(async ({ where }: any) => users[where.id] ?? null) }

    const moduleRef = await Test.createTestingModule({
      controllers: [HireRequestsController],
      providers: [
        HireRequestsService,
        HireRequestGate,
        IdentityVerificationGateClient,
        { provide: IDENTITY_VERIFICATION_CLIENT, useValue: { send: transport } },
        { provide: getRepositoryToken(HireRequests), useValue: hireRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: ConfigService, useValue: { get: (k: string) => (k === 'RABBITMQ_URL' ? brokerUrl : undefined) } },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    app.use((req: any, _res: any, next: any) => {
      const id = req.headers['x-test-user']
      if (id) req.user = { sub: id }
      next()
    })
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()
  }

  const post = (as = CLIENT, payload: any = body) => request(app.getHttpServer()).post('/hire-requests').set('x-test-user', as).send(payload)
  const put = (as = CLIENT, payload: any = { message: 'edited' }) =>
    request(app.getHttpServer()).put(`/hire-requests/${HR_ID}`).set('x-test-user', as).send(payload)
  const status = (as: string, s: HireStatus) =>
    request(app.getHttpServer()).put(`/hire-requests/${HR_ID}/status`).set('x-test-user', as).send({ status: s })
  const askedAbout = () => transport.mock.calls.map((c) => c[1].data.userId)

  afterEach(() => app.close())

  describe('create', () => {
    beforeEach(() => build())

    it('verified talent: the hire request is created', async () => {
      const res = await post()
      expect(res.status).toBe(201)
      expect(saves).toHaveLength(1)
      expect(transport).toHaveBeenCalledTimes(1)
      expect(transport.mock.calls[0][0]).toBe('identity_verification.gate_check') // the same RPC the offer path uses
    })

    it('talent inside the grace period (gate open): the hire request is created', async () => {
      await app.close()
      await build(() => of(GRACE))
      expect((await post()).status).toBe(201)
      expect(saves).toHaveLength(1)
    })

    it.each(['identity', 'location', 'both'])('unverified or expired talent (%s missing): 403 TALENT_NOT_HIREABLE, nothing created', async (missing) => {
      await app.close()
      await build(() => of(CLOSED(missing)))
      const res = await post()
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('TALENT_NOT_HIREABLE')
      expect(res.body.message).toBe('This freelancer isn’t available to hire right now')
      expect(res.body.statusCode).toBe(403)
      expect(Object.keys(res.body).sort()).toEqual(['error', 'message', 'path', 'requestId', 'statusCode', 'timestamp'])
      // The client learns nothing about verification.
      expect(JSON.stringify(res.body)).not.toMatch(/missingRequirements|identity|location|verif|expired|grace|travel/i)
      expect(creates).toHaveLength(0)
      expect(saves).toHaveLength(0)
    })

    it('rejection produces no side effects at all: no create, no save, and the gate was asked exactly once', async () => {
      await app.close()
      await build(() => of(CLOSED('both')))
      await post()
      expect(creates).toHaveLength(0)
      expect(saves).toHaveLength(0)
      expect(transport).toHaveBeenCalledTimes(1)
    })

    it('only the TALENT is evaluated - the sender/client\'s verification is never looked at', async () => {
      await post()
      expect(askedAbout()).toEqual([TALENT])
      expect(askedAbout()).not.toContain(CLIENT)
    })

    it('an unverified client can still hire a verified talent (the client has no effect)', async () => {
      // identity would say "closed" for the client if it were ever asked; it must not be.
      await app.close()
      await build((_p, r) => of(r.data.userId === CLIENT ? CLOSED('both') : OPEN))
      expect((await post()).status).toBe(201)
      expect(askedAbout()).toEqual([TALENT])
    })

    it('a verification result supplied in the request body is ignored', async () => {
      await app.close()
      await build(() => of(CLOSED('both')))
      const res = await post(CLIENT, { ...body, gateOpen: true, verified: true, missingRequirements: 'none' })
      expect(res.status).toBe(403)
      expect(askedAbout()).toEqual([TALENT])
    })

    it('the client id comes from the authenticated caller, never the body', async () => {
      await post(CLIENT, { ...body, clientUserId: OTHER })
      expect(creates[0].clientUserId).toBe(CLIENT)
    })
  })

  describe('gate lookup failure follows the offer path (503 IDENTITY_VERIFICATION_UNAVAILABLE, nothing done)', () => {
    const failures: Array<[string, () => Observable<unknown>]> = [
      ['no consumer / RPC error', () => throwError(() => new Error('no consumer'))],
      ['timeout', () => NEVER],
      ['unusable reply', () => of({ nope: true })],
      ['self-contradicting reply', () => of({ gateOpen: true, missingRequirements: 'identity' })],
    ]
    it.each(failures.filter(([n]) => n !== 'timeout'))('%s -> 503, no side effects', async (_name, impl) => {
      await build(impl)
      const res = await post()
      expect(res.status).toBe(503)
      expect(res.body.error).toBe('IDENTITY_VERIFICATION_UNAVAILABLE')
      expect(res.body.message).toBe("We couldn't complete this action right now. Please try again shortly.")
      expect(Object.keys(res.body).sort()).toEqual(['error', 'message', 'path', 'requestId', 'statusCode', 'timestamp'])
      expect(creates).toHaveLength(0)
      expect(saves).toHaveLength(0)
    })

    it('an identity-verification-service that never answers times out (3 s) -> 503, no side effects', async () => {
      await build(() => NEVER)
      const res = await post()
      expect(res.status).toBe(503)
      expect(res.body.error).toBe('IDENTITY_VERIFICATION_UNAVAILABLE')
      expect(creates).toHaveLength(0)
      expect(saves).toHaveLength(0)
    }, 15000)

    it('missing broker configuration -> 503, no side effects', async () => {
      await build()
      brokerUrl = undefined
      const res = await post()
      expect(res.status).toBe(503)
      expect(res.body.error).toBe('IDENTITY_VERIFICATION_UNAVAILABLE')
      expect(saves).toHaveLength(0)
      expect(transport).not.toHaveBeenCalled()
    })
  })

  describe('same status, code and structure as the offer path', () => {
    // Renders an offer-service exception through offer-service's own filter.
    const offerBody = (exception: unknown) => {
      let out: any
      const res: any = { status: () => ({ json: (b: any) => (out = b) }) }
      const host: any = { switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({ headers: { 'x-request-id': 'rid' }, url: '/x' }) }) }
      new OfferExceptionFilter().catch(exception, host)
      return out
    }
    const normalise = (b: any) => ({ ...b, timestamp: 'T', path: 'P', requestId: 'R' })

    it('client refused: identical to TalentNotHireableException', async () => {
      await build(() => of(CLOSED('identity')))
      const res = await post()
      expect(normalise(res.body)).toEqual(normalise(offerBody(new TalentNotHireableException())))
    })

    it.each(['identity', 'location', 'both'] as const)('talent refused (%s missing): identical to VerificationRequiredException', async (missing) => {
      await build(() => of(CLOSED(missing)))
      const res = await status(TALENT, HireStatus.ACCEPTED)
      expect(res.status).toBe(403)
      expect(normalise(res.body)).toEqual(normalise(offerBody(new VerificationRequiredException(missing))))
      expect(res.body.missingRequirements).toBe(missing)
    })

    it('unavailable gate: identical to IdentityVerificationUnavailableException', async () => {
      await build(() => throwError(() => new Error('down')))
      const res = await post()
      expect(res.status).toBe(503)
      expect(normalise(res.body)).toEqual(normalise(offerBody(new IdentityVerificationUnavailableException())))
    })
  })

  describe('existing authentication, authorization and validation behaviour is unchanged', () => {
    it('an invalid body is still a 400 and the gate is never consulted', async () => {
      await build(() => of(CLOSED('both')))
      const res = await post(CLIENT, { talentUserId: 'not-a-uuid', budgetUsd: -1 })
      expect(res.status).toBe(400)
      expect(transport).not.toHaveBeenCalled()
    })

    it('an unknown talent is still a 404 and the gate is never consulted', async () => {
      await build(() => of(CLOSED('both')))
      const res = await post(CLIENT, { ...body, talentUserId: '55555555-5555-4555-8555-555555555555' })
      expect(res.status).toBe(404)
      expect(transport).not.toHaveBeenCalled()
    })

    it('a target who is not a talent is still a 400 and the gate is never consulted', async () => {
      await build(() => of(CLOSED('both')))
      const res = await post(CLIENT, { ...body, talentUserId: OTHER })
      expect(res.status).toBe(400)
      expect(transport).not.toHaveBeenCalled()
    })

    it('a non-client caller is still refused by the existing role check, before any gate lookup', async () => {
      await build(() => of(CLOSED('both')))
      const res = await post(TALENT, body) // the caller is a talent, so clientUser.role !== CLIENT
      expect(res.status).toBe(400)
      expect(transport).not.toHaveBeenCalled()
    })

    it('reads are not gated: a participant lists and opens requests with a closed gate', async () => {
      await build(() => of(CLOSED('both')))
      expect((await request(app.getHttpServer()).get('/hire-requests').set('x-test-user', CLIENT)).status).toBe(200)
      expect((await request(app.getHttpServer()).get(`/hire-requests/${HR_ID}`).set('x-test-user', TALENT)).status).toBe(200)
      expect(transport).not.toHaveBeenCalled()
    })
  })

  describe('edit (PUT /hire-requests/:id) - a client action on the stored talent', () => {
    it('open gate: edit succeeds', async () => {
      await build()
      expect((await put()).status).toBe(200)
      expect(saves).toHaveLength(1)
      expect(askedAbout()).toEqual([TALENT]) // the stored talent, not anything from the body
    })

    it('closed gate: 403 TALENT_NOT_HIREABLE and the request is left unchanged', async () => {
      await build(() => of(CLOSED('both')))
      const res = await put(CLIENT, { message: 'edited', talentUserId: OTHER })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('TALENT_NOT_HIREABLE')
      expect(saves).toHaveLength(0)
      expect(askedAbout()).toEqual([TALENT])
    })

    it('a non-owner is still refused by the existing check before any gate lookup', async () => {
      await build(() => of(CLOSED('both')))
      const res = await put(OTHER)
      expect(res.status).toBe(403)
      expect(res.body.message).toBe('Only the requesting client may edit this hire request')
      expect(transport).not.toHaveBeenCalled()
    })
  })

  describe('status change (PUT /hire-requests/:id/status)', () => {
    it('ACCEPTED with an open gate succeeds', async () => {
      await build()
      const res = await status(TALENT, HireStatus.ACCEPTED)
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ACCEPTED')
    })

    it('ACCEPTED by the talent with a closed gate: VERIFICATION_REQUIRED naming their own requirement, nothing changed', async () => {
      await build(() => of(CLOSED('location')))
      const res = await status(TALENT, HireStatus.ACCEPTED)
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('VERIFICATION_REQUIRED')
      expect(res.body.missingRequirements).toBe('location')
      expect(saves).toHaveLength(0)
    })

    it('ACCEPTED by the client with a closed gate: TALENT_NOT_HIREABLE, nothing changed', async () => {
      await build(() => of(CLOSED('both')))
      const res = await status(CLIENT, HireStatus.ACCEPTED)
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('TALENT_NOT_HIREABLE')
      expect(saves).toHaveLength(0)
    })

    it('DECLINED stays open to both parties even when the gate is closed, with no gate lookup', async () => {
      await build(() => of(CLOSED('both')))
      expect((await status(TALENT, HireStatus.DECLINED)).status).toBe(200)
      expect((await status(CLIENT, HireStatus.DECLINED)).status).toBe(200)
      expect(transport).not.toHaveBeenCalled()
    })

    it('a non-participant is still refused by the existing check before any gate lookup', async () => {
      await build(() => of(CLOSED('both')))
      const res = await status(OTHER, HireStatus.ACCEPTED)
      expect(res.status).toBe(403)
      expect(res.body.message).toBe('You are not a participant in this hire request')
      expect(transport).not.toHaveBeenCalled()
    })

    it('the gate failing to answer leaves the status untouched (503)', async () => {
      await build(() => throwError(() => new Error('down')))
      const res = await status(TALENT, HireStatus.ACCEPTED)
      expect(res.status).toBe(503)
      expect(saves).toHaveLength(0)
    })
  })
})
