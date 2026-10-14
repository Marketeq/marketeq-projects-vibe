import 'reflect-metadata'
import { ConfigService } from '@nestjs/config'
import { AlgoliaClient, TALENT_GATE_FILTER, TalentGateUnavailableError, isTalentIndex, withTalentGate } from './algolia.client'
import { SearchService } from './search.service'
import { SearchCategory } from '../dto/search.dto'

// G1 (Chris, 2026-10-14): the marketplace talent gate is enforced INSIDE Algolia.
// Every talent query carries gate_open:true - both embedded in a secured API key
// generated here from a search-only parent key, and as a filter on the query -
// so hits, pages and facet counts are computed over visible talent only.
//
// `algoliasearch` is replaced by a small in-memory engine that behaves like
// Algolia where it matters here: a secured key's embedded filter is ANDed into
// every query made with it, filters are evaluated before counting/paginating,
// and facet counts are taken over the filtered set.

const APP_ID = 'APP'
const WRITE_KEY = 'WRITE-KEY'
const SEARCH_KEY = 'SEARCH-ONLY-KEY'

interface Rec { objectID: string; gate_open?: boolean; skills: string[]; categories: string[] }
const rec = (n: number, gate: boolean | undefined, skills: string[] = ['ts'], categories: string[] = ['Dev']): Rec => ({
  objectID: `t${n}`, ...(gate === undefined ? {} : { gate_open: gate }), skills, categories,
})

// Ranked best-first. Open: 1,3,6,7,9 ; closed: 2,4,8 ; no gate attribute at all: 5 (not backfilled).
let TALENT: Rec[]
const resetData = () => {
  TALENT = [rec(1, true), rec(2, false, ['go'], ['Ops']), rec(3, true, ['go']), rec(4, false), rec(5, undefined),
    rec(6, true, ['go'], ['Design']), rec(7, true), rec(8, false, ['ts'], ['Design']), rec(9, true, ['ts'], ['Ops'])]
}

// Evaluates `a:"x" AND (b:"y" OR b:"z") AND gate_open:true AND (owner_gate_open:true OR owner_gate_exempt:true)`
// over a record. A missing attribute never equals anything, so `NOT attr:true` is
// true for a record that does not carry the attribute (as in Algolia).
function matches(r: any, filters?: string): boolean {
  if (!filters) return true
  return filters.split(' AND ').every((clause) =>
    clause.replace(/^\(|\)$/g, '').split(' OR ').some((raw) => {
      let term = raw.trim()
      const negate = term.startsWith('NOT ')
      if (negate) term = term.slice(4).trim()
      const m = /^(\w+):(?:"([^"]*)"|(true|false))$/.exec(term)
      if (!m) return false
      const [, attr, str, bool] = m
      const v = r[attr]
      const hit = bool !== undefined ? v === (bool === 'true') : Array.isArray(v) ? v.includes(str) : v === str
      return negate ? !hit : hit
    }),
  )
}

const created: Array<{ key: string; calls: any[] }> = []
const generated: any[] = []

function fakeSearch(this: any, indexName: string, params: any) {
  const embedded: string | undefined = this.embedded
  const eff = [embedded, params.filters].filter(Boolean).join(' AND ')
  const all: any[] = indexName.startsWith('talent') ? TALENT : (global as any).__LISTINGS ?? []
  const hits = all.filter((r) => matches(r, eff))
  const per = params.hitsPerPage ?? 20
  const page = params.page ?? 0
  const facets: Record<string, Record<string, number>> = {}
  for (const f of params.facets ?? []) {
    facets[f] = {}
    for (const h of hits) for (const v of ([] as string[]).concat((h as any)[f] ?? [])) facets[f][v] = (facets[f][v] ?? 0) + 1
  }
  return { hits: hits.slice(page * per, (page + 1) * per), nbHits: hits.length, page, nbPages: Math.ceil(hits.length / per), facets }
}

jest.mock('algoliasearch', () => ({
  algoliasearch: jest.fn((appId: string, key: string) => {
    const embedded = key.startsWith('secured:') ? key.slice('secured:'.length).split('|')[0] : undefined
    const ctx: any = { embedded }
    const calls: any[] = []
    created.push({ key, calls })
    return {
      searchSingleIndex: jest.fn(async ({ indexName, searchParams }: any) => {
        calls.push({ indexName, searchParams })
        return fakeSearch.call(ctx, indexName, searchParams)
      }),
      search: jest.fn(async ({ requests }: any) => {
        calls.push({ multi: requests })
        return { results: requests.map((r: any) => fakeSearch.call(ctx, r.indexName, r)) }
      }),
      generateSecuredApiKey: jest.fn((opts: any) => {
        generated.push(opts)
        if ((global as any).__failKeyGen) throw new Error('no entropy')
        return `secured:${opts.restrictions.filters}|${opts.parentApiKey}`
      }),
      setSettings: jest.fn(),
    }
  }),
}))

const config = (env: Record<string, string | undefined>) => ({ get: (k: string) => env[k] }) as unknown as ConfigService
const make = (env: Record<string, string | undefined> = { ALGOLIA_APP_ID: APP_ID, ALGOLIA_WRITE_API_KEY: WRITE_KEY, ALGOLIA_SEARCH_API_KEY: SEARCH_KEY }) => {
  const c = new AlgoliaClient(config(env))
  c.onModuleInit()
  return c
}
const mainCalls = () => created.find((c) => c.key === WRITE_KEY)!.calls
const securedCalls = () => created.filter((c) => c.key.startsWith('secured:')).flatMap((c) => c.calls)

beforeEach(() => {
  created.length = 0
  generated.length = 0
  ;(global as any).__failKeyGen = false
  resetData()
})

describe('G1 Algolia gate - secured key', () => {
  it('embeds gate_open:true, restricts the key to the talent indices, and expires it', async () => {
    const client = make()
    await client.search('talent', '', {})
    expect(generated).toHaveLength(1)
    const { parentApiKey, restrictions } = generated[0]
    expect(restrictions.filters).toBe('gate_open:true')
    expect(restrictions.filters).toBe(TALENT_GATE_FILTER)
    expect(restrictions.restrictIndices).toEqual(['talent', 'talent_*'])
    expect(restrictions.validUntil).toBeGreaterThan(Math.floor(Date.now() / 1000))
    expect(restrictions.validUntil).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 3600)
    // Derived from the search-only key - never the write/admin key.
    expect(parentApiKey).toBe(SEARCH_KEY)
  })

  it('answers talent queries with the secured key, never the write key', async () => {
    const client = make()
    await client.search('talent', 'x', { hitsPerPage: 3 })
    expect(securedCalls()).toHaveLength(1)
    expect(mainCalls().some((c) => c.indexName === 'talent')).toBe(false)
    const keys = created.map((c) => c.key)
    expect(keys.some((k) => k.startsWith('secured:gate_open:true|SEARCH-ONLY-KEY'))).toBe(true)
  })

  it('reuses the key until shortly before it expires, then renews it', async () => {
    const client = make()
    await client.search('talent', '')
    await client.search('talent', '')
    expect(generated).toHaveLength(1)
    const realNow = Date.now
    Date.now = () => realNow() + 55 * 60 * 1000 // inside the renewal window
    try {
      await client.search('talent', '')
    } finally {
      Date.now = realNow
    }
    expect(generated).toHaveLength(2)
  })

  it('never sends the write key where a talent query is concerned (key not in any talent request)', async () => {
    const client = make()
    await client.search('talent', '')
    await client.multiSearch([{ indexName: 'talent', query: '' }, { indexName: 'projects', query: '' }])
    expect(JSON.stringify(securedCalls())).not.toContain(WRITE_KEY)
  })
})

describe('G1 Algolia gate - fails closed', () => {
  it.each([
    ['no search-only parent key is configured', { ALGOLIA_APP_ID: APP_ID, ALGOLIA_WRITE_API_KEY: WRITE_KEY }],
    ['the parent key is the write/admin key', { ALGOLIA_APP_ID: APP_ID, ALGOLIA_WRITE_API_KEY: WRITE_KEY, ALGOLIA_SEARCH_API_KEY: WRITE_KEY }],
  ])('refuses talent queries when %s, and never uses the unrestricted client', async (_name, env) => {
    const client = make(env)
    await expect(client.search('talent', '')).rejects.toBeInstanceOf(TalentGateUnavailableError)
    await expect(client.search('talent_sort_rating_desc', '')).rejects.toBeInstanceOf(TalentGateUnavailableError)
    await expect(client.multiSearch([{ indexName: 'talent', query: '' }])).rejects.toBeInstanceOf(TalentGateUnavailableError)
    expect(mainCalls()).toHaveLength(0)
    expect(generated).toHaveLength(0)
  })

  it('refuses talent queries when the secured key cannot be created', async () => {
    ;(global as any).__failKeyGen = true
    const client = make()
    await expect(client.search('talent', '')).rejects.toBeInstanceOf(TalentGateUnavailableError)
    expect(mainCalls()).toHaveLength(0)
  })

  it('does not cache a failure: once the key can be created again, talent queries work', async () => {
    ;(global as any).__failKeyGen = true
    const client = make()
    await expect(client.search('talent', '')).rejects.toBeInstanceOf(TalentGateUnavailableError)
    ;(global as any).__failKeyGen = false
    await expect(client.search('talent', '')).resolves.toBeDefined()
  })

  it('a missing key does not break an index that has no gate', async () => {
    const client = make({ ALGOLIA_APP_ID: APP_ID, ALGOLIA_WRITE_API_KEY: WRITE_KEY })
    await expect(client.search('suggestions', '')).resolves.toBeDefined()
    expect(mainCalls()).toHaveLength(1)
  })

  it('SearchService falls back to the (gated) database, never to an unfiltered Algolia query', async () => {
    const algolia = make({ ALGOLIA_APP_ID: APP_ID, ALGOLIA_WRITE_API_KEY: WRITE_KEY })
    const dbFallback = { search: jest.fn(async () => ({ hits: [], nbHits: 0, page: 0, nbPages: 0 })) }
    const svc = new SearchService(algolia, {} as any, config({}), dbFallback as any)
    await svc.search({ q: '', category: SearchCategory.TALENT, limit: 5, page: 0 } as any)
    expect(dbFallback.search).toHaveBeenCalledTimes(1)
    expect(mainCalls()).toHaveLength(0)
  })
})

describe('G1 Algolia gate - the client cannot supply an unrestricted talent query', () => {
  it('withTalentGate always makes the gate the outer AND', () => {
    expect(withTalentGate({})).toEqual({ filters: 'gate_open:true' })
    expect(withTalentGate({ filters: 'skills:"ts"' }).filters).toBe('gate_open:true AND (skills:"ts")')
  })

  it('an injected OR cannot widen the filter back out', async () => {
    const client = make()
    const hostile = 'skills:"x" OR gate_open:false OR skills:"ts"'
    const res: any = await client.search('talent', '', { filters: hostile, hitsPerPage: 50 })
    expect(securedCalls()[0].searchParams.filters).toBe(`gate_open:true AND (${hostile})`)
    // Every hit that comes back is open, whatever the hostile string asked for.
    expect(res.hits.length).toBeGreaterThan(0)
    expect(res.hits.every((h: Rec) => h.gate_open === true)).toBe(true)
  })

  it('a caller-supplied gate_open:false is ANDed with the gate and matches nothing', async () => {
    const client = make()
    const res: any = await client.search('talent', '', { filters: 'gate_open:false' })
    expect(res.nbHits).toBe(0)
  })

  it('applies to every talent replica (sort orders) and to nothing else', async () => {
    const client = make()
    for (const idx of ['talent', 'talent_sort_rating_desc', 'talent_sort_hourly_rate_asc']) {
      expect(isTalentIndex(idx)).toBe(true)
      await client.search(idx, '', {})
    }
    expect(securedCalls().map((c) => c.searchParams.filters)).toEqual(['gate_open:true', 'gate_open:true', 'gate_open:true'])
    for (const idx of ['teams', 'projects', 'services', 'projects_sort_rating_desc']) expect(isTalentIndex(idx)).toBe(false)
    await client.search('suggestions', '', { filters: 'x:"y"' })
    expect(mainCalls().find((c) => c.indexName === 'suggestions')!.searchParams.filters).toBe('x:"y"')
  })

  it('multiSearch gates the talent request, leaves ungated indices alone, and keeps the order', async () => {
    const client = make()
    const out: any[] = await client.multiSearch([
      { indexName: 'suggestions', query: '' },
      { indexName: 'talent', query: '', params: { hitsPerPage: 50 } },
      { indexName: 'other', query: '' },
    ])
    expect(out).toHaveLength(3)
    const talentReq = securedCalls().find((c) => c.multi)!.multi[0]
    expect(talentReq.indexName).toBe('talent')
    expect(talentReq.filters).toBe('gate_open:true')
    expect(out[1].nbHits).toBe(5) // only the open talent
    const otherReqs = mainCalls().find((c) => c.multi)!.multi
    expect(otherReqs.map((r: any) => r.indexName)).toEqual(['suggestions', 'other'])
    expect(otherReqs.every((r: any) => r.filters === undefined)).toBe(true)
  })
})

// G5 (Christopher): a platform-owned listing is visible only while its OWNER's gate
// is known open; a listing with no platform owner only because it is explicitly
// exempt. POSITIVE filter: a record missing both attributes (old / not backfilled)
// is hidden. Same mechanism as talent: a secured key with the gate embedded, per
// index group, so hits/pages/facets only count visible listings.
describe('G5 Algolia gate - listings are visible only with a known open owner or an explicit exemption', () => {
  const FILTER = '(owner_gate_open:true OR owner_gate_exempt:true)'
  const LISTINGS = () => [
    { objectID: 'p1', owner_id: 'o-open', owner_gate_open: true, category: 'Dev' }, // owned, owner known open
    { objectID: 'p2', owner_id: 'o-closed', owner_gate_open: false, category: 'Ops' }, // owned, owner closed
    { objectID: 'p3', owner_gate_exempt: true, category: 'Dev' }, // CMS-authored: explicitly exempt
    { objectID: 'p4', owner_id: 'o-open', owner_gate_open: true, category: 'Ops' },
    { objectID: 'p5', owner_id: 'o-unknown', category: 'Dev' }, // OLD platform-owned record: no attribute -> hidden
    { objectID: 'p6', category: 'Ops' }, // OLD ownerless record, never marked exempt -> hidden
    { objectID: 'p7', owner_gate_exempt: false, owner_gate_open: false, category: 'Dev' }, // explicitly not exempt
  ]

  it('every listing index and replica carries the positive filter, through its own secured key', async () => {
    const client = make()
    for (const idx of ['projects', 'projects_sort_rating_desc', 'services', 'teams']) await client.search(idx, '', {})
    expect(securedCalls().map((c) => c.searchParams.filters)).toEqual(Array(4).fill(FILTER))
    const gens = generated.map((g) => [g.restrictions.filters, g.restrictions.restrictIndices])
    expect(gens).toEqual(
      expect.arrayContaining([
        [FILTER, ['projects', 'projects_*']],
        [FILTER, ['services', 'services_*']],
        [FILTER, ['teams', 'teams_*']],
      ]),
    )
    expect(generated.every((g) => g.parentApiKey === SEARCH_KEY)).toBe(true)
    expect(mainCalls().filter((c) => c.indexName)).toHaveLength(0) // the write key never serves a listing query
  })

  it('the filter is positive: it contains no NOT, so a missing attribute cannot satisfy it', () => {
    expect(FILTER).not.toMatch(/NOT/i)
  })

  it('shows only known-open owners and explicitly exempt records; old records without the attributes are hidden', async () => {
    ;(global as any).__LISTINGS = LISTINGS()
    const client = make()
    const res: any = await client.search('projects', '', { hitsPerPage: 50 })
    expect(res.hits.map((h: any) => h.objectID).sort()).toEqual(['p1', 'p3', 'p4'])
    expect(res.nbHits).toBe(3)
    ;(global as any).__LISTINGS = undefined
  })

  it('an old platform-owned record becomes visible only after it is backfilled with an open owner', async () => {
    ;(global as any).__LISTINGS = LISTINGS()
    const client = make()
    expect((await client.search('projects', '', { hitsPerPage: 50 }) as any).hits.map((h: any) => h.objectID)).not.toContain('p5')
    ;(global as any).__LISTINGS.find((r: any) => r.objectID === 'p5').owner_gate_open = true // backfilled, owner open
    expect((await client.search('projects', '', { hitsPerPage: 50 }) as any).hits.map((h: any) => h.objectID)).toContain('p5')
    ;(global as any).__LISTINGS = undefined
  })

  it('a system-owned / ownerless record is visible only once it carries the explicit exemption', async () => {
    ;(global as any).__LISTINGS = LISTINGS()
    const client = make()
    expect((await client.search('projects', '', { hitsPerPage: 50 }) as any).hits.map((h: any) => h.objectID)).not.toContain('p6')
    ;(global as any).__LISTINGS.find((r: any) => r.objectID === 'p6').owner_gate_exempt = true
    expect((await client.search('projects', '', { hitsPerPage: 50 }) as any).hits.map((h: any) => h.objectID)).toContain('p6')
    ;(global as any).__LISTINGS = undefined
  })

  it('totals, pages and facet counts cover only visible listings', async () => {
    ;(global as any).__LISTINGS = LISTINGS()
    const client = make()
    const res: any = await client.search('projects', '', { hitsPerPage: 2, page: 1, facets: ['category'] })
    expect(res.nbHits).toBe(3)
    expect(res.nbPages).toBe(2)
    expect(res.facets.category).toEqual({ Dev: 2, Ops: 1 }) // hidden records (p2, p5, p6, p7) are not counted
    ;(global as any).__LISTINGS = undefined
  })

  it('a client filter cannot widen it back out', async () => {
    ;(global as any).__LISTINGS = LISTINGS()
    const client = make()
    const hostile = 'category:"Ops" OR owner_gate_open:false OR owner_gate_exempt:false'
    const res: any = await client.search('projects', '', { filters: hostile, hitsPerPage: 50 })
    expect(securedCalls()[0].searchParams.filters).toBe(`${FILTER} AND (${hostile})`)
    expect(res.hits.map((h: any) => h.objectID)).not.toContain('p2')
    expect(res.hits.map((h: any) => h.objectID)).not.toContain('p7')
    ;(global as any).__LISTINGS = undefined
  })

  it('fails closed like talent: no search-only key means no listing query, never an unfiltered one', async () => {
    const client = make({ ALGOLIA_APP_ID: APP_ID, ALGOLIA_WRITE_API_KEY: WRITE_KEY })
    await expect(client.search('projects', '')).rejects.toBeInstanceOf(TalentGateUnavailableError)
    await expect(client.search('services', '')).rejects.toBeInstanceOf(TalentGateUnavailableError)
    await expect(client.search('teams', '')).rejects.toBeInstanceOf(TalentGateUnavailableError)
    expect(mainCalls()).toHaveLength(0)
  })

  it('multiSearch ("all"): each gated index goes through its own gate and the order is kept', async () => {
    ;(global as any).__LISTINGS = LISTINGS()
    const client = make()
    const out: any[] = await client.multiSearch([
      { indexName: 'talent', query: '' },
      { indexName: 'teams', query: '' },
      { indexName: 'projects', query: '', params: { hitsPerPage: 50 } },
      { indexName: 'services', query: '' },
    ])
    expect(out).toHaveLength(4)
    expect(out[0].nbHits).toBe(5) // talent: open only
    expect(out[2].nbHits).toBe(3) // projects: positive filter
    expect(mainCalls().filter((c) => c.multi)).toHaveLength(0)
    ;(global as any).__LISTINGS = undefined
  })

  it('SearchService "all" returns listings from the gated index', async () => {
    ;(global as any).__LISTINGS = LISTINGS()
    const algolia = make()
    const svc = new SearchService(algolia, {} as any, config({}), { search: jest.fn() } as any)
    const result: any = await svc.search({ q: '', category: SearchCategory.ALL, limit: 50, page: 0 } as any)
    expect(result.projects.nbHits).toBe(3)
    ;(global as any).__LISTINGS = undefined
  })
})

describe('G1 Algolia gate - totals, pages and facets come from the filtered set', () => {
  it('nbHits and nbPages count only open talent', async () => {
    const client = make()
    const p0: any = await client.search('talent', '', { hitsPerPage: 2, page: 0 })
    expect(p0.nbHits).toBe(5) // 9 indexed: 5 open, 3 closed, 1 never backfilled
    expect(p0.nbPages).toBe(3)
    expect(p0.hits.map((h: Rec) => h.objectID)).toEqual(['t1', 't3'])
  })

  it('pages never contain a closed or un-backfilled record and run to the exact end', async () => {
    const client = make()
    const seen: string[] = []
    for (let page = 0; page < 3; page++) {
      const res: any = await client.search('talent', '', { hitsPerPage: 2, page })
      seen.push(...res.hits.map((h: Rec) => h.objectID))
    }
    expect(seen).toEqual(['t1', 't3', 't6', 't7', 't9'])
  })

  it('a record with no gate_open attribute is hidden until it is backfilled', async () => {
    const client = make()
    const before: any = await client.search('talent', '', { hitsPerPage: 50 })
    expect(before.hits.map((h: Rec) => h.objectID)).not.toContain('t5')
    TALENT.find((r) => r.objectID === 't5')!.gate_open = true // backfilled
    const after: any = await client.search('talent', '', { hitsPerPage: 50 })
    expect(after.hits.map((h: Rec) => h.objectID)).toContain('t5')
  })

  it('facet counts include only open talent', async () => {
    const client = make()
    const res: any = await client.search('talent', '', { facets: ['categories'], hitsPerPage: 0 })
    // open: t1 Dev, t3 Dev, t6 Design, t7 Dev, t9 Ops  (closed t2 Ops, t4 Dev, t8 Design are not counted)
    expect(res.facets.categories).toEqual({ Dev: 3, Design: 1, Ops: 1 })
  })

  it('filters combined with the gate still count only open talent', async () => {
    const client = make()
    const res: any = await client.search('talent', '', { filters: 'skills:"go"', facets: ['categories'] })
    expect(res.nbHits).toBe(2) // t3 and t6; closed t2 (go) is excluded
    expect(res.facets.categories).toEqual({ Dev: 1, Design: 1 })
  })

  it('SearchService reports exact totals and pages for the talent category', async () => {
    const algolia = make()
    const svc = new SearchService(algolia, {} as any, config({}), { search: jest.fn() } as any)
    const result: any = await svc.search({ q: '', category: SearchCategory.TALENT, limit: 2, page: 1 } as any)
    expect(result.nbHits).toBe(5)
    expect(result.nbPages).toBe(3)
    expect(result.hits.map((h: Rec) => h.objectID)).toEqual(['t6', 't7'])
  })

  it('SearchService "all" returns gated talent beside ungated teams/projects/services', async () => {
    const algolia = make()
    const svc = new SearchService(algolia, {} as any, config({}), { search: jest.fn() } as any)
    const result: any = await svc.search({ q: '', category: SearchCategory.ALL, limit: 50, page: 0 } as any)
    expect(result.talent.nbHits).toBe(5)
    expect(result.projects).toBeDefined()
  })

  it('category values for talent are read from the gated facet', async () => {
    const algolia = make()
    const svc = new SearchService(algolia, {} as any, config({}), { search: jest.fn() } as any)
    const out = await svc.getCategoryValues(SearchCategory.TALENT)
    expect(out.values.sort()).toEqual(['Dev', 'Design', 'Ops'].sort())
  })
})
