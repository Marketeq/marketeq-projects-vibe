import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AlgoliaClient } from '../sync/algolia.client'
import { SyncService } from '../sync/sync.service'
import { SyncOperation, AlgoliaIndex } from '../dto/sync.dto'
import { GateSyncService, backoffMs } from './gate-sync.service'
import { TalentEventPayload } from '../types/event-payloads'

// G1 - the Algolia side of the marketplace discovery gate. identity-verification
// reports gate changes; they are mirrored onto the talent records as PARTIAL
// updates of `gate_open`. A failed update is retried and becomes observable.

const T0 = Date.parse('2026-10-14T12:00:00.000Z')
const iso = (ms: number) => new Date(ms).toISOString()

function fakeAlgolia() {
  const records = new Map<string, Record<string, any>>() // objectID -> attrs (the "index")
  const a = {
    records,
    failNext: 0,
    // Every write the service makes, so a test can prove none was a delete/replace.
    calls: [] as Array<{ op: string; args: any[] }>,
    findObjectIDs: jest.fn(async (index: string, attr: string, value: string) => {
      a.calls.push({ op: 'find', args: [index, attr, value] })
      if (a.failNext > 0) { a.failNext--; throw new Error('algolia 503') }
      return [...records.entries()].filter(([, r]) => r[attr] === value).map(([id]) => id)
    }),
    partialUpdateBatch: jest.fn(async (index: string, objects: any[], createIfNotExists = false) => {
      a.calls.push({ op: 'partialUpdateBatch', args: [index, objects, createIfNotExists] })
      if (a.failNext > 0) { a.failNext--; throw new Error('algolia 503') }
      for (const o of objects) {
        const cur = records.get(o.objectID)
        if (!cur && !createIfNotExists) continue
        records.set(o.objectID, { ...(cur ?? {}), ...o })
      }
    }),
    partialUpdate: jest.fn(async (index: string, objectID: string, attrs: any, createIfNotExists = false) => {
      a.calls.push({ op: 'partialUpdate', args: [index, objectID, attrs, createIfNotExists] })
      const cur = records.get(objectID)
      if (!cur && !createIfNotExists) return
      records.set(objectID, { ...(cur ?? {}), objectID, ...attrs })
    }),
    upsert: jest.fn(async (...args: any[]) => { a.calls.push({ op: 'upsert', args }) }),
    batchUpsert: jest.fn(async (...args: any[]) => { a.calls.push({ op: 'batchUpsert', args }) }),
    delete: jest.fn(async (...args: any[]) => { a.calls.push({ op: 'delete', args }) }),
    clearIndex: jest.fn(async (...args: any[]) => { a.calls.push({ op: 'clearIndex', args }) }),
  }
  return a
}

const cfg = (env: Record<string, string> = {}) => ({ get: (k: string) => env[k] }) as unknown as ConfigService
const setup = (env: Record<string, string> = {}) => {
  const algolia = fakeAlgolia()
  const gate = new GateSyncService(algolia as unknown as AlgoliaClient, cfg(env))
  const sync = new SyncService(algolia as unknown as AlgoliaClient, gate)
  return { algolia, gate, sync }
}
const seed = (algolia: ReturnType<typeof fakeAlgolia>, objectID: string, accountId: string, extra: Record<string, any> = {}) =>
  algolia.records.set(objectID, { objectID, account_id: accountId, name: 'N', ...extra })

const talentPayload = (over: Partial<TalentEventPayload> = {}): TalentEventPayload => ({
  id: 'cms-1', name: 'N', username: 'u', createdAt: null, headline: null, skills: [], location: null, industries: [],
  categories: [], subcategories: [], hourlyRateMin: null, hourlyRateMax: null, availability: null, languages: [],
  certifications: [], overview: null, tags: [], experienceLevel: null, rating: null, avatarUrl: null, projectHighlights: [],
  country: null, timezone: null, projectsCompleted: null, reviewsCount: null, clientSuccessRate: null, yearsOfExperience: null,
  ...over,
})

describe('G1 gate sync - verification changes are partial updates, never deletes', () => {
  it.each([
    ['approval', true],
    ['verification loss / duplicate-document block / grace expiry', false],
  ])('%s -> writes gate_open=%s only, as a partial update', async (_label, gateOpen) => {
    const { algolia, gate } = setup()
    seed(algolia, 'cms-1', 'acct-1', { gate_open: !gateOpen, skills: ['ts'] })

    await gate.applyGateChange({ userId: 'acct-1', gateOpen, occurredAt: iso(T0) }, T0)

    expect(algolia.records.get('cms-1')).toMatchObject({ gate_open: gateOpen, skills: ['ts'], name: 'N' }) // nothing else touched
    const ops = algolia.calls.map((c) => c.op)
    expect(ops).toEqual(['find', 'partialUpdateBatch'])
    expect(algolia.delete).not.toHaveBeenCalled()
    expect(algolia.upsert).not.toHaveBeenCalled()
    expect(algolia.clearIndex).not.toHaveBeenCalled()
    // An unknown objectID is never created by a gate change.
    expect(algolia.calls.find((c) => c.op === 'partialUpdateBatch')!.args[2]).toBe(false)
  })

  it('finds the record by the account id and updates every record of that account', async () => {
    const { algolia, gate } = setup()
    seed(algolia, 'cms-1', 'acct-1')
    seed(algolia, 'cms-2', 'acct-1')
    seed(algolia, 'cms-3', 'acct-2', { gate_open: true })
    await gate.applyGateChange({ userId: 'acct-1', gateOpen: true, occurredAt: iso(T0) }, T0)
    expect(algolia.records.get('cms-1')!.gate_open).toBe(true)
    expect(algolia.records.get('cms-2')!.gate_open).toBe(true)
    expect(algolia.records.get('cms-3')!.gate_open).toBe(true) // untouched
    expect(algolia.findObjectIDs).toHaveBeenCalledWith(AlgoliaIndex.TALENT, 'account_id', 'acct-1')
  })

  it('an account with no indexed record is not a failure and creates nothing', async () => {
    const { algolia, gate } = setup()
    await gate.applyGateChange({ userId: 'ghost', gateOpen: true, occurredAt: iso(T0) }, T0)
    expect(algolia.records.size).toBe(0)
    expect(gate.getHealth(T0).pending).toBe(0)
  })

  it('ignores an event older than a decision already written, and applies a newer one', async () => {
    const { algolia, gate } = setup()
    seed(algolia, 'cms-1', 'acct-1')
    await gate.applyGateChange({ userId: 'acct-1', gateOpen: true, occurredAt: iso(T0 + 2000) }, T0 + 2000)
    await gate.applyGateChange({ userId: 'acct-1', gateOpen: false, occurredAt: iso(T0 + 1000) }, T0 + 2500) // late and stale
    expect(algolia.records.get('cms-1')!.gate_open).toBe(true)
    await gate.applyGateChange({ userId: 'acct-1', gateOpen: false, occurredAt: iso(T0 + 3000) }, T0 + 3000)
    expect(algolia.records.get('cms-1')!.gate_open).toBe(false)
  })

  it('drops malformed events without touching the index', async () => {
    const { algolia, gate } = setup()
    await gate.applyGateChange({ userId: '', gateOpen: true, occurredAt: iso(T0) } as any)
    await gate.applyGateChange({ userId: 'a', gateOpen: 'yes', occurredAt: iso(T0) } as any)
    await gate.applyGateChange(undefined as any)
    expect(algolia.calls).toHaveLength(0)
  })
})

describe('G1 gate sync - failed updates retry and become observable', () => {
  it('a failed update is kept, retried with backoff, and cleared once it succeeds', async () => {
    const { algolia, gate } = setup()
    seed(algolia, 'cms-1', 'acct-1', { gate_open: true })
    algolia.failNext = 1

    await gate.applyGateChange({ userId: 'acct-1', gateOpen: false, occurredAt: iso(T0) }, T0)
    expect(algolia.records.get('cms-1')!.gate_open).toBe(true) // not applied yet
    expect(gate.getHealth(T0).pending).toBe(1)

    expect(await gate.retryDue(T0 + backoffMs(1) - 1)).toBe(0) // too early
    expect(await gate.retryDue(T0 + backoffMs(1))).toBe(1)
    expect(algolia.records.get('cms-1')!.gate_open).toBe(false)
    expect(gate.getHealth(T0 + backoffMs(1)).pending).toBe(0)
  })

  it('backoff grows and is capped', () => {
    expect(backoffMs(1)).toBe(5000)
    expect(backoffMs(2)).toBe(10000)
    expect(backoffMs(3)).toBe(20000)
    expect(backoffMs(20)).toBe(120000)
  })

  it('keeps retrying while Algolia stays down, and only the newest decision per account is kept', async () => {
    const { algolia, gate } = setup()
    seed(algolia, 'cms-1', 'acct-1')
    algolia.failNext = 99
    await gate.applyGateChange({ userId: 'acct-1', gateOpen: true, occurredAt: iso(T0) }, T0)
    await gate.applyGateChange({ userId: 'acct-1', gateOpen: false, occurredAt: iso(T0 + 1000) }, T0 + 1000)
    expect(gate.getHealth(T0 + 1000).pending).toBe(1)
    await gate.retryDue(T0 + 200_000)
    expect(gate.getHealth(T0 + 200_000).pending).toBe(1)

    algolia.failNext = 0
    await gate.retryDue(T0 + 400_000)
    expect(gate.getHealth(T0 + 400_000).pending).toBe(0)
    expect(algolia.records.get('cms-1')!.gate_open).toBe(false) // the newer decision, not the first
  })

  it('raises an alert once an update has been stuck past the threshold (default five minutes)', async () => {
    const err = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    const { algolia, gate } = setup()
    seed(algolia, 'cms-1', 'acct-1')
    algolia.failNext = 99
    await gate.applyGateChange({ userId: 'acct-1', gateOpen: true, occurredAt: iso(T0) }, T0)

    expect(gate.thresholdMs).toBe(5 * 60 * 1000)
    expect(gate.getHealth(T0 + 4 * 60_000).alert).toBe(false)
    expect(gate.checkAlerts(T0 + 4 * 60_000).alert).toBe(false)
    expect(err).not.toHaveBeenCalled()

    const late = gate.checkAlerts(T0 + 6 * 60_000)
    expect(late.alert).toBe(true)
    expect(late.reasons.join(' ')).toMatch(/oldest unapplied gate update/)
    expect(err).toHaveBeenCalledTimes(1)
    expect(String(err.mock.calls[0][0])).toContain('[gate-sync-alert]')
    err.mockRestore()
  })

  it('the alert threshold is configurable', () => {
    const { gate } = setup({ ALGOLIA_GATE_SYNC_ALERT_THRESHOLD_MS: '30000' })
    expect(gate.thresholdMs).toBe(30000)
  })

  it('records event-to-index lag and alerts when it exceeds the threshold', async () => {
    const { algolia, gate } = setup()
    seed(algolia, 'cms-1', 'acct-1')
    await gate.applyGateChange({ userId: 'acct-1', gateOpen: true, occurredAt: iso(T0) }, T0 + 400_000) // applied 400s later
    const health = gate.getHealth(T0 + 400_000)
    expect(health.lastLagMs).toBe(400_000)
    expect(health.alert).toBe(true)
    expect(health.reasons.join(' ')).toMatch(/lag/)
  })

  it('a healthy, prompt update does not alert', async () => {
    const { algolia, gate } = setup()
    seed(algolia, 'cms-1', 'acct-1')
    await gate.applyGateChange({ userId: 'acct-1', gateOpen: true, occurredAt: iso(T0) }, T0 + 800)
    expect(gate.getHealth(T0 + 800)).toMatchObject({ pending: 0, lastLagMs: 800, alert: false })
  })
})

describe('G1 gate sync - profile syncs never wipe or forge the gate', () => {
  it('a talent profile sync is a partial update (created if absent), never a replace', async () => {
    const { algolia, sync } = setup()
    await sync.syncTalent(talentPayload({ accountId: 'acct-1' }))
    expect(algolia.upsert).not.toHaveBeenCalled()
    const call = algolia.calls.find((c) => c.op === 'partialUpdate')!
    expect(call.args[3]).toBe(true) // createIfNotExists
    expect(call.args[2].account_id).toBe('acct-1')
  })

  it('a profile edit keeps gate_open: it is not part of the written attributes', async () => {
    const { algolia, sync } = setup()
    seed(algolia, 'cms-1', 'acct-1', { gate_open: true })
    await sync.syncTalent(talentPayload({ accountId: 'acct-1', name: 'Renamed' })) // no gateOpen supplied
    expect(algolia.records.get('cms-1')).toMatchObject({ name: 'Renamed', gate_open: true })
    expect(Object.keys(algolia.calls.find((c) => c.op === 'partialUpdate')!.args[2])).not.toContain('gate_open')
  })

  it('a record indexed without any gate state has no gate_open, so it stays hidden', async () => {
    const { algolia, sync } = setup()
    await sync.syncTalent(talentPayload({ accountId: 'acct-9' }))
    expect(algolia.records.get('cms-1')!.gate_open).toBeUndefined()
  })

  it('a profile sync carries the gate decision when the sender obtained one', async () => {
    const { algolia, sync } = setup()
    await sync.syncTalent(talentPayload({ accountId: 'acct-1', gateOpen: true, gateCheckedAt: iso(T0) }))
    expect(algolia.records.get('cms-1')).toMatchObject({ gate_open: true, gate_updated_at: T0, account_id: 'acct-1' })
  })

  it('a gate decision older than one already applied is not written', async () => {
    const { algolia, gate, sync } = setup()
    seed(algolia, 'cms-1', 'acct-1')
    await gate.applyGateChange({ userId: 'acct-1', gateOpen: false, occurredAt: iso(T0 + 5000) }, T0 + 5000)
    await sync.syncTalent(talentPayload({ accountId: 'acct-1', gateOpen: true, gateCheckedAt: iso(T0) })) // stale
    expect(algolia.records.get('cms-1')!.gate_open).toBe(false)
  })

  it('generic sync callers cannot write the gate attributes', async () => {
    const { algolia, sync } = setup()
    await sync.sync({
      index: AlgoliaIndex.TALENT, operation: SyncOperation.UPSERT, objectID: 'cms-1',
      record: { name: 'N', gate_open: true, gate_updated_at: 1, account_id: 'forged' },
    })
    const written = algolia.calls.find((c) => c.op === 'partialUpdate')!.args[2]
    expect(written).toEqual({ name: 'N' })
    expect(algolia.upsert).not.toHaveBeenCalled()
  })

  it('generic batch sync is also partial and strips the gate attributes for talent', async () => {
    const { algolia, sync } = setup()
    await sync.batchSync([
      { index: AlgoliaIndex.TALENT, operation: SyncOperation.UPSERT, objectID: 'cms-1', record: { name: 'N', gate_open: true } },
      { index: AlgoliaIndex.PROJECTS, operation: SyncOperation.UPSERT, objectID: 'p1', record: { title: 'x' } },
    ])
    const talentBatch = algolia.calls.find((c) => c.op === 'partialUpdateBatch')!
    expect(talentBatch.args[1]).toEqual([{ name: 'N', objectID: 'cms-1' }])
    expect(talentBatch.args[2]).toBe(true)
    expect(algolia.batchUpsert).toHaveBeenCalledTimes(1) // other indices keep their behaviour
  })

  it('other indices keep their full-replace behaviour', async () => {
    const { algolia, sync } = setup()
    await sync.sync({ index: AlgoliaIndex.TEAMS, operation: SyncOperation.UPSERT, objectID: 't1', record: { team_name: 'x' } })
    expect(algolia.upsert).toHaveBeenCalledTimes(1)
  })

  it('deleting a talent removes the record', async () => {
    const { algolia, sync } = setup()
    await sync.syncTalent(talentPayload({ id: 'cms-1' }), SyncOperation.DELETE)
    expect(algolia.delete).toHaveBeenCalledWith(AlgoliaIndex.TALENT, 'cms-1')
  })
})

describe('G1 gate sync - backfill / reconcile', () => {
  const entries = [
    { id: 'cms-1', accountId: 'acct-1', gateOpen: true },
    { id: 'cms-2', accountId: 'acct-2', gateOpen: false },
  ]

  it('sets gate_open and account_id on existing records with a partial batch that creates nothing', async () => {
    const { algolia, gate } = setup()
    seed(algolia, 'cms-1', 'old')
    seed(algolia, 'cms-2', 'old')
    const out = await gate.applyBackfill({ entries, checkedAt: iso(T0) })
    expect(out.updated).toBe(2)
    expect(algolia.records.get('cms-1')).toMatchObject({ gate_open: true, account_id: 'acct-1', name: 'N' })
    expect(algolia.records.get('cms-2')).toMatchObject({ gate_open: false, account_id: 'acct-2' })
    expect(algolia.calls.map((c) => c.op)).toEqual(['partialUpdateBatch'])
    expect(algolia.calls[0].args[2]).toBe(false) // createIfNotExists
  })

  it('is repeatable: running it twice leaves the same state', async () => {
    const { algolia, gate } = setup()
    seed(algolia, 'cms-1', 'old')
    await gate.applyBackfill({ entries, checkedAt: iso(T0) })
    const once = JSON.stringify([...algolia.records.entries()])
    await gate.applyBackfill({ entries, checkedAt: iso(T0 + 1) })
    expect(JSON.stringify([...algolia.records.entries()]).replace(/"gate_updated_at":\d+/g, '')).toBe(once.replace(/"gate_updated_at":\d+/g, ''))
  })

  it('does not create records that are not indexed', async () => {
    const { algolia, gate } = setup()
    await gate.applyBackfill({ entries, checkedAt: iso(T0) })
    expect(algolia.records.size).toBe(0)
  })

  it('retries a failing batch, then reports the failure', async () => {
    const { algolia, gate } = setup()
    seed(algolia, 'cms-1', 'old')
    algolia.failNext = 2
    await expect(gate.applyBackfill({ entries, checkedAt: iso(T0) })).resolves.toEqual({ updated: 2 }) // third attempt succeeds
    algolia.failNext = 99
    await expect(gate.applyBackfill({ entries, checkedAt: iso(T0 + 10) })).rejects.toThrow('algolia 503')
  })

  it('does not overwrite a newer decision with an older batch', async () => {
    const { algolia, gate } = setup()
    seed(algolia, 'cms-1', 'acct-1')
    await gate.applyGateChange({ userId: 'acct-1', gateOpen: false, occurredAt: iso(T0 + 9000) }, T0 + 9000)
    await gate.applyBackfill({ entries: [{ id: 'cms-1', accountId: 'acct-1', gateOpen: true }], checkedAt: iso(T0) })
    expect(algolia.records.get('cms-1')!.gate_open).toBe(false)
  })

  it('skips malformed entries', async () => {
    const { algolia, gate } = setup()
    const out = await gate.applyBackfill({ entries: [{ id: '', accountId: 'a', gateOpen: true }, { id: 'x', accountId: 'a' } as any], checkedAt: iso(T0) })
    expect(out.updated).toBe(0)
    expect(algolia.calls).toHaveLength(0)
  })
})
