import 'reflect-metadata'
import { INestApplication, InternalServerErrorException, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { Test } from '@nestjs/testing'
import { of } from 'rxjs'
import * as request from 'supertest'
import { SearchController } from './search.controller'
import { SearchService } from './search.service'
import { AlgoliaClient } from './algolia.client'
import { DbFallbackService } from './db-fallback.service'
import { SearchCategory } from '../dto/search.dto'

// G1, Postgres-backed talent discovery (the Algolia path is covered by algolia.client.gate.spec.ts):
// talent whose gate is not KNOWN OPEN are silently left out of marketplace search results.
//
// The gate is a semi-join INSIDE the SQL (user_service.talent_gate_state), so the COUNT and the
// LIMIT/OFFSET page are both over visible talent. Real controller + real SearchService + real
// DbFallbackService over an Algolia double and a Postgres double. The Postgres double stands in
// for the database: it answers each query from `ranking`, applying the gate only when the SQL
// actually contains the gate predicate - so a query that forgot it would list hidden talent here.
// identity-verification-service is not a dependency of this path: the module has no client for it.

interface Talent {
  objectID: string // CMS profile uuid (what the index is keyed on)
  account: string | null // cms source_id = platform user id
  name: string
  username: string
  avatar_url: string
  open: boolean // the account has a KNOWN OPEN row in talent_gate_state
}

const T = (n: number, open: boolean, account: string | null = `acct-${n}`): Talent => ({
  objectID: `cms-${n}`,
  account,
  name: `Name${n}`,
  username: `user${n}`,
  avatar_url: `https://img.example/${n}.png`,
  open,
})

// Ranking order, best first. Open = verified or grace; the rest are known closed, or never received.
const T1 = T(1, true) // verified
const T2 = T(2, false) // unverified (known closed)
const T3 = T(3, true) // grace period
const T4 = T(4, false) // grace lapsed (known closed)
const T5 = T(5, false) // state never received
const T6 = T(6, true)
const T7 = T(7, true)
const T8 = T(8, false)
const T9 = T(9, true)
const T10 = T(10, true)
const T11 = T(11, true)
const RANKING = [T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11]
const VISIBLE = [T1, T3, T6, T7, T9, T10, T11]
const HIDDEN = [T2, T4, T5, T8]

describe('G1 - marketplace discovery gate (search-service)', () => {
  let app: INestApplication
  let algoliaCalls: Array<{ kind: string; index: string; params: any }>
  let httpPost: jest.Mock
  let pool: { query: jest.Mock; end: jest.Mock } | null
  let ranking: Talent[]
  let fullRowReads: number[]
  let queries: Array<{ kind: 'count' | 'page' | 'detail' | 'facet' | 'other'; gated: boolean; sql: string; params: any[] }>
  let stateUnreadable = false
  const algoliaConfigured = false // every request is answered by the Postgres-backed path

  const idOf = (i: number) => 100 + i
  const accountOf = (t: Talent) => t.account || t.objectID
  const visibleOf = (sql: string): Talent[] => {
    const gated = sql.includes('talent_gate_state')
    return gated ? ranking.filter((t) => t.open) : ranking
  }

  const fakeAlgolia = {
    get isConfigured() {
      return algoliaConfigured
    },
    search: jest.fn(async (index: string, _q: string, params: any = {}) => {
      algoliaCalls.push({ kind: 'search', index, params })
      return { hits: [{ objectID: `${index}-1`, title: `${index} one` }], nbHits: 1, page: 0, nbPages: 1 }
    }),
    multiSearch: jest.fn(async (qs: any[]) => qs.map((q) => ({ hits: [{ objectID: `${q.indexName}-1`, title: `${q.indexName} one` }], nbHits: 1, page: 0, nbPages: 1 }))),
    setSettings: jest.fn(),
  }

  const fakePool = () => ({
    end: jest.fn(),
    query: jest.fn(async (sql: string, params: any[] = []) => {
      if (sql.includes('information_schema.columns')) return { rows: [{ column_name: 'name' }] }
      const gated = sql.includes('talent_gate_state')
      if (gated && stateUnreadable) throw new InternalServerErrorException('relation "user_service.talent_gate_state" does not exist')

      if (sql.includes('COUNT(*)::int AS n FROM cms.talent_profiles')) {
        queries.push({ kind: 'count', gated, sql, params })
        return { rows: [{ n: visibleOf(sql).length }] }
      }
      if (/SELECT id FROM cms\.talent_profiles/.test(sql)) {
        queries.push({ kind: 'page', gated, sql, params })
        const limit = params[params.length - 2] as number
        const offset = params[params.length - 1] as number
        const rows = visibleOf(sql)
        return { rows: rows.slice(offset, offset + limit).map((t) => ({ id: idOf(ranking.indexOf(t)) })) }
      }
      if (sql.includes('WHERE id = ANY')) {
        queries.push({ kind: 'detail', gated, sql, params })
        fullRowReads.push(...(params[0] as number[]))
        const wanted = params[0] as number[]
        return {
          rows: ranking
            .map((t, i) => ({ t, id: idOf(i) }))
            .filter((x) => wanted.includes(x.id))
            .reverse() // the database makes no ordering promise for = ANY; the service must restore ranking order
            .map(({ t, id }) => ({ id, name: t.name, username: t.username, availability: '40', hourly_rate: 50, job_title: 'Dev', skills: ['ts'], years_of_experience: 3 })),
        }
      }
      if (sql.includes('btrim(c.')) {
        queries.push({ kind: 'facet', gated, sql, params })
        const rows = visibleOf(sql)
        return { rows: rows.length ? [{ name: 'Developer', usage_count: rows.length }] : [] }
      }
      queries.push({ kind: 'other', gated, sql, params })
      return { rows: [] }
    }),
  })

  const build = async () => {
    algoliaCalls = []
    ranking = RANKING
    fullRowReads = []
    queries = []
    stateUnreadable = false
    pool = fakePool()
    httpPost = jest.fn()

    const moduleRef = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        SearchService,
        DbFallbackService,
        { provide: AlgoliaClient, useValue: fakeAlgolia },
        { provide: HttpService, useValue: { post: httpPost } },
        { provide: 'CATEGORY_CLIENT', useValue: { send: jest.fn(() => of({ categories: [], subcategories: [] })) } },
        { provide: ConfigService, useValue: { get: (k: string) => (k === 'ML_RERANK_URL' ? 'http://ml' : undefined) } },
      ],
    }).compile()
    const db = moduleRef.get(DbFallbackService) as any
    db.pool = pool
    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
  }

  const names = (list: Talent[]) => list.map((t) => t.name)
  const get = (qs: string) => request(app.getHttpServer()).get(`/search?${qs}`)

  beforeEach(async () => {
    fakeAlgolia.search.mockClear()
    fakeAlgolia.multiSearch.mockClear()
    await build()
  })
  afterEach(async () => {
    await app.close()
  })

  describe('viewer is never gated', () => {
    it('an unauthenticated / unverified viewer browses normally: 200, no 403, no verification payload', async () => {
      const res = await get('category=talent&limit=20&page=0')
      expect(res.status).toBe(200)
      expect(JSON.stringify(res.body)).not.toMatch(/VERIFICATION_REQUIRED|missingRequirements|Verify My Account/i)
      expect(res.body.hits.length).toBeGreaterThan(0)
    })

    it('the viewer plays no part: the same results with or without credentials', async () => {
      const anon = await get('category=talent&limit=20&page=0')
      const viewer = await get('category=talent&limit=20&page=0').set('Authorization', 'Bearer viewer-token').set('x-user-id', 'viewer-unverified')
      expect(viewer.body).toEqual(anon.body)
      expect(JSON.stringify(queries.map((q) => q.params))).not.toContain('viewer-unverified')
    })
  })

  describe('the gate is inside the query', () => {
    it('the COUNT and the page query both carry the gate; the page is bounded by LIMIT/OFFSET', async () => {
      await get('category=talent&limit=3&page=1')
      const count = queries.find((q) => q.kind === 'count')!
      const page = queries.find((q) => q.kind === 'page')!
      expect(count.gated).toBe(true)
      expect(page.gated).toBe(true)
      expect(page.sql).toMatch(/LIMIT \$\d+ OFFSET \$\d+/)
      expect(page.params.slice(-2)).toEqual([3, 3])
    })

    it('the predicate is a semi-join on known-open state, keyed on source_id with the profile uuid as fallback', async () => {
      await get('category=talent&limit=3&page=0')
      const { sql } = queries.find((q) => q.kind === 'count')!
      expect(sql).toContain('EXISTS (SELECT 1 FROM user_service.talent_gate_state g')
      expect(sql).toContain(`g."userId"::text = COALESCE(NULLIF(talent_profiles.source_id::text, ''), talent_profiles.uuid::text)`)
      expect(sql).toContain('g."gateOpen" = true')
      expect(sql).not.toMatch(/\bJOIN\b/i)
    })

    it('no list of every matching talent is ever read: the page query selects ids with a LIMIT, never an unbounded id scan', async () => {
      await get('category=talent&limit=20&page=0')
      for (const q of queries.filter((x) => x.kind === 'page')) expect(q.sql).toMatch(/LIMIT/)
      expect(queries.some((q) => /SELECT id, source_id, uuid/.test(q.sql))).toBe(false)
    })

    it('identity-verification-service is not consulted at all', async () => {
      const db = app.get(DbFallbackService) as any
      expect(Object.keys(db).some((k) => /gate/i.test(k))).toBe(false)
    })
  })

  describe('results, totals and pages over visible talent only', () => {
    it('visible only, in ranking order, with exact totals and page counts', async () => {
      const p0 = await get('category=talent&limit=3&page=0')
      const p2 = await get('category=talent&limit=3&page=2')
      expect(p0.body.hits.map((h: any) => h.name)).toEqual(names(VISIBLE.slice(0, 3)))
      expect(p0.body.nbHits).toBe(7)
      expect(p0.body.nbPages).toBe(3)
      expect(p2.body.hits.map((h: any) => h.name)).toEqual(names(VISIBLE.slice(6)))
      expect(p0.body.fallback).toBe(true)
    })

    it('a page past the end is empty but keeps the exact total', async () => {
      const res = await get('category=talent&limit=3&page=9')
      expect(res.body.hits).toEqual([])
      expect(res.body.nbHits).toBe(7)
      expect(queries.filter((q) => q.kind === 'page')).toHaveLength(0) // no page query for an empty range
    })

    it('hidden information and the gate account id are absent from every field', async () => {
      const res = await get('category=talent&limit=20&page=0')
      const raw = JSON.stringify(res.body)
      for (const t of HIDDEN) for (const v of [t.name, t.username, t.account, t.objectID]) expect(raw).not.toContain(String(v))
      expect(raw).not.toContain('acct-')
      expect(raw).not.toContain('source_id')
      expect(raw).not.toContain('cms-')
    })

    it('a profile with no source_id is keyed on its uuid; with no open row for it, it is hidden', async () => {
      ranking = [T(60, false, null), T1]
      const res = await get('category=talent&limit=20&page=0')
      expect(res.body.hits.map((h: any) => h.name)).toEqual([T1.name])
      expect(accountOf(ranking[0])).toBe('cms-60')
    })

    it('a lapse or restore is visible on the very next request', async () => {
      T3.open = false
      try {
        expect((await get('category=talent&limit=20&page=0')).body.nbHits).toBe(6)
      } finally {
        T3.open = true
      }
      expect((await get('category=talent&limit=20&page=0')).body.nbHits).toBe(7)
    })

    it('all hidden -> an empty page with total 0', async () => {
      ranking = HIDDEN
      const res = await get('category=talent&limit=20&page=0')
      expect(res.body.hits).toEqual([])
      expect(res.body.nbHits).toBe(0)
    })

    it('category=all gates its talent section only', async () => {
      const res = await get('category=all&limit=20&page=0')
      expect(res.body.talent.hits.map((h: any) => h.name)).toEqual(names(VISIBLE))
    })
  })

  describe('facet counts', () => {
    it('the sidebar job-title count includes only talent with a known open gate', async () => {
      const db = app.get(DbFallbackService)
      const counts = await db.arrayValueCounts(SearchCategory.TALENT, 'job_title')
      const facet = queries.find((q) => q.kind === 'facet')!
      expect(facet.gated).toBe(true)
      expect(facet.sql).toContain('EXISTS (SELECT 1 FROM user_service.talent_gate_state g')
      expect(facet.sql).toContain(`COALESCE(NULLIF(p.source_id::text, ''), p.uuid::text)`)
      expect(counts).toEqual({ Developer: VISIBLE.length })
    })

    it('other entities keep their own counting (no talent gate in a project facet query)', async () => {
      const db = app.get(DbFallbackService)
      await db.arrayValueCounts(SearchCategory.PROJECTS, 'tags')
      const other = pool!.query.mock.calls.map((c) => c[0] as string).filter((s) => s.includes('listings.project'))
      expect(other.length).toBeGreaterThan(0)
      for (const s of other) expect(s).not.toContain('talent_gate_state')
    })
  })

  describe('large datasets: cost does not grow with the table (regression: 2,300+ hidden first)', () => {
    const HIDDEN_FIRST = 2350
    const VISIBLE_AFTER = 130
    const load = (hidden: number, visible: number) => {
      ranking = [
        ...Array.from({ length: hidden }, (_, i) => ({ ...T(1000 + i, false), name: `HiddenTalent${i}`, username: `hid${i}` })),
        ...Array.from({ length: visible }, (_, i) => ({ ...T(900000 + i, true), name: `VisibleTalent${i}`, username: `vis${i}` })),
      ]
      queries.length = 0
      fullRowReads.length = 0
    }

    it('the visible total is exact and every page is a slice of the visible list', async () => {
      load(HIDDEN_FIRST, VISIBLE_AFTER)
      const pages = []
      for (let p = 0; p < 4; p++) pages.push((await get(`category=talent&limit=50&page=${p}`)).body)
      for (const b of pages) {
        expect(b.fallback).toBe(true)
        expect(b.nbHits).toBe(VISIBLE_AFTER)
        expect(b.nbPages).toBe(3)
      }
      expect(pages.map((b) => b.hits.length)).toEqual([50, 50, 30, 0])
      expect(pages.flatMap((b) => b.hits.map((h: any) => h.username))).toEqual(Array.from({ length: VISIBLE_AFTER }, (_, i) => `vis${i}`))
    })

    it('hidden talent rows are never read in full - only the requested page of visible talent', async () => {
      load(HIDDEN_FIRST, VISIBLE_AFTER)
      const res = await get('category=talent&limit=20&page=1')
      expect(fullRowReads).toHaveLength(20)
      expect(JSON.stringify(res.body)).not.toMatch(/HiddenTalent|hid\d|big|acct-1\d{3}\b/)
    })

    it('database queries per request: one COUNT, one page, one detail - independent of the table size', async () => {
      const shapes: string[] = []
      for (const [hidden, visible] of [[5, 25], [2_000, 25], [60_000, 25]] as const) {
        load(hidden, visible)
        await get('category=talent&limit=20&page=0')
        shapes.push(queries.map((q) => q.kind).join(','))
        expect(fullRowReads).toHaveLength(20)
      }
      expect(shapes).toEqual(['count,page,detail', 'count,page,detail', 'count,page,detail'])
    })

    it('category=all reports the same exact talent total', async () => {
      load(HIDDEN_FIRST, VISIBLE_AFTER)
      const res = await get('category=all&limit=20&page=0')
      expect(res.body.talent.nbHits).toBe(VISIBLE_AFTER)
      expect(res.body.talent.hits.map((h: any) => h.username)).toEqual(Array.from({ length: 20 }, (_, i) => `vis${i}`))
    })
  })

  describe('fails closed', () => {
    it('the state table cannot be read -> an empty page, no full rows, the request still succeeds', async () => {
      stateUnreadable = true
      const res = await get('category=talent&limit=20&page=0')
      expect(res.status).toBe(200)
      expect(res.body.hits).toEqual([])
      expect(res.body.nbHits).toBe(0)
      expect(fullRowReads).toEqual([])
    })

    it('an unrelated database error is not swallowed as "no talent"', async () => {
      pool!.query.mockImplementation(async (sql: string) => {
        if (sql.includes('information_schema.columns')) return { rows: [{ column_name: 'name' }] }
        throw new InternalServerErrorException('connection terminated')
      })
      const res = await get('category=talent&limit=20&page=0')
      // the existing error handling for the fallback decides; it must not pretend the table was unreadable
      expect(JSON.stringify(res.body)).not.toContain('talent_gate_state')
    })
  })
})
