import 'reflect-metadata'
import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { InternalServerErrorException } from '@nestjs/common'
import { CreateTalentGateState1799500000000 } from '../migrations/1799500000000-CreateTalentGateState'
import { TalentGateStateConsumer, USER_GATE_QUEUE, GATE_CHANGED_PATTERN } from './talent-gate-state.consumer'
import { TALENT_GATE_STATE_TABLE, TalentGateStateService, openTalentSql, openTalentTextSql } from './talent-gate-state.service'

// G1: the last known gate of every talent account, kept in user-service's own table and read as a
// SQL semi-join by talent search, browse and recommendations.

const UUID = '20000000-0000-4000-8000-000000000001'
const UUID2 = '20000000-0000-4000-8000-000000000002'

describe('the discovery predicate', () => {
  it('is a semi-join (EXISTS) restricted to KNOWN OPEN accounts - never a join, so it cannot duplicate or add rows', () => {
    for (const sql of [openTalentSql('u.id'), openTalentTextSql('p.sourceId')]) {
      expect(sql).toMatch(/^EXISTS \(SELECT 1 FROM user_service\.talent_gate_state g WHERE /)
      expect(sql).toContain('g."gateOpen" = true')
      expect(sql).not.toMatch(/\bJOIN\b/i)
    }
    expect(openTalentSql('u.id')).toContain('g."userId" = u.id')
    expect(openTalentTextSql('p.sourceId')).toContain('g."userId"::text = p.sourceId')
  })

  it('an account with no row (state never received) cannot satisfy it: a missing row is "not open"', () => {
    // EXISTS over zero rows is false by definition; the predicate has no OR / COALESCE-to-true branch.
    for (const sql of [openTalentSql('u.id'), openTalentTextSql('p.sourceId')]) {
      expect(sql).not.toMatch(/\bOR\b|COALESCE|NOT EXISTS|IS NULL/i)
    }
  })

  it('names the schema-qualified table the migration creates', () => {
    expect(TALENT_GATE_STATE_TABLE).toBe('user_service.talent_gate_state')
  })
})

describe('TalentGateStateService', () => {
  const make = (rows: any[] = [{ userId: UUID }]) => {
    const query = jest.fn(async () => rows)
    return { service: new TalentGateStateService({ query } as any), query }
  }

  it('records a decision with newer-wins: an older or redelivered decision cannot overwrite a newer one', async () => {
    const { service, query } = make()
    expect(await service.apply(UUID, true, new Date('2026-10-16T10:00:00Z'))).toBe(true)
    const [sql, params] = query.mock.calls[0] as any[]
    expect(sql).toContain('ON CONFLICT ("userId") DO UPDATE')
    expect(sql).toMatch(/WHERE EXCLUDED\."occurredAt" >= user_service\.talent_gate_state\."occurredAt"/)
    expect(params).toEqual([UUID, true, '2026-10-16T10:00:00.000Z'])
  })

  it('reports no change when the decision was not newer (nothing returned)', async () => {
    const { service } = make([])
    expect(await service.apply(UUID, false, new Date('2020-01-01'))).toBe(false)
  })

  it.each([
    ['a non-uuid account', ['not-a-uuid', true, new Date()]],
    ['a non-boolean decision', [UUID, 'yes', new Date()]],
    ['an invalid date', [UUID, true, new Date('nope')]],
  ])('ignores %s without touching the database', async (_l, args) => {
    const { service, query } = make()
    expect(await (service.apply as any)(...args)).toBe(false)
    expect(query).not.toHaveBeenCalled()
  })

  it('applyMany writes a whole batch in ONE statement, skipping malformed ids', async () => {
    const { service, query } = make([{ userId: UUID }, { userId: UUID2 }])
    const n = await service.applyMany(
      [{ userId: UUID, gateOpen: true }, { userId: UUID2, gateOpen: false }, { userId: 'junk', gateOpen: true }],
      new Date('2026-10-16T10:00:00Z'),
    )
    expect(n).toBe(2)
    expect(query).toHaveBeenCalledTimes(1)
    const [sql, params] = query.mock.calls[0] as any[]
    expect(sql).toContain('unnest($1::text[], $2::boolean[])')
    expect(sql).toMatch(/WHERE EXCLUDED\."occurredAt" >= /)
    expect(params[0]).toEqual([UUID, UUID2])
    expect(params[1]).toEqual([true, false])
  })

  it('applyMany with nothing valid does not touch the database', async () => {
    const { service, query } = make()
    expect(await service.applyMany([{ userId: 'junk', gateOpen: true }], new Date())).toBe(0)
    expect(query).not.toHaveBeenCalled()
  })

  it('recognises an unreadable state table by name, and nothing else', () => {
    const { service } = make()
    expect(service.isUnreadable(new Error('relation "user_service.talent_gate_state" does not exist'))).toBe(true)
    expect(service.isUnreadable(new Error('connection refused'))).toBe(false)
  })
})

describe('TalentGateStateConsumer (identity.gate_changed on user_service_gate_queue)', () => {
  const ctx = () => {
    const channel = { ack: jest.fn(), nack: jest.fn() }
    const message = { content: Buffer.from('{}') }
    return { channel, message, context: { getChannelRef: () => channel, getMessage: () => message } as any }
  }
  const good = { userId: UUID, gateOpen: true, occurredAt: '2026-10-16T10:00:00.000Z' }

  it('uses the queue and pattern identity publishes to', () => {
    expect(USER_GATE_QUEUE).toBe('user_service_gate_queue')
    expect(GATE_CHANGED_PATTERN).toBe('identity.gate_changed')
  })

  it('acknowledges only after the decision was written', async () => {
    const apply = jest.fn(async () => true)
    const { channel, message, context } = ctx()
    await new TalentGateStateConsumer({ apply } as any).onGateChanged(good, context)
    expect(apply).toHaveBeenCalledWith(UUID, true, new Date(good.occurredAt))
    expect(channel.ack).toHaveBeenCalledWith(message)
    expect(channel.nack).not.toHaveBeenCalled()
  })

  it('a failed write is requeued, never acknowledged', async () => {
    const apply = jest.fn(async () => {
      throw new InternalServerErrorException('db down')
    })
    const { channel, message, context } = ctx()
    await new TalentGateStateConsumer({ apply } as any).onGateChanged(good, context)
    expect(channel.nack).toHaveBeenCalledWith(message, false, true)
    expect(channel.ack).not.toHaveBeenCalled()
  })

  it.each([[undefined], [{}], [{ ...good, userId: 5 }], [{ ...good, gateOpen: 'true' }], [{ ...good, occurredAt: 'nope' }]])(
    'a malformed message (%j) is acknowledged and dropped, not redelivered forever',
    async (payload) => {
      const apply = jest.fn()
      const { channel, context } = ctx()
      await new TalentGateStateConsumer({ apply } as any).onGateChanged(payload as any, context)
      expect(apply).not.toHaveBeenCalled()
      expect(channel.ack).toHaveBeenCalledTimes(1)
    },
  )
})

describe('migration 1799500000000-CreateTalentGateState', () => {
  const run = async (dir: 'up' | 'down') => {
    const statements: string[] = []
    const q = { query: jest.fn(async (sql: string) => void statements.push(sql.replace(/\s+/g, ' ').trim())) }
    await new CreateTalentGateState1799500000000()[dir](q as any)
    return statements
  }

  it('up: creates the table in the service schema with the account as primary key, and the partial index for the text join', async () => {
    const [table, index] = await run('up')
    expect(table).toContain('CREATE TABLE IF NOT EXISTS "user_service"."talent_gate_state"')
    expect(table).toContain('"userId" uuid NOT NULL')
    expect(table).toContain('PRIMARY KEY ("userId")')
    expect(table).toContain('"gateOpen" boolean NOT NULL')
    expect(index).toContain('CREATE INDEX IF NOT EXISTS "IDX_talent_gate_state_open_text"')
    expect(index).toContain('(("userId"::text))')
    expect(index).toContain('WHERE "gateOpen"')
  })

  it('up creates no foreign key (visibility is a display filter and must never cascade into a profile)', async () => {
    expect((await run('up')).join(' ')).not.toMatch(/FOREIGN KEY|REFERENCES/i)
  })

  it('is additive and reversible: up drops nothing, down removes only what up created', async () => {
    expect((await run('up')).join(' ')).not.toMatch(/DROP|TRUNCATE|DELETE|ALTER/i)
    const down = await run('down')
    expect(down).toEqual([
      'DROP INDEX IF EXISTS "user_service"."IDX_talent_gate_state_open_text"',
      'DROP TABLE IF EXISTS "user_service"."talent_gate_state"',
    ])
  })

  it('is idempotent to re-run (IF NOT EXISTS everywhere)', async () => {
    for (const s of await run('up')) expect(s).toContain('IF NOT EXISTS')
  })

  describe('identifier is unique across every TypeORM migration in the repository', () => {
    const appsDir = join(__dirname, '..', '..', '..')
    const all: Array<{ ts: string; name: string; file: string }> = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        // Real source only: not dependencies, build output, or the vendored scheduling app.
        if (entry === 'node_modules' || entry === 'dist' || entry === 'app' || entry.startsWith('.')) continue
        const full = join(dir, entry)
        const stat = lstatSync(full, { throwIfNoEntry: false })
        if (!stat || stat.isSymbolicLink()) continue
        if (stat.isDirectory()) walk(full)
        else if (/[\\/]migrations[\\/]\d{13}-[A-Za-z0-9]+\.ts$/.test(full)) {
          const m = /(\d{13})-([A-Za-z0-9]+)\.ts$/.exec(full)!
          all.push({ ts: m[1], name: m[2], file: full })
        }
      }
    }
    beforeAll(() => walk(appsDir))

    it('the timestamp is used by no other migration in any service', () => {
      expect(all.filter((m) => m.ts === '1799500000000')).toHaveLength(1)
    })

    it('the class name is used by no other migration', () => {
      expect(all.filter((m) => m.name === 'CreateTalentGateState')).toHaveLength(1)
    })

    it('it sorts after the newest user-service migration that existed before it', () => {
      const userService = all.filter((m) => m.file.includes(`${join('apps', 'user-service')}`) && m.ts !== '1799500000000')
      expect(Math.max(...userService.map((m) => Number(m.ts)))).toBeLessThan(1799500000000)
    })

    it('the file declares the same name and number as its class', () => {
      const src = readFileSync(join(__dirname, '..', 'migrations', '1799500000000-CreateTalentGateState.ts'), 'utf8')
      expect(src).toContain("name = 'CreateTalentGateState1799500000000'")
    })
  })
})
