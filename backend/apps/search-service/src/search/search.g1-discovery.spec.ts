import 'reflect-metadata'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { Test } from '@nestjs/testing'
import { Observable, of, throwError, NEVER } from 'rxjs'
import * as request from 'supertest'
import { SearchController } from './search.controller'
import { SearchService } from './search.service'
import { AlgoliaClient } from './algolia.client'
import { DbFallbackService } from './db-fallback.service'
import {
  IDENTITY_VERIFICATION_CLIENT,
  IdentityVerificationGateClient,
} from '../identity-gate/identity-verification-gate.client'
import { TalentDiscoveryGateService } from '../identity-gate/talent-discovery-gate.service'

// G1 (Postgres-backed talent discovery only; Algolia is out of scope per Chris):
// unverified talent are silently left out of marketplace search results.
// Real controller + real SearchService + real DbFallbackService + real gate
// client over a stubbed RabbitMQ transport. Algolia and Postgres are in-memory.

const OPEN = { gateOpen: true, missingRequirements: 'none' }
const CLOSED = (m = 'both') => ({ gateOpen: false, missingRequirements: m })

interface Talent {
  objectID: string // CMS profile uuid (what the index is keyed on)
  account: string | null // cms source_id = platform user id
  name: string
  username: string
  avatar_url: string
  identity?: { gateOpen: boolean; missingRequirements: string } // undefined = identity has no profile
}

const T = (n: number, identity: Talent['identity'], account: string | null = `acct-${n}`): Talent => ({
  objectID: `cms-${n}`,
  account,
  name: `Name${n}`,
  username: `user${n}`,
  avatar_url: `https://img.example/${n}.png`,
  identity,
})

// Ranking order, best first. v = visible, h = hidden.
const T1 = T(1, OPEN) // verified
const T2 = T(2, CLOSED('both')) // unverified
const T3 = T(3, OPEN) // grace period (identity reports open)
const T4 = T(4, CLOSED('identity')) // grace lapsed
const T5 = T(5, undefined) // no identity profile at all -> identity answers closed/absent
const T6 = T(6, OPEN)
const T7 = T(7, OPEN)
const T8 = T(8, CLOSED('location'))
const T9 = T(9, OPEN)
const T10 = T(10, OPEN)
const T11 = T(11, OPEN)
const RANKING = [T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11]
const VISIBLE = [T1, T3, T6, T7, T9, T10, T11]
const HIDDEN = [T2, T4, T5, T8]

describe('G1 - marketplace discovery gate (search-service)', () => {
  let app: INestApplication
  let transport: jest.Mock
  let algoliaCalls: Array<{ kind: string; index: string; params: any }>
  let multiCalls: any[][]
  let talentDetailCalls: Array<Array<{ offset: number; length: number }>>
  let httpPost: jest.Mock
  let pool: { query: jest.Mock; end: jest.Mock } | null
  let algoliaConfigured = true
  let brokerUrl: string | undefined
  let ranking: Talent[]
  let staleExtras: Record<string, any>
  let fullRowReads: number[]
  const bigIdentity = new Map<string, { gateOpen: boolean; missingRequirements: string }>()

  const identityReply = (record: any) => ({
    decisions: (record.data.userIds as string[])
      .map((id) => {
        if (bigIdentity.has(id)) return { userId: id, ...bigIdentity.get(id)! }
        const t = RANKING.find((x) => x.account === id)
        return t?.identity ? { userId: id, ...t.identity } : null
      })
      .filter(Boolean),
  })

  const fullHit = (t: Talent) => ({
    objectID: t.objectID,
    name: t.name,
    username: t.username,
    avatar_url: t.avatar_url,
    job_title: `Dev ${t.name}`,
    // A stale index entry may still claim anything; only identity decides.
    verified: true,
    ...staleExtras,
  })

  const fakeAlgolia = {
    get isConfigured() {
      return algoliaConfigured
    },
    search: jest.fn(async (index: string, _q: string, params: any = {}) => {
      algoliaCalls.push({ kind: 'search', index, params })
      if (index.startsWith('talent')) {
        let list = ranking
        if (typeof params.offset === 'number') list = list.slice(params.offset, params.offset + params.length)
        else list = list.slice(params.page * params.hitsPerPage, (params.page + 1) * params.hitsPerPage)
        const only = Array.isArray(params.attributesToRetrieve) && params.attributesToRetrieve.join() === 'objectID'
        return {
          hits: list.map((t) => (only ? { objectID: t.objectID } : fullHit(t))),
          nbHits: ranking.length,
          page: params.page ?? 0,
          nbPages: 1,
          hitsPerPage: params.hitsPerPage ?? params.length,
          ...(typeof params.offset === 'number' ? { offset: params.offset, length: params.length } : {}),
        }
      }
      return { hits: [{ objectID: `${index}-1`, title: `${index} one` }], nbHits: 1, page: 0, nbPages: 1 }
    }),
    multiSearch: jest.fn(async (queries: any[]) => {
      if (queries.length && queries.every((q) => String(q.indexName).startsWith('talent'))) {
        talentDetailCalls.push(queries.map((q) => ({ offset: q.params.offset, length: q.params.length })))
        return Promise.all(queries.map((q) => fakeAlgolia.search(q.indexName, q.query, q.params)))
      }
      multiCalls.push(queries)
      return queries.map((q) => ({ hits: [{ objectID: `${q.indexName}-1`, title: `${q.indexName} one` }], nbHits: 1, page: 0, nbPages: 1 }))
    }),
    setSettings: jest.fn(),
  }

  const fakePool = () => ({
    end: jest.fn(),
    query: jest.fn(async (sql: string, params: any[] = []) => {
      if (sql.includes('information_schema.columns')) return { rows: [{ column_name: 'name' }] }
      if (sql.includes('WHERE uuid = ANY')) {
        const ids = params[0] as string[]
        return { rows: ranking.filter((t) => ids.includes(t.objectID)).map((t) => ({ uuid: t.objectID, source_id: t.account })) }
      }
      const idOf = (i: number) => 100 + i
      if (sql.includes('SELECT id, source_id, uuid')) {
        // light candidate scan: every matching talent, in ranking order, ids only
        return { rows: ranking.map((t, i) => ({ id: idOf(i), source_id: t.account, uuid: t.objectID })) }
      }
      if (sql.includes('WHERE id = ANY')) {
        fullRowReads.push(...(params[0] as number[]))
        const wanted = params[0] as number[]
        return {
          rows: ranking
            .map((t, i) => ({ t, id: idOf(i) }))
            .filter((x) => wanted.includes(x.id))
            .reverse() // the database makes no ordering promise for = ANY; the service must restore ranking order
            .map(({ t, id }) => ({
              id, name: t.name, username: t.username, availability: '40', hourly_rate: 50, job_title: 'Dev', skills: ['ts'], years_of_experience: 3,
            })),
        }
      }
      return { rows: [] }
    }),
  })

  const build = async (opts: { transportImpl?: (p: string, r: any) => Observable<unknown> } = {}) => {
    algoliaCalls = []
    multiCalls = []
    talentDetailCalls = []
    ranking = RANKING
    staleExtras = {}
    fullRowReads = []
    bigIdentity.clear()
    pool = fakePool()
    brokerUrl = 'amqp://test-broker'
    transport = jest.fn(opts.transportImpl ?? ((_p, record) => of(identityReply(record))))
    httpPost = jest.fn()

    const moduleRef = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        SearchService,
        DbFallbackService,
        TalentDiscoveryGateService,
        IdentityVerificationGateClient,
        { provide: AlgoliaClient, useValue: fakeAlgolia },
        { provide: HttpService, useValue: { post: httpPost } },
        { provide: IDENTITY_VERIFICATION_CLIENT, useValue: { send: transport } },
        { provide: 'CATEGORY_CLIENT', useValue: { send: jest.fn(() => of({ categories: [], subcategories: [] })) } },
        {
          provide: ConfigService,
          useValue: { get: (k: string) => (k === 'RABBITMQ_URL' ? brokerUrl : k === 'ML_RERANK_URL' ? 'http://ml' : undefined) },
        },
      ],
    }).compile()
    const db = moduleRef.get(DbFallbackService) as any
    db.pool = pool
    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
  }

  const names = (list: Talent[]) => list.map((t) => t.name)
  const talentHits = (body: any) => (Array.isArray(body.hits) ? body.hits : body.talent.hits)

  beforeEach(async () => {
    // Algolia is intentionally out of scope for G1 (Chris): every request here
    // is answered by the Postgres-backed path.
    algoliaConfigured = false
    fakeAlgolia.search.mockClear()
    fakeAlgolia.multiSearch.mockClear()
    await build()
  })
  afterEach(async () => {
    await app.close()
  })

  describe('viewer is never gated', () => {
    it('an unauthenticated / unverified viewer browses normally: 200, no 403, no verification payload', async () => {
      const res = await request(app.getHttpServer()).get('/search?category=talent&limit=20&page=0')
      expect(res.status).toBe(200)
      expect(JSON.stringify(res.body)).not.toMatch(/VERIFICATION_REQUIRED|missingRequirements|Verify My Account/i)
      expect(res.body.hits.length).toBeGreaterThan(0)
    })

    it('asks identity only about talent accounts - never about the viewer', async () => {
      await request(app.getHttpServer())
        .get('/search?category=talent&limit=20&page=0')
        .set('Authorization', 'Bearer viewer-token')
        .set('x-user-id', 'viewer-unverified')
      const asked = transport.mock.calls.flatMap(([, record]) => record.data.userIds as string[])
      expect(asked).not.toContain('viewer-unverified')
      expect(asked.every((id) => id.startsWith('acct-'))).toBe(true)
    })
  })

  describe('database fallback has no scan ceiling (regression: more than 2,300 candidates, hidden first)', () => {
    const HIDDEN_FIRST = 2350
    const VISIBLE_AFTER = 130
    beforeEach(() => {
      algoliaConfigured = false
      ranking = [
        ...Array.from({ length: HIDDEN_FIRST }, (_, i) => {
          const t = { ...T(1000 + i, CLOSED(i % 2 ? 'identity' : 'both')), name: `HiddenTalent${i}`, username: `hid${i}` }
          bigIdentity.set(t.account!, i % 2 ? CLOSED('identity') : CLOSED('both'))
          return t
        }),
        ...Array.from({ length: VISIBLE_AFTER }, (_, i) => {
          const t = { ...T(9000 + i, OPEN), name: `VisibleTalent${i}`, username: `vis${i}` }
          bigIdentity.set(t.account!, OPEN)
          return t
        }),
      ]
    })

    it('the visible total is exact and every page is a slice of the visible list', async () => {
      const pages = []
      for (let p = 0; p < 4; p++) pages.push((await request(app.getHttpServer()).get(`/search?category=talent&limit=50&page=${p}`)).body)
      for (const b of pages) {
        expect(b.fallback).toBe(true)
        expect(b.nbHits).toBe(VISIBLE_AFTER)
        expect(b.nbPages).toBe(3)
      }
      expect(pages.map((b) => b.hits.length)).toEqual([50, 50, 30, 0])
      expect(pages.flatMap((b) => b.hits.map((h: any) => h.username))).toEqual(Array.from({ length: VISIBLE_AFTER }, (_, i) => `vis${i}`))
    })

    it('hidden talent rows are never read in full - only the requested page of visible talent', async () => {
      const res = await request(app.getHttpServer()).get('/search?category=talent&limit=20&page=1')
      expect(fullRowReads).toHaveLength(20)
      expect(JSON.stringify(res.body)).not.toMatch(/HiddenTalent|hid\d|big|acct-1\d{3}\b/)
    })

    it('asks identity in batches of at most 100 (never once per talent)', async () => {
      await request(app.getHttpServer()).get('/search?category=talent&limit=20&page=0')
      const asked = transport.mock.calls.reduce((n, [, r]) => n + r.data.userIds.length, 0)
      expect(asked).toBe(HIDDEN_FIRST + VISIBLE_AFTER)
      expect(transport.mock.calls.every(([, r]) => r.data.userIds.length <= 100)).toBe(true)
      expect(transport).toHaveBeenCalledTimes(Math.ceil((HIDDEN_FIRST + VISIBLE_AFTER) / 100))
    })

    it('category=all reports the same exact talent total', async () => {
      const res = await request(app.getHttpServer()).get('/search?category=all&limit=20&page=0')
      expect(res.body.talent.nbHits).toBe(VISIBLE_AFTER)
      expect(res.body.talent.hits.map((h: any) => h.username)).toEqual(Array.from({ length: 20 }, (_, i) => `vis${i}`))
    })

    it('a gate failure partway through the scan returns no talent and reads no full rows', async () => {
      let n = 0
      transport.mockImplementation((_p: string, r: any) => (++n === 12 ? throwError(() => new Error('down')) : of(identityReply(r))))
      const res = await request(app.getHttpServer()).get('/search?category=talent&limit=20&page=0')
      expect(res.body.hits).toEqual([])
      expect(res.body.nbHits).toBe(0)
      expect(fullRowReads).toEqual([])
    })
  })

  describe('database fallback', () => {
    beforeEach(() => {
      algoliaConfigured = false
    })

    it('gates the fallback too: visible only, in order, totals and pages over visible talent', async () => {
      const p0 = await request(app.getHttpServer()).get('/search?category=talent&limit=3&page=0')
      const p2 = await request(app.getHttpServer()).get('/search?category=talent&limit=3&page=2')
      expect(p0.body.hits.map((h: any) => h.name)).toEqual(names(VISIBLE.slice(0, 3)))
      expect(p0.body.nbHits).toBe(7)
      expect(p0.body.nbPages).toBe(3)
      expect(p2.body.hits.map((h: any) => h.name)).toEqual(names(VISIBLE.slice(6)))
      expect(p0.body.fallback).toBe(true)
    })

    it('hidden information and the gate account id are absent from every field', async () => {
      const res = await request(app.getHttpServer()).get('/search?category=talent&limit=20&page=0')
      const raw = JSON.stringify(res.body)
      for (const t of HIDDEN) for (const v of [t.name, t.username, t.account, t.objectID]) expect(raw).not.toContain(String(v))
      expect(raw).not.toContain('acct-')
      expect(raw).not.toContain('source_id')
      expect(raw).not.toContain('cms-')
    })

    it('a profile with no source_id and an unknown uuid is hidden', async () => {
      ranking = [T(60, OPEN, null), T1]
      const res = await request(app.getHttpServer()).get('/search?category=talent&limit=20&page=0')
      expect(res.body.hits.map((h: any) => h.name)).toEqual([T1.name])
    })

    it('identity failure -> empty page', async () => {
      await app.close()
      await build({ transportImpl: () => throwError(() => new Error('down')) })
      algoliaConfigured = false
      const res = await request(app.getHttpServer()).get('/search?category=talent&limit=20&page=0')
      expect(res.body.hits).toEqual([])
      expect(res.body.nbHits).toBe(0)
    })

    it('category=all fallback gates its talent section only', async () => {
      const res = await request(app.getHttpServer()).get('/search?category=all&limit=20&page=0')
      expect(res.body.talent.hits.map((h: any) => h.name)).toEqual(names(VISIBLE))
    })
  })
})
