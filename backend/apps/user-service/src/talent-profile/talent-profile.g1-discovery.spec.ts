import { InternalServerErrorException } from '@nestjs/common'
import 'reflect-metadata'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Observable, of, throwError, NEVER } from 'rxjs'
import * as request from 'supertest'
import { TalentProfileController } from './talent-profile.controller'
import { TalentProfileRecommendationService } from './talent-profile-recommendation.service'
import { TalentProfile } from './entities/talent-profile.entity'
import {
  IDENTITY_VERIFICATION_CLIENT,
  IdentityVerificationGateClient,
} from '../identity-gate/identity-verification-gate.client'
import { TalentDiscoveryGateService } from '../identity-gate/talent-discovery-gate.service'

// G1: GET /public/talent (paginated browse list) and POST
// /public/talent/recommendations leave out talent whose gate is closed. Real
// controllers + real recommendation service + real gate over a stubbed
// RabbitMQ transport; the repository is in-memory.

const OPEN = { gateOpen: true, missingRequirements: 'none' }
const CLOSED = (m = 'both') => ({ gateOpen: false, missingRequirements: m })

const acct = (n: number) => `acct-${n}`
const mk = (n: number, source: string | null = acct(n)): any => ({
  id: `profile-${n}`,
  sourceId: source,
  username: `user${n}`,
  name: `Person ${n}`,
  avatarUrl: `https://img.example/${n}.png`,
  jobTitles: [{ headline: 'Engineer', rate: 50 }],
  availability: '40',
  location: 'Austin',
  country: 'United States',
  timezone: 'UTC',
  rate: 50,
  overview: { text: `overview ${n}` },
  skills: ['ts'],
  rating: 4.5,
  reviewsCount: 3,
  totalProjectsCompleted: 2,
  status: 'active',
  updatedAt: new Date(2026, 0, 100 - n),
})
// Ordered newest first.
const PROFILES = [mk(1), mk(2), mk(3), mk(4), mk(5), mk(6), mk(7), mk(8), mk(9), mk(10), mk(11), mk(12, null)]
const IDENTITY: Record<string, any> = {
  [acct(1)]: OPEN, // verified
  [acct(2)]: CLOSED('both'), // unverified
  [acct(3)]: OPEN, // grace
  [acct(4)]: CLOSED('identity'), // lapsed
  // acct(5): no identity profile
  [acct(6)]: OPEN,
  [acct(7)]: OPEN,
  [acct(8)]: CLOSED('location'),
  [acct(9)]: OPEN,
  [acct(10)]: OPEN,
  [acct(11)]: OPEN,
  // profile-12 has no sourceId: no account to verify
}
const VISIBLE = [1, 3, 6, 7, 9, 10, 11].map((n) => `profile-${n}`)
const HIDDEN = [2, 4, 5, 8, 12]
const hiddenProfiles = () => PROFILES.filter((p) => HIDDEN.some((n) => p.id === `profile-${n}`))

describe('G1 - /public/talent (user-service)', () => {
  let app: INestApplication
  let transport: jest.Mock
  let httpPost: jest.Mock
  let brokerUrl: string | undefined
  let groq: string | undefined
  let profiles: any[]
  let repoCalls: Array<{ light: boolean; byIds: boolean }>

  const reply = (record: any) => ({
    decisions: (record.data.userIds as string[]).filter((u) => IDENTITY[u]).map((u) => ({ userId: u, ...IDENTITY[u] })),
  })

  const build = async (impl?: (p: string, r: any) => Observable<unknown>) => {
    transport = jest.fn(impl ?? ((_p, r) => of(reply(r))))
    httpPost = jest.fn()
    brokerUrl = 'amqp://test'
    groq = undefined

    profiles = PROFILES
    repoCalls = []
    const repo = {
      find: jest.fn(async (opts: any) => {
        repoCalls.push({ light: Array.isArray(opts.select) && opts.select.join() === 'id,sourceId', byIds: !!opts.where.id })
        let rows = profiles.filter((p) => p.status === opts.where.status)
        if (opts.where.id) {
          const wanted: string[] = opts.where.id.value
          rows = profiles.filter((p) => wanted.includes(p.id))
        } else {
          rows = rows.slice(opts.skip ?? 0, opts.take === undefined ? undefined : (opts.skip ?? 0) + opts.take)
        }
        const select: string[] | undefined = opts.select
        return select ? rows.map((r) => Object.fromEntries(select.map((k) => [k, r[k]]))) : rows
      }),
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [TalentProfileController],
      providers: [
        TalentProfileRecommendationService,
        TalentDiscoveryGateService,
        IdentityVerificationGateClient,
        { provide: IDENTITY_VERIFICATION_CLIENT, useValue: { send: transport } },
        { provide: getRepositoryToken(TalentProfile), useValue: repo },
        { provide: HttpService, useValue: { post: httpPost } },
        {
          provide: ConfigService,
          useValue: { get: (k: string) => (k === 'RABBITMQ_URL' ? brokerUrl : k === 'GROQ_API_KEY' ? groq : undefined) },
        },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()
  }

  beforeEach(() => build())
  afterEach(() => app.close())

  describe('GET /public/talent', () => {
    it('an unverified viewer browses normally: 200, no 403, no verification payload', async () => {
      const res = await request(app.getHttpServer()).get('/public/talent').set('Authorization', 'Bearer unverified')
      expect(res.status).toBe(200)
      expect(JSON.stringify(res.body)).not.toMatch(/VERIFICATION_REQUIRED|missingRequirements/)
    })

    it('never asks identity about the viewer', async () => {
      await request(app.getHttpServer()).get('/public/talent').set('x-user-id', 'viewer-unverified')
      const asked = transport.mock.calls.flatMap(([, r]) => r.data.userIds as string[])
      expect(asked).not.toContain('viewer-unverified')
    })

    it('verified + grace listed in order; unverified, lapsed, no-profile and account-less excluded', async () => {
      const res = await request(app.getHttpServer()).get('/public/talent?limit=100')
      expect(res.body.data.map((p: any) => p.id)).toEqual(VISIBLE)
      expect(res.body.total).toBe(VISIBLE.length)
    })

    it('hidden information, and the gate account id, are absent from every field', async () => {
      const res = await request(app.getHttpServer()).get('/public/talent?limit=100')
      const raw = JSON.stringify(res.body)
      for (const p of hiddenProfiles()) {
        for (const v of [p.id, p.username, p.name, p.avatarUrl, p.sourceId].filter(Boolean)) expect(raw).not.toContain(String(v))
      }
      expect(raw).not.toContain('acct-')
      expect(raw).not.toContain('sourceId')
    })

    it('pagination, totals and page size are counted over visible talent', async () => {
      const p1 = await request(app.getHttpServer()).get('/public/talent?page=1&limit=3')
      const p2 = await request(app.getHttpServer()).get('/public/talent?page=2&limit=3')
      const p3 = await request(app.getHttpServer()).get('/public/talent?page=3&limit=3')
      const p4 = await request(app.getHttpServer()).get('/public/talent?page=4&limit=3')
      expect(p1.body.data.map((p: any) => p.id)).toEqual(VISIBLE.slice(0, 3))
      expect(p2.body.data.map((p: any) => p.id)).toEqual(VISIBLE.slice(3, 6))
      expect(p3.body.data.map((p: any) => p.id)).toEqual(VISIBLE.slice(6))
      expect(p4.body.data).toEqual([])
      for (const r of [p1, p2, p3, p4]) {
        expect(r.body.total).toBe(7)
        expect(r.body.limit).toBe(3)
      }
      expect(p1.body.page).toBe(1)
      expect(p3.body.page).toBe(3)
    })

    it('asks identity in batches and reads full profiles only for the visible page', async () => {
      const res = await request(app.getHttpServer()).get('/public/talent?page=1&limit=2')
      expect(res.body.data).toHaveLength(2)
      for (const [pattern] of transport.mock.calls) expect(pattern).toBe('identity_verification.gate_check_batch')
      expect(transport.mock.calls.length).toBeLessThanOrEqual(2)
    })

    it('all hidden -> empty list with total 0', async () => {
      for (const k of Object.keys(IDENTITY)) IDENTITY[k] = CLOSED()
      try {
        const res = await request(app.getHttpServer()).get('/public/talent')
        expect(res.body).toEqual({ data: [], total: 0, page: 1, limit: 20 })
      } finally {
        Object.assign(IDENTITY, { [acct(1)]: OPEN, [acct(3)]: OPEN, [acct(6)]: OPEN, [acct(7)]: OPEN, [acct(9)]: OPEN, [acct(10)]: OPEN, [acct(11)]: OPEN })
      }
    })

    it.each([
      ['malformed reply', () => of('nope')],
      ['contradictory entry', () => of({ decisions: [{ userId: acct(1), gateOpen: false, missingRequirements: 'none' }] })],
      ['RPC error', () => throwError(() => new Error('down'))],
    ])('%s -> nobody listed', async (_l, impl) => {
      await app.close()
      await build(impl as any)
      const res = await request(app.getHttpServer()).get('/public/talent')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ data: [], total: 0, page: 1, limit: 20 })
    })

    it('timeout / no consumer -> nobody listed', async () => {
      await app.close()
      await build(() => NEVER)
      const res = await request(app.getHttpServer()).get('/public/talent')
      expect(res.body.data).toEqual([])
      expect(res.body.total).toBe(0)
    }, 10_000)

    it('missing broker configuration -> nobody listed', async () => {
      brokerUrl = ''
      const res = await request(app.getHttpServer()).get('/public/talent')
      expect(res.body.data).toEqual([])
      expect(transport).not.toHaveBeenCalled()
    })
  })


  describe('no scan ceiling (regression: more than 2,300 candidates, hidden first)', () => {
    const HIDDEN_FIRST = 2350
    const VISIBLE_AFTER = 130
    const A = (n: number) => `big-acct-${n}`
    beforeEach(() => {
      profiles = [
        ...Array.from({ length: HIDDEN_FIRST }, (_, i) => ({ ...mk(10000 + i, A(i)), name: `HiddenPerson${i}`, username: `hid${i}`, id: `hp-${i}` })),
        ...Array.from({ length: VISIBLE_AFTER }, (_, i) => ({ ...mk(20000 + i, A(HIDDEN_FIRST + i)), name: `VisiblePerson${i}`, username: `vis${i}`, id: `vp-${i}` })),
      ]
      for (let i = 0; i < HIDDEN_FIRST; i++) IDENTITY[A(i)] = i % 2 ? CLOSED('identity') : CLOSED('both')
      for (let i = 0; i < VISIBLE_AFTER; i++) IDENTITY[A(HIDDEN_FIRST + i)] = OPEN
    })
    afterEach(() => {
      for (let i = 0; i < HIDDEN_FIRST + VISIBLE_AFTER; i++) delete IDENTITY[A(i)]
    })

    it('/public/talent total and pages are exact across the whole table, not a prefix', async () => {
      const p1 = await request(app.getHttpServer()).get('/public/talent?page=1&limit=50')
      const p2 = await request(app.getHttpServer()).get('/public/talent?page=2&limit=50')
      const p3 = await request(app.getHttpServer()).get('/public/talent?page=3&limit=50')
      const p4 = await request(app.getHttpServer()).get('/public/talent?page=4&limit=50')
      for (const r of [p1, p2, p3, p4]) expect(r.body.total).toBe(VISIBLE_AFTER)
      expect(p1.body.data).toHaveLength(50)
      expect(p2.body.data).toHaveLength(50)
      expect(p3.body.data).toHaveLength(30)
      expect(p4.body.data).toEqual([])
      expect([...p1.body.data, ...p2.body.data, ...p3.body.data].map((p: any) => p.username)).toEqual(
        Array.from({ length: VISIBLE_AFTER }, (_, i) => `vis${i}`),
      )
    })

    it('/public/talent reads hidden profiles only as (id, sourceId); full rows are loaded for the visible page only', async () => {
      const res = await request(app.getHttpServer()).get('/public/talent?page=1&limit=20')
      const full = repoCalls.filter((c) => !c.light)
      expect(full).toEqual([{ light: false, byIds: true }])
      expect(JSON.stringify(res.body)).not.toMatch(/HiddenPerson|hid\d|big-acct/)
    })

    it('/public/talent asks identity in batches (not per profile)', async () => {
      await request(app.getHttpServer()).get('/public/talent?page=1&limit=20')
      const asked = transport.mock.calls.reduce((n, [, r]) => n + r.data.userIds.length, 0)
      expect(asked).toBe(HIDDEN_FIRST + VISIBLE_AFTER)
      expect(transport.mock.calls.every(([, r]) => r.data.userIds.length <= 100)).toBe(true)
      expect(transport.mock.calls.length).toBeLessThan(40) // ~13 chunks per 500-row page x 5 pages, never 2,480
    })

    it('recommendations: finds 80 visible candidates behind 2,350 hidden ones, loading only visible profiles', async () => {
      await app.close()
      await build()
      profiles = [
        ...Array.from({ length: HIDDEN_FIRST }, (_, i) => ({ ...mk(10000 + i, A(i)), name: `HiddenPerson${i}`, username: `hid${i}`, id: `hp-${i}` })),
        ...Array.from({ length: VISIBLE_AFTER }, (_, i) => ({ ...mk(20000 + i, A(HIDDEN_FIRST + i)), name: `VisiblePerson${i}`, username: `vis${i}`, id: `vp-${i}` })),
      ]
      groq = 'test-key'
      httpPost.mockImplementation((_u: string, body: any) => {
        const content = JSON.parse(body.messages[1].content)
        return of({ data: { choices: [{ message: { content: JSON.stringify({ recommendations: content.candidates.map((c: any) => ({ id: c.id, matchScore: 80, matchedSkills: [], reason: 'ok' })) }) } }] } })
      })
      const res = await request(app.getHttpServer()).post('/public/talent/recommendations').send({ roleTitle: 'Engineer', limit: 30 })
      if (!httpPost.mock.calls.length) throw new InternalServerErrorException('ranker not called: ' + res.status + ' ' + JSON.stringify(res.body).slice(0, 300))
      const candidates = JSON.parse(httpPost.mock.calls[0][1].messages[1].content).candidates
      expect(candidates).toHaveLength(80)
      expect(candidates.every((c: any) => c.name.startsWith('VisiblePerson'))).toBe(true)
      expect(JSON.stringify(httpPost.mock.calls[0][1])).not.toMatch(/HiddenPerson|big-acct/)
      expect(res.body.recommendations).toHaveLength(30)
      expect(repoCalls.filter((c) => !c.light)).toEqual([{ light: false, byIds: true }])
    })

    it('recommendations: identity failure during the scan -> NO_TALENT and the ranker is never called', async () => {
      groq = 'test-key'
      let n = 0
      transport.mockImplementation((_p: string, r: any) => (++n === 4 ? throwError(() => new Error('down')) : of(reply(r))))
      const res = await request(app.getHttpServer()).post('/public/talent/recommendations').send({ roleTitle: 'Engineer' })
      expect(res.body.aiStatus).toBe('NO_TALENT')
      expect(httpPost).not.toHaveBeenCalled()
    })
  })

  describe('POST /public/talent/recommendations', () => {
    const post = () => request(app.getHttpServer()).post('/public/talent/recommendations').send({ roleTitle: 'Engineer' })

    it('an unverified viewer gets recommendations normally', async () => {
      const res = await post().set('Authorization', 'Bearer unverified')
      expect(res.status).toBe(201)
      expect(res.body.recommendations.length).toBeGreaterThan(0)
    })

    it('recommends only visible talent, and exposes nothing of hidden talent', async () => {
      const res = await post()
      expect(res.body.recommendations.map((r: any) => r.id).sort()).toEqual([...VISIBLE].sort())
      const raw = JSON.stringify(res.body)
      for (const p of hiddenProfiles()) for (const v of [p.id, p.username, p.name, p.avatarUrl]) expect(raw).not.toContain(String(v))
      expect(raw).not.toContain('sourceId')
      expect(raw).not.toContain('acct-')
    })

    it('hidden talent are never sent to the AI ranker', async () => {
      await app.close()
      await build()
      groq = 'test-key'
      httpPost.mockImplementation((_u: string, body: any) => {
        const content = JSON.parse(body.messages[1].content)
        return of({
          data: {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    recommendations: [
                      ...content.candidates.map((c: any) => ({ id: c.id, matchScore: 80, matchedSkills: [], reason: 'ok' })),
                      { id: 'profile-2', matchScore: 99, matchedSkills: [], reason: 'injected hidden' },
                    ],
                  }),
                },
              },
            ],
          },
        })
      })
      const res = await post()
      const sent = JSON.stringify(httpPost.mock.calls[0][1])
      for (const p of hiddenProfiles()) for (const v of [p.id, p.name, p.username]) expect(sent).not.toContain(String(v))
      expect(sent).not.toContain('acct-')
      expect(res.body.aiStatus).toBe('OK')
      // a hidden id the model invents is not in the candidate set and never resolves to a profile
      expect(res.body.recommendations.map((r: any) => r.id)).not.toContain('profile-2')
    })

    it.each([
      ['malformed reply', () => of({ decisions: 7 })],
      ['RPC error', () => throwError(() => new Error('down'))],
    ])('%s -> no talent recommended', async (_l, impl) => {
      await app.close()
      await build(impl as any)
      const res = await post()
      expect(res.body.recommendations).toEqual([])
      expect(res.body.aiStatus).toBe('NO_TALENT')
    })

    it('missing broker configuration -> no talent recommended', async () => {
      brokerUrl = ''
      const res = await post()
      expect(res.body.recommendations).toEqual([])
    })
  })
})
