import 'reflect-metadata'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
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
import { TalentGateStateService } from '../identity-gate/talent-gate-state.service'
import { FakeGate, fakeDiscoveryRepo } from '../testing/gate-aware-repo'

// G1: GET /talent/users (marketplace browse list, also feeds the homepage and category pages)
// leaves out talent whose gate is not KNOWN OPEN. The gate is a semi-join inside the database
// query, applied before the limit, so the first N rows are the first N VISIBLE talent in the
// list's own order. Real controller + real TalentService over a repository double that evaluates
// the query the way PostgreSQL does (testing/gate-aware-repo.ts). identity-verification-service
// is not a dependency of this path: the spec provides no client for it.

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
// Known open: verified (1), grace (3), and 6, 7, 9, 10, 11, 12. Known closed (2, 4, 8) and never
// received (5) have no open row.
const OPEN_IDS = [1, 3, 6, 7, 9, 10, 11, 12].map(id)
const VISIBLE = OPEN_IDS
const HIDDEN = [2, 4, 5, 8].map(id)

describe('G1 - GET /talent/users (user-service)', () => {
  let app: INestApplication
  let hydrated: { skills: string[][]; profiles: string[][] }
  let users: any[]
  let gate: FakeGate
  let repo: ReturnType<typeof fakeDiscoveryRepo>
  const warn = jest.fn()

  const build = async () => {
    hydrated = { skills: [], profiles: [] }
    users = USERS
    gate = { open: new Set(OPEN_IDS), unreadable: false }
    repo = fakeDiscoveryRepo(() => users, gate)
    const byUser = (sink: string[][]) =>
      jest.fn(async ({ where }: any) => {
        sink.push(where.map((w: any) => w.userId))
        return []
      })

    const moduleRef = await Test.createTestingModule({
      controllers: [TalentController],
      providers: [
        TalentService,
        { provide: TalentGateStateService, useValue: { isUnreadable: (e: unknown) => /talent_gate_state/.test(String((e as Error)?.message)), warnUnreadable: warn } },
        { provide: getRepositoryToken(User), useValue: repo },
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

  beforeEach(() => {
    warn.mockClear()
    return build()
  })
  afterEach(() => app.close())

  const browse = () => request(app.getHttpServer()).get('/talent/users')

  it('an unverified viewer browses normally: 200, no 403, nothing about verification in the body', async () => {
    const res = await browse().set('Authorization', 'Bearer unverified-viewer')
    expect(res.status).toBe(200)
    expect(JSON.stringify(res.body)).not.toMatch(/VERIFICATION_REQUIRED|missingRequirements|verify/i)
  })

  it('the viewer plays no part: an anonymous request and any viewer header get the same list', async () => {
    const anonymous = await browse()
    const viewer = await browse().set('x-user-id', 'viewer-unverified')
    expect(viewer.body).toEqual(anonymous.body)
  })

  it('lists verified and grace talent in order; excludes closed and never-received (default limit 24)', async () => {
    const res = await browse()
    expect(res.body.map((u: any) => u.id)).toEqual(VISIBLE)
  })

  it('hidden talent information is absent from every response field', async () => {
    const res = await browse()
    const raw = JSON.stringify(res.body)
    for (const hiddenId of HIDDEN) {
      const u = USERS.find((x) => x.id === hiddenId)!
      for (const v of [u.id, u.username, u.firstName, u.lastName, u.avatarUrl]) expect(raw).not.toContain(v)
    }
  })

  it('the gate runs before any related data is read: hidden accounts are never hydrated', async () => {
    await browse()
    const hydratedIds = hydrated.skills.flat()
    for (const hiddenId of HIDDEN) expect(hydratedIds).not.toContain(hiddenId)
    for (const u of USERS.filter((x) => HIDDEN.includes(x.id))) expect(hydrated.profiles.flat()).not.toContain(u.username)
  })

  it('the limit is filled from visible talent even when hidden talent come first', async () => {
    const direct = await app.get(TalentService).listTalentUsers(3)
    expect(direct.map((u: any) => u.id)).toEqual(VISIBLE.slice(0, 3))
  })

  it('a verification change is reflected on the next request', async () => {
    gate.open.delete(id(3)) // grace lapsed
    expect((await browse()).body.map((u: any) => u.id)).not.toContain(id(3))
    gate.open.add(id(3)) // verified
    expect((await browse()).body.map((u: any) => u.id)).toContain(id(3))
  })

  it('an account whose state was never received is hidden without affecting anyone else', async () => {
    gate.open.delete(id(1))
    expect((await browse()).body.map((u: any) => u.id)).toEqual(VISIBLE.slice(1))
  })

  it('all talent hidden: empty list, no error', async () => {
    gate.open.clear()
    const res = await browse()
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  describe('the gate is part of the query', () => {
    it('one gated, limit-bounded read, plus one by-id read for the visible rows - no scan, no identity call', async () => {
      await browse()
      expect(repo.log).toHaveLength(1)
      expect(repo.log[0]).toMatchObject({ kind: 'getMany', gated: true, returned: VISIBLE.length })
      expect(repo.log[0].select).toEqual(['id'])
      expect(repo.find).toHaveBeenCalledTimes(1) // hydration of the visible ids only
    })
  })

  describe('large datasets: cost does not grow with the table (regression: 2,300+ hidden first)', () => {
    const bigId = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`
    const load = (hidden: number, visible: number) => {
      const t0 = new Date(2026, 5, 1).getTime()
      users = [
        ...Array.from({ length: hidden }, (_, i) => ({
          id: bigId(i), username: `hid${i}`, firstName: `FH${i}`, lastName: `LH${i}`, avatarUrl: `https://img/h${i}.png`, userType: 'talent', onboardedAt: new Date(t0 + hidden + visible - i),
        })),
        ...Array.from({ length: visible }, (_, i) => ({
          id: bigId(hidden + i), username: `vis${i}`, firstName: `FV${i}`, lastName: `LV${i}`, avatarUrl: `https://img/v${i}.png`, userType: 'talent', onboardedAt: new Date(t0 + visible - i),
        })),
      ]
      gate.open = new Set(Array.from({ length: visible }, (_, i) => bigId(hidden + i)))
      repo.log.length = 0
      repo.find.mockClear()
      hydrated.skills.length = 0
    }

    it('fills the 24 from visible talent behind 2,350 hidden ones, in order', async () => {
      load(2_350, 60)
      const res = await browse()
      expect(res.body.map((u: any) => u.username)).toEqual(Array.from({ length: 24 }, (_, i) => `vis${i}`))
    })

    it('query count and rows returned do not depend on the table size', async () => {
      const counts: number[] = []
      for (const [hidden, visible] of [[10, 30], [2_000, 30], [50_000, 30]] as const) {
        load(hidden, visible)
        await browse()
        counts.push(repo.log.length)
        expect(repo.log[0].returned).toBe(24)
        expect(repo.find).toHaveBeenCalledTimes(1)
      }
      expect(counts).toEqual([1, 1, 1])
    })

    it('hidden talent are never loaded or hydrated: only the 24 visible accounts are', async () => {
      load(5_000, 60)
      const res = await browse()
      const hydratedIds = hydrated.skills.flat()
      expect(hydratedIds).toHaveLength(24)
      expect(hydratedIds.every((i) => users.find((u) => u.id === i)!.username.startsWith('vis'))).toBe(true)
      expect(JSON.stringify(res.body)).not.toMatch(/hid\d|FH\d|LH\d|img\/h\d/)
    })

    it('fewer visible than the limit: returns all of them (no truncation)', async () => {
      load(3_000, 17)
      const direct = await app.get(TalentService).listTalentUsers(500)
      expect(direct).toHaveLength(17)
      expect(direct.map((u: any) => u.username)).toEqual(Array.from({ length: 17 }, (_, i) => `vis${i}`))
    })
  })

  describe('fails closed', () => {
    it('the state table cannot be read -> nobody listed, nothing hydrated, request still succeeds', async () => {
      gate.unreadable = true
      const res = await browse()
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
      expect(hydrated.skills).toEqual([])
      expect(warn).toHaveBeenCalled()
    })
  })
})
