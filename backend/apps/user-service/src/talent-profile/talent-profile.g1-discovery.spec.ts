import 'reflect-metadata'
import { INestApplication, InternalServerErrorException, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { of } from 'rxjs'
import * as request from 'supertest'
import { TalentProfileController } from './talent-profile.controller'
import { TalentProfileRecommendationService } from './talent-profile-recommendation.service'
import { TalentProfile } from './entities/talent-profile.entity'
import { TalentGateStateService } from '../identity-gate/talent-gate-state.service'
import { FakeGate, fakeDiscoveryRepo } from '../testing/gate-aware-repo'

// G1: GET /public/talent (paginated browse list) and POST /public/talent/recommendations leave
// out talent whose gate is not KNOWN OPEN. The gate is a semi-join inside the database query, so
// it is applied before the count and before pagination. Real controller + real recommendation
// service over a repository double that evaluates the query the way PostgreSQL does (see
// testing/gate-aware-repo.ts). identity-verification-service is not a dependency of these paths
// any more: the specs provide no client for it at all, so a call to it could not happen.

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
// Newest first.
const PROFILES = [mk(1), mk(2), mk(3), mk(4), mk(5), mk(6), mk(7), mk(8), mk(9), mk(10), mk(11), mk(12, null)]
// Known open: verified (1), grace (3, 6, 7, 9, 10, 11). Known closed (2, 4, 8) have no open row.
// Never received (5) has no row at all. 12 has no account.
const OPEN_ACCOUNTS = [1, 3, 6, 7, 9, 10, 11].map(acct)
const VISIBLE = [1, 3, 6, 7, 9, 10, 11].map((n) => `profile-${n}`)
const HIDDEN = [2, 4, 5, 8, 12]
const hiddenProfiles = () => PROFILES.filter((p) => HIDDEN.some((n) => p.id === `profile-${n}`))

describe('G1 - /public/talent (user-service)', () => {
  let app: INestApplication
  let httpPost: jest.Mock
  let groq: string | undefined
  let profiles: any[]
  let gate: FakeGate
  let repo: ReturnType<typeof fakeDiscoveryRepo>
  const warn = jest.fn()

  const build = async () => {
    httpPost = jest.fn()
    groq = undefined
    profiles = PROFILES
    gate = { open: new Set(OPEN_ACCOUNTS), unreadable: false }
    repo = fakeDiscoveryRepo(() => profiles, gate)

    const moduleRef = await Test.createTestingModule({
      controllers: [TalentProfileController],
      providers: [
        TalentProfileRecommendationService,
        // the real service's read-side helpers only (the table is faked by the repository double)
        { provide: TalentGateStateService, useValue: { isUnreadable: (e: unknown) => /talent_gate_state/.test(String((e as Error)?.message)), warnUnreadable: warn } },
        { provide: getRepositoryToken(TalentProfile), useValue: repo },
        { provide: HttpService, useValue: { post: httpPost } },
        { provide: ConfigService, useValue: { get: (k: string) => (k === 'GROQ_API_KEY' ? groq : undefined) } },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()
  }

  beforeEach(() => {
    warn.mockClear()
    return build()
  })
  afterEach(() => app.close())

  const list = (qs = '') => request(app.getHttpServer()).get(`/public/talent${qs}`)

  describe('GET /public/talent', () => {
    it('an unverified viewer browses normally: 200, no 403, no verification payload', async () => {
      const res = await list().set('Authorization', 'Bearer unverified')
      expect(res.status).toBe(200)
      expect(JSON.stringify(res.body)).not.toMatch(/VERIFICATION_REQUIRED|missingRequirements/)
    })

    it('the viewer plays no part: the same list for an anonymous request and any viewer header', async () => {
      const anonymous = await list('?limit=100')
      const viewer = await list('?limit=100').set('x-user-id', 'viewer-unverified').set('Authorization', 'Bearer x')
      expect(viewer.body).toEqual(anonymous.body)
    })

    it('verified + grace listed in order; closed, never-received and account-less excluded', async () => {
      const res = await list('?limit=100')
      expect(res.body.data.map((p: any) => p.id)).toEqual(VISIBLE)
      expect(res.body.total).toBe(VISIBLE.length)
    })

    it('hidden information, and the gate account id, are absent from every field', async () => {
      const res = await list('?limit=100')
      const raw = JSON.stringify(res.body)
      for (const p of hiddenProfiles()) {
        for (const v of [p.id, p.username, p.name, p.avatarUrl, p.sourceId].filter(Boolean)) expect(raw).not.toContain(String(v))
      }
      expect(raw).not.toContain('acct-')
      expect(raw).not.toContain('sourceId')
    })

    it('pagination, totals and page size are counted over visible talent', async () => {
      const pages = []
      for (const n of [1, 2, 3, 4]) pages.push(await list(`?page=${n}&limit=3`))
      expect(pages[0].body.data.map((p: any) => p.id)).toEqual(VISIBLE.slice(0, 3))
      expect(pages[1].body.data.map((p: any) => p.id)).toEqual(VISIBLE.slice(3, 6))
      expect(pages[2].body.data.map((p: any) => p.id)).toEqual(VISIBLE.slice(6))
      expect(pages[3].body.data).toEqual([])
      for (const r of pages) {
        expect(r.body.total).toBe(7)
        expect(r.body.limit).toBe(3)
      }
      expect([pages[0].body.page, pages[2].body.page]).toEqual([1, 3])
    })

    it('a verification change is reflected on the very next request: lapse hides, restore shows', async () => {
      expect((await list('?limit=100')).body.data.map((p: any) => p.id)).toContain('profile-3')
      gate.open.delete(acct(3)) // grace expired -> identity.gate_changed {gateOpen:false}
      const lapsed = await list('?limit=100')
      expect(lapsed.body.data.map((p: any) => p.id)).not.toContain('profile-3')
      expect(lapsed.body.total).toBe(6)
      gate.open.add(acct(3)) // verified again
      expect((await list('?limit=100')).body.total).toBe(7)
    })

    it('an account whose state was never received is hidden without affecting anyone else', async () => {
      gate.open.delete(acct(1))
      const res = await list('?limit=100')
      expect(res.body.data.map((p: any) => p.id)).toEqual(VISIBLE.slice(1))
    })

    it('all hidden -> empty list with total 0', async () => {
      gate.open.clear()
      const res = await list()
      expect(res.body).toEqual({ data: [], total: 0, page: 1, limit: 20 })
    })

    it('the state table cannot be read -> nobody is listed (never everybody), the request still succeeds', async () => {
      gate.unreadable = true
      const res = await list()
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ data: [], total: 0, page: 1, limit: 20 })
      expect(warn).toHaveBeenCalled()
    })

    it('an unrelated database error is not swallowed as "no talent"', async () => {
      jest.spyOn(repo, 'createQueryBuilder').mockImplementationOnce(() => {
        throw new InternalServerErrorException('connection lost')
      })
      expect((await list()).status).toBe(500)
    })
  })

  describe('the gate is part of the query, not a post-filter', () => {
    it('every list query carries the gate, is a single page-bounded read, and never loads hidden rows', async () => {
      await list('?page=1&limit=2')
      expect(repo.log).toHaveLength(1)
      expect(repo.log[0]).toMatchObject({ kind: 'getManyAndCount', gated: true, returned: 2, total: 7 })
      expect(repo.find).not.toHaveBeenCalled() // no second "load the rows" read
    })

    it('only the public columns are selected - never the account id the gate is keyed on', async () => {
      await list()
      expect(repo.log[0].select).not.toBeNull()
      expect(repo.log[0].select).not.toContain('sourceId')
    })
  })

  describe('large datasets: cost does not grow with the table (regression: 2,300+ hidden first)', () => {
    const bigAcct = (n: number) => `big-acct-${n}`
    const load = (hidden: number, visible: number) => {
      const t0 = new Date(2026, 5, 1).getTime()
      profiles = [
        ...Array.from({ length: hidden }, (_, i) => ({ ...mk(10000 + i, bigAcct(i)), name: `HiddenPerson${i}`, username: `hid${i}`, id: `hp-${i}`, updatedAt: new Date(t0 + (hidden + visible - i)) })),
        ...Array.from({ length: visible }, (_, i) => ({ ...mk(20000 + i, bigAcct(hidden + i)), name: `VisiblePerson${i}`, username: `vis${i}`, id: `vp-${i}`, updatedAt: new Date(t0 + (visible - i)) })),
      ]
      gate.open = new Set(Array.from({ length: visible }, (_, i) => bigAcct(hidden + i)))
      repo.log.length = 0
    }

    it('total and pages are exact across the whole table, not a prefix', async () => {
      load(20_000, 130)
      const pages = []
      for (const n of [1, 2, 3, 4]) pages.push(await list(`?page=${n}&limit=50`))
      for (const r of pages) expect(r.body.total).toBe(130)
      expect(pages.map((r) => r.body.data.length)).toEqual([50, 50, 30, 0])
      expect(pages.flatMap((r) => r.body.data).map((p: any) => p.username)).toEqual(Array.from({ length: 130 }, (_, i) => `vis${i}`))
    })

    it('query count and rows returned do not depend on the table size', async () => {
      const perRequest: number[] = []
      for (const [hidden, visible] of [[10, 5], [2_000, 5], [50_000, 5]] as const) {
        load(hidden, visible)
        await list('?page=1&limit=20')
        perRequest.push(repo.log.length)
        expect(repo.log[0].returned).toBe(5)
      }
      expect(perRequest).toEqual([1, 1, 1])
    })

    it('hidden profiles are never returned from the database at all', async () => {
      load(5_000, 40)
      const res = await list('?page=1&limit=20')
      expect(JSON.stringify(res.body)).not.toMatch(/HiddenPerson|hid\d|big-acct/)
      expect(repo.log[0].returned).toBeLessThanOrEqual(20)
    })

    it('recommendations: the first 80 candidates are 80 VISIBLE profiles, behind 2,350 hidden ones, in one read', async () => {
      load(2_350, 130)
      groq = 'test-key'
      httpPost.mockImplementation((_u: string, body: any) => {
        const content = JSON.parse(body.messages[1].content)
        return of({ data: { choices: [{ message: { content: JSON.stringify({ recommendations: content.candidates.map((c: any) => ({ id: c.id, matchScore: 80, matchedSkills: [], reason: 'ok' })) }) } }] } })
      })
      const res = await request(app.getHttpServer()).post('/public/talent/recommendations').send({ roleTitle: 'Engineer', limit: 30 })
      const candidates = JSON.parse(httpPost.mock.calls[0][1].messages[1].content).candidates
      expect(candidates).toHaveLength(80)
      expect(candidates.every((c: any) => c.name.startsWith('VisiblePerson'))).toBe(true)
      expect(JSON.stringify(httpPost.mock.calls[0][1])).not.toMatch(/HiddenPerson|big-acct/)
      expect(res.body.recommendations).toHaveLength(30)
      expect(repo.log).toHaveLength(1)
      expect(repo.log[0]).toMatchObject({ kind: 'getMany', gated: true, returned: 80 })
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

    it('hidden talent are never sent to the AI ranker, and an id the model invents never resolves', async () => {
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
      expect(res.body.recommendations.map((r: any) => r.id)).not.toContain('profile-2')
    })

    it('the state table cannot be read -> no candidates, NO_TALENT, and the ranker is never called', async () => {
      gate.unreadable = true
      groq = 'test-key'
      const res = await post()
      expect(res.body.recommendations).toEqual([])
      expect(res.body.aiStatus).toBe('NO_TALENT')
      expect(httpPost).not.toHaveBeenCalled()
    })

    it('all hidden -> NO_TALENT', async () => {
      gate.open.clear()
      const res = await post()
      expect(res.body.aiStatus).toBe('NO_TALENT')
      expect(res.body.recommendations).toEqual([])
    })
  })
})
