import 'reflect-metadata'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Observable, of, throwError, NEVER } from 'rxjs'
import * as request from 'supertest'
import { TalentController } from './talent.controller'
import { TalentService } from './talent.service'
import { User } from '../user/entities/user.entity'
import { Skill } from '../skills/skills.entity'
import { Experience } from '../experience/experience.entity'
import { Education } from '../education/education.entity'
import { Certification } from '../certifications/certifications.entity'
import { Industry } from '../industries/industries.entity'
import { Language } from '../languages/languages.entity'
import { Portfolio } from '../portfolio/portfolio.entity'
import { TalentProfile } from '../talent-profile/entities/talent-profile.entity'
import { R2Service } from '../storage/r2.service'
import { UserService } from '../user/user.service'
import { ConfigService } from '@nestjs/config'
import {
  IDENTITY_VERIFICATION_CLIENT,
  IdentityVerificationGateClient,
} from '../identity-gate/identity-verification-gate.client'
import { TalentDiscoveryGateService } from '../identity-gate/talent-discovery-gate.service'

// G1: GET /talent/users (marketplace browse list, also feeds the homepage and
// category pages) leaves out talent whose gate is closed. Real controller +
// real TalentService + real gate over a stubbed RabbitMQ transport; repositories
// are in-memory.

const OPEN = { gateOpen: true, missingRequirements: 'none' }
const CLOSED = (m = 'both') => ({ gateOpen: false, missingRequirements: m })

const id = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`
// Newest onboarded first (the list's own order).
const USERS = Array.from({ length: 12 }, (_, i) => ({
  id: id(i + 1),
  username: `user${i + 1}`,
  firstName: `First${i + 1}`,
  lastName: `Last${i + 1}`,
  avatarUrl: `https://img.example/${i + 1}.png`,
  userType: 'talent',
  onboardedAt: new Date(2026, 0, 30 - i),
}))
const IDENTITY: Record<string, any> = {
  [id(1)]: OPEN, // verified
  [id(2)]: CLOSED('both'), // unverified
  [id(3)]: OPEN, // grace
  [id(4)]: CLOSED('identity'), // grace lapsed
  // id(5): no identity profile -> identity returns no entry / closed
  [id(6)]: OPEN,
  [id(7)]: OPEN,
  [id(8)]: CLOSED('location'),
  [id(9)]: OPEN,
  [id(10)]: OPEN,
  [id(11)]: OPEN,
  [id(12)]: OPEN,
}
const VISIBLE = [1, 3, 6, 7, 9, 10, 11, 12].map(id)
const HIDDEN = [2, 4, 5, 8].map(id)

describe('G1 - GET /talent/users (user-service)', () => {
  let app: INestApplication
  let transport: jest.Mock
  let hydrated: { skills: string[][]; profiles: string[][] }
  let brokerUrl: string | undefined
  let users: any[]
  let userFinds: Array<{ light: boolean; byIds: boolean }>

  const reply = (record: any) => ({
    decisions: (record.data.userIds as string[]).filter((u) => IDENTITY[u]).map((u) => ({ userId: u, ...IDENTITY[u] })),
  })

  const build = async (impl?: (p: string, r: any) => Observable<unknown>) => {
    transport = jest.fn(impl ?? ((_p, r) => of(reply(r))))
    hydrated = { skills: [], profiles: [] }
    brokerUrl = 'amqp://test'

    users = USERS
    userFinds = []
    const userRepo = {
      find: jest.fn(async (opts: any) => {
        const { where, skip = 0, take } = opts
        userFinds.push({ light: !!opts.select, byIds: !!where.id })
        if (where.id) {
          const wanted: string[] = where.id.value // typeorm In(...)
          return users.filter((u) => wanted.includes(u.id)).map((u) => ({ ...u }))
        }
        const rows = users.filter((u) => u.userType === where.userType).slice(skip, take === undefined ? undefined : skip + take)
        return opts.select ? rows.map((u) => ({ id: u.id })) : rows
      }),
    }
    const byUser = (sink: string[][]) =>
      jest.fn(async ({ where }: any) => {
        sink.push(where.map((w: any) => w.userId))
        return []
      })

    const moduleRef = await Test.createTestingModule({
      controllers: [TalentController],
      providers: [
        TalentService,
        TalentDiscoveryGateService,
        IdentityVerificationGateClient,
        { provide: IDENTITY_VERIFICATION_CLIENT, useValue: { send: transport } },
        { provide: ConfigService, useValue: { get: (k: string) => (k === 'RABBITMQ_URL' ? brokerUrl : undefined) } },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Skill), useValue: { find: byUser(hydrated.skills) } },
        { provide: getRepositoryToken(Experience), useValue: { find: jest.fn(async () => []) } },
        { provide: getRepositoryToken(Education), useValue: {} },
        { provide: getRepositoryToken(Certification), useValue: {} },
        { provide: getRepositoryToken(Industry), useValue: {} },
        { provide: getRepositoryToken(Language), useValue: {} },
        { provide: getRepositoryToken(Portfolio), useValue: { find: jest.fn(async () => []) } },
        {
          provide: getRepositoryToken(TalentProfile),
          useValue: {
            find: jest.fn(async ({ where }: any) => {
              hydrated.profiles.push(where.map((w: any) => w.username))
              return []
            }),
          },
        },
        { provide: R2Service, useValue: {} },
        { provide: UserService, useValue: {} },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  }

  beforeEach(() => build())
  afterEach(() => app.close())

  it('an unverified viewer browses normally: 200, no 403, nothing about verification in the body', async () => {
    const res = await request(app.getHttpServer()).get('/talent/users').set('Authorization', 'Bearer unverified-viewer')
    expect(res.status).toBe(200)
    expect(JSON.stringify(res.body)).not.toMatch(/VERIFICATION_REQUIRED|missingRequirements|verify/i)
  })

  it('never asks identity about the viewer, only about the talent being listed', async () => {
    await request(app.getHttpServer()).get('/talent/users').set('x-user-id', 'viewer-unverified')
    const asked = transport.mock.calls.flatMap(([, r]) => r.data.userIds as string[])
    expect(asked).not.toContain('viewer-unverified')
    expect(asked.every((a) => USERS.some((u) => u.id === a))).toBe(true)
  })

  it('lists verified and grace talent in order; excludes unverified, lapsed, no-profile (default limit 24)', async () => {
    const res = await request(app.getHttpServer()).get('/talent/users')
    expect(res.body.map((u: any) => u.id)).toEqual(VISIBLE)
  })

  it('hidden talent information is absent from every response field', async () => {
    const res = await request(app.getHttpServer()).get('/talent/users')
    const raw = JSON.stringify(res.body)
    for (const hiddenId of HIDDEN) {
      const u = USERS.find((x) => x.id === hiddenId)!
      for (const v of [u.id, u.username, u.firstName, u.lastName, u.avatarUrl]) expect(raw).not.toContain(v)
    }
  })

  it('the gate runs before any related data is read: hidden accounts are never hydrated', async () => {
    await request(app.getHttpServer()).get('/talent/users')
    const hydratedIds = hydrated.skills.flat()
    for (const hiddenId of HIDDEN) expect(hydratedIds).not.toContain(hiddenId)
    for (const u of USERS.filter((x) => HIDDEN.includes(x.id))) expect(hydrated.profiles.flat()).not.toContain(u.username)
  })

  it('the visible-result limit is filled from visible talent even when hidden talent come first', async () => {
    const res = await request(app.getHttpServer()).get('/talent/users')
    expect(res.body).toHaveLength(VISIBLE.length)
    // limit semantics through the service: ask for 3 and get the first 3 visible
    const direct = await app.get(TalentService).listTalentUsers(3)
    expect(direct.map((u: any) => u.id)).toEqual(VISIBLE.slice(0, 3))
  })

  it('asks identity in batches, never once per talent', async () => {
    await request(app.getHttpServer()).get('/talent/users')
    expect(transport.mock.calls.length).toBeLessThanOrEqual(2)
    for (const [pattern] of transport.mock.calls) expect(pattern).toBe('identity_verification.gate_check_batch')
  })

  it('all talent hidden: empty list, no error', async () => {
    for (const k of Object.keys(IDENTITY)) IDENTITY[k] = CLOSED()
    try {
      const res = await request(app.getHttpServer()).get('/talent/users')
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    } finally {
      Object.assign(IDENTITY, {
        [id(1)]: OPEN, [id(3)]: OPEN, [id(6)]: OPEN, [id(7)]: OPEN, [id(9)]: OPEN, [id(10)]: OPEN, [id(11)]: OPEN, [id(12)]: OPEN,
      })
    }
  })

  describe('no scan ceiling (regression: more than 2,300 candidates, hidden first)', () => {
    const HIDDEN_FIRST = 2350
    const VISIBLE_AFTER = 60
    const bigId = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`
    beforeEach(() => {
      users = [
        ...Array.from({ length: HIDDEN_FIRST }, (_, i) => ({
          id: bigId(i), username: `hid${i}`, firstName: `FH${i}`, lastName: `LH${i}`, avatarUrl: `https://img/h${i}.png`, userType: 'talent',
        })),
        ...Array.from({ length: VISIBLE_AFTER }, (_, i) => ({
          id: bigId(HIDDEN_FIRST + i), username: `vis${i}`, firstName: `FV${i}`, lastName: `LV${i}`, avatarUrl: `https://img/v${i}.png`, userType: 'talent',
        })),
      ]
      for (let i = 0; i < HIDDEN_FIRST; i++) IDENTITY[bigId(i)] = i % 2 ? CLOSED('identity') : CLOSED('both')
      for (let i = 0; i < VISIBLE_AFTER; i++) IDENTITY[bigId(HIDDEN_FIRST + i)] = OPEN
    })
    afterEach(() => {
      for (let i = 0; i < HIDDEN_FIRST + VISIBLE_AFTER; i++) delete IDENTITY[bigId(i)]
    })

    it('keeps scanning in pages until 24 visible talent are found, in order', async () => {
      const res = await request(app.getHttpServer()).get('/talent/users')
      expect(res.status).toBe(200)
      expect(res.body.map((u: any) => u.username)).toEqual(Array.from({ length: 24 }, (_, i) => `vis${i}`))
    })

    it('stops as soon as 24 are found (does not read the rest of the table)', async () => {
      await request(app.getHttpServer()).get('/talent/users')
      const scanPages = userFinds.filter((f) => f.light).length
      expect(scanPages).toBe(Math.ceil((HIDDEN_FIRST + 24) / 200)) // 2374 rows -> 12 pages of 200
    })

    it('hidden talent rows are never loaded in full: scan is id-only, only visible accounts are loaded and hydrated', async () => {
      const res = await request(app.getHttpServer()).get('/talent/users')
      const fullLoads = userFinds.filter((f) => !f.light)
      expect(fullLoads).toEqual([{ light: false, byIds: true }])
      const hydratedIds = hydrated.skills.flat()
      expect(hydratedIds).toHaveLength(24)
      expect(hydratedIds.every((id) => users.find((u) => u.id === id)!.username.startsWith('vis'))).toBe(true)
      expect(JSON.stringify(res.body)).not.toMatch(/hid\d|FH\d|LH\d|img\/h\d/)
    })

    it('fewer visible than the limit: returns all of them once the data is exhausted (no truncation)', async () => {
      const direct = await app.get(TalentService).listTalentUsers(500)
      expect(direct).toHaveLength(VISIBLE_AFTER)
      expect(direct.map((u: any) => u.username)).toEqual(Array.from({ length: VISIBLE_AFTER }, (_, i) => `vis${i}`))
    })

    it('identity failure part-way through the scan returns nothing', async () => {
      let n = 0
      transport.mockImplementation((_p: string, r: any) => (++n === 5 ? throwError(() => new Error('down')) : of(reply(r))))
      const res = await request(app.getHttpServer()).get('/talent/users')
      expect(res.body).toEqual([])
    })
  })

  describe('fails closed', () => {
    const expectEmpty = async () => {
      const res = await request(app.getHttpServer()).get('/talent/users')
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
      expect(hydrated.skills).toEqual([]) // nothing hydrated either
    }

    it.each([
      ['malformed: not an object', () => of(42)],
      ['malformed: decisions missing', () => of({})],
      ['malformed: contradictory entry', () => of({ decisions: [{ userId: id(1), gateOpen: true, missingRequirements: 'both' }] })],
      ['malformed: unrequested account', () => of({ decisions: [{ userId: 'intruder', ...OPEN }] })],
      ['RPC error', () => throwError(() => new Error('down'))],
    ])('%s -> nobody listed', async (_l, impl) => {
      await app.close()
      await build(impl as any)
      await expectEmpty()
    })

    it('timeout / no consumer -> nobody listed (and the scan stops after the first failure)', async () => {
      await app.close()
      await build(() => NEVER)
      await expectEmpty()
      expect(transport).toHaveBeenCalledTimes(1)
    }, 10_000)

    it('missing broker configuration -> nobody listed, no request attempted', async () => {
      brokerUrl = ''
      await expectEmpty()
      expect(transport).not.toHaveBeenCalled()
    })
  })
})
