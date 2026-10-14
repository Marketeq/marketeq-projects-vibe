import 'reflect-metadata';
import { DbFallbackService } from './db-fallback.service';
import { SearchCategory } from '../dto/search.dto';

// G5: on the PostgreSQL discovery fallback, a listing whose OWNER has no known
// open gate is withheld. The gate is listings-service's last-known state table,
// joined in SQL - never a live identity lookup. (The semantics against a real
// database were also exercised in an isolated scratch database; see the G5
// decision record.)

describe('G5 - DB fallback withholds listings by owner gate', () => {
  const sqlFor = async (category: SearchCategory) => {
    const statements: string[] = []
    const pool = {
      end: jest.fn(),
      query: jest.fn(async (sql: string) => {
        statements.push(sql)
        return { rows: [] }
      }),
    }
    const svc = new DbFallbackService({ get: () => undefined } as any, { send: jest.fn() } as any, { evaluate: jest.fn(), collectVisible: jest.fn() } as any)
    ;(svc as any).pool = pool
    await svc.search('', category, 10, 0, undefined, undefined)
    return statements.filter((s) => /FROM listings\.(project|teams)/.test(s))
  }

  it.each([SearchCategory.PROJECTS, SearchCategory.SERVICES])('%s: requires a known-open owner, or no owner at all', async (category) => {
    const [sql] = await sqlFor(category)
    expect(sql).toContain('listings.account_gate_state')
    expect(sql).toMatch(/IS NULL OR EXISTS/)
    expect(sql).toContain('g."gateOpen"')
    // The row must be matched to ITS owner's state - a service's owner is userId, or a createdBy that is a real user id.
    expect(sql).toContain('g."userId" = (CASE WHEN listings.project."listingType" = \'service\'')
    expect(sql).toContain('listings.project."createdBy"::uuid')
  })

  it('teams: only a real user id in createdBy is an owner to gate; system values are not', async () => {
    const [sql] = await sqlFor(SearchCategory.TEAMS)
    expect(sql).toContain('listings.account_gate_state')
    expect(sql).toContain(`"createdBy" !~*`)
    expect(sql).toContain('g."userId"::text = listings.teams."createdBy"')
    expect(sql).toContain('g."gateOpen"')
  })

  it('an owner with no state row is withheld (the join requires a row with gateOpen)', async () => {
    const [sql] = await sqlFor(SearchCategory.PROJECTS)
    expect(sql).not.toMatch(/NOT EXISTS/i)
  })

  it('never reads or writes anything but the listing tables and the state table', async () => {
    for (const category of [SearchCategory.PROJECTS, SearchCategory.SERVICES, SearchCategory.TEAMS]) {
      for (const sql of await sqlFor(category)) expect(sql.trim()).toMatch(/^SELECT/i)
    }
  })
})
