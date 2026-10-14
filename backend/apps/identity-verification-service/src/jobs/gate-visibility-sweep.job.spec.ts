import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { GateVisibilitySweepJob } from './gate-visibility-sweep.job'
import { GateChange } from '../gate-index/gate-change-publisher'
import { GRACE_WINDOW_MS } from '../common/gate/account-gate-decision'
import {
  IdentityVerificationStatus as I,
  LocationVerificationStatus as L,
} from '../entities/enums/identity-verification.enums'

// G1: the talent search index must follow gate_open. The sweep re-evaluates every
// profile whose row changed (all write paths bump updated_at) with the SAME
// computeGateState that answers the RPC gate check, publishes only real changes,
// and closes a grace window at its exact expiry instant.

const NOW = Date.parse('2026-10-14T12:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000

interface P {
  userId: string
  identityVerificationStatus: I
  locationVerificationStatus: L
  expiredAt: Date | null
  updatedAt: Date
}
const profile = (userId: string, id: I, loc: L, over: Partial<P> = {}): P => ({
  userId,
  identityVerificationStatus: id,
  locationVerificationStatus: loc,
  expiredAt: null,
  updatedAt: new Date(NOW - 1000),
  ...over,
})
const VERIFIED = (u: string, over: Partial<P> = {}) => profile(u, I.VERIFIED, L.VERIFIED, over)

function setup(initial: P[]) {
  let rows = initial
  const published: GateChange[] = []
  const publisher = { publish: jest.fn(async (c: GateChange) => void published.push(c)) }
  const repo = {
    find: jest.fn(async ({ where }: any) => {
      const w = where
      if (w.updatedAt) {
        const from: Date = w.updatedAt.value
        return rows.filter((r) => r.updatedAt.getTime() >= from.getTime())
      }
      if (w.expiredAt) {
        const [lo, hi]: [Date, Date] = w.expiredAt.value
        return rows.filter((r) => r.expiredAt && r.expiredAt.getTime() >= lo.getTime() && r.expiredAt.getTime() <= hi.getTime())
      }
      return []
    }),
    createQueryBuilder: jest.fn(() => {
      const qb: any = {
        select: () => qb,
        where: (_: string, p: { floor: Date }) => ((qb.floor = p.floor), qb),
        andWhere: () => qb,
        getRawOne: async () => {
          const next = rows
            .filter((r) => r.expiredAt && r.expiredAt > qb.floor && r.identityVerificationStatus !== I.VERIFIED)
            .map((r) => r.expiredAt!.getTime())
          return { next: next.length ? new Date(Math.min(...next)) : null }
        },
      }
      return qb
    }),
  }
  const job = new GateVisibilitySweepJob(repo as any, publisher as any)
  return {
    job,
    published,
    publisher,
    set: (r: P[]) => (rows = r),
    state: () => rows,
  }
}

beforeEach(() => jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined))
afterEach(() => jest.restoreAllMocks())

describe('G1 gate visibility sweep - which changes are published', () => {
  it('approval: a newly verified account is published open', async () => {
    const { job, published } = setup([VERIFIED('a1')])
    await job.sweep(NOW)
    expect(published).toEqual([{ userId: 'a1', gateOpen: true, occurredAt: new Date(NOW - 1000).toISOString() }])
  })

  it('verification loss: an account that was open and is now failed is published closed', async () => {
    const t = setup([VERIFIED('a1')])
    await t.job.sweep(NOW)
    t.set([profile('a1', I.FAILED, L.VERIFIED, { updatedAt: new Date(NOW + 5000) })])
    await t.job.sweep(NOW + 10_000)
    expect(t.published.map((p) => [p.userId, p.gateOpen])).toEqual([['a1', true], ['a1', false]])
  })

  it('duplicate-document block closes the gate', async () => {
    const t = setup([VERIFIED('a1')])
    await t.job.sweep(NOW)
    t.set([profile('a1', I.BLOCKED_DUPLICATE, L.VERIFIED, { updatedAt: new Date(NOW + 1000) })])
    await t.job.sweep(NOW + 2000)
    expect(t.published.at(-1)).toMatchObject({ userId: 'a1', gateOpen: false })
  })

  it('grace-period entry keeps the gate open (verified -> expired, 30 days of grace), so nothing new is published', async () => {
    const t = setup([VERIFIED('a1')])
    await t.job.sweep(NOW)
    t.set([profile('a1', I.EXPIRED, L.VERIFIED, { expiredAt: new Date(NOW + 1000), updatedAt: new Date(NOW + 1000) })])
    await t.job.sweep(NOW + 2000)
    expect(t.published).toHaveLength(1) // the earlier "open"; still open, so no second event
  })

  it('a change older than the restart lookback is left to the periodic reconcile, not re-published', async () => {
    const { job, published } = setup([profile('a1', I.EXPIRED, L.VERIFIED, { expiredAt: new Date(NOW - 5 * DAY), updatedAt: new Date(NOW - 5 * DAY + 10) })])
    await job.sweep(NOW)
    expect(published).toHaveLength(0)
  })

  it('grace entry seen for the first time (e.g. after a restart) is published open', async () => {
    const { job, published } = setup([profile('a1', I.EXPIRED, L.VERIFIED, { expiredAt: new Date(NOW - 60_000), updatedAt: new Date(NOW - 60_000) })])
    await job.sweep(NOW)
    expect(published).toEqual([expect.objectContaining({ userId: 'a1', gateOpen: true })])
  })

  it('a profile that was never verified publishes closed (hidden until it is)', async () => {
    const { job, published } = setup([profile('a1', I.UNSTARTED, L.NOT_VERIFIED)])
    await job.sweep(NOW)
    expect(published).toEqual([expect.objectContaining({ userId: 'a1', gateOpen: false })])
  })

  it('an unchanged decision is not published again on later sweeps', async () => {
    const t = setup([VERIFIED('a1')])
    await t.job.sweep(NOW)
    await t.job.sweep(NOW + 30_000)
    await t.job.sweep(NOW + 60_000)
    expect(t.published).toHaveLength(1)
  })

  it('publishes only the account and the decision - no status, reason, or vendor detail', async () => {
    const { job, published } = setup([profile('a1', I.BLOCKED_DUPLICATE, L.NOT_VERIFIED)])
    await job.sweep(NOW)
    expect(Object.keys(published[0]).sort()).toEqual(['gateOpen', 'occurredAt', 'userId'])
    expect(JSON.stringify(published)).not.toMatch(/blocked|duplicate|verified|failed|expired|status/i)
  })

  it('the decision is the one the RPC gate check gives (verified + location, or grace) - location unverified stays closed', async () => {
    const { job, published } = setup([profile('a1', I.VERIFIED, L.NOT_VERIFIED)])
    await job.sweep(NOW)
    expect(published[0].gateOpen).toBe(false)
  })
})

describe('G1 gate visibility sweep - grace expiry closes visibility at the exact instant', () => {
  it('a grace window that closed since the last sweep is found without any row write', async () => {
    const expiredAt = new Date(NOW - GRACE_WINDOW_MS + 30_000) // closes 30s from NOW
    const t = setup([profile('a1', I.EXPIRED, L.VERIFIED, { expiredAt, updatedAt: new Date(NOW - 40 * DAY) })])
    await t.job.sweep(NOW) // still in grace: open, but outside the lookback -> nothing yet
    expect(t.published).toHaveLength(0)

    await t.job.sweep(NOW + 31_000) // past expired_at + 30 days
    expect(t.published).toEqual([
      { userId: 'a1', gateOpen: false, occurredAt: new Date(expiredAt.getTime() + GRACE_WINDOW_MS).toISOString() },
    ])
  })

  it('arms a timer for the exact closing instant and publishes closed when it fires', async () => {
    jest.useFakeTimers({ now: NOW })
    try {
      const expiredAt = new Date(NOW - GRACE_WINDOW_MS + 90_000) // closes in 90s
      const t = setup([profile('a1', I.EXPIRED, L.VERIFIED, { expiredAt, updatedAt: new Date(NOW - 5000) })])
      await t.job.sweep(NOW)
      expect(t.published).toEqual([expect.objectContaining({ userId: 'a1', gateOpen: true })]) // open during grace

      await jest.advanceTimersByTimeAsync(89_000)
      expect(t.published).toHaveLength(1) // not yet
      await jest.advanceTimersByTimeAsync(2_000) // crosses expired_at + 30 days
      expect(t.published.map((p) => p.gateOpen)).toEqual([true, false])
      t.job.onModuleDestroy()
    } finally {
      jest.useRealTimers()
    }
  })

  it('an account that re-verified before its grace ran out is not closed', async () => {
    const t = setup([VERIFIED('a1', { expiredAt: new Date(NOW - GRACE_WINDOW_MS - 1000), updatedAt: new Date(NOW - 100) })])
    await t.job.sweep(NOW)
    expect(t.published).toEqual([expect.objectContaining({ gateOpen: true })])
  })
})

describe('G1 gate visibility sweep - failures never lose a change', () => {
  it('a failed publish is retried on the next sweep, and accounts already sent are not re-sent', async () => {
    const t = setup([VERIFIED('a1'), VERIFIED('a2')])
    t.publisher.publish.mockImplementationOnce(async () => { throw new Error('broker down') }) // a1 fails
    const first = await t.job.sweep(NOW)
    expect(first).toEqual({ published: 1, failed: 1 })
    expect(t.published.map((p) => p.userId)).toEqual(['a2'])

    const second = await t.job.sweep(NOW + 30_000)
    expect(second).toEqual({ published: 1, failed: 0 })
    expect(t.published.map((p) => p.userId)).toEqual(['a2', 'a1'])
  })

  it('a change made while the broker was down is still published once it is back, however late', async () => {
    const t = setup([VERIFIED('a1', { updatedAt: new Date(NOW - 1000) })])
    t.publisher.publish.mockRejectedValue(new Error('broker down'))
    for (let i = 0; i < 5; i++) await t.job.sweep(NOW + i * 30_000)
    expect(t.published).toHaveLength(0)
    t.publisher.publish.mockImplementation(async (c: GateChange) => void t.published.push(c))
    await t.job.sweep(NOW + 10 * 60_000)
    expect(t.published).toEqual([expect.objectContaining({ userId: 'a1', gateOpen: true })])
  })

  it('a database error is swallowed (logged without detail) and does not stop later sweeps', async () => {
    const t = setup([VERIFIED('a1')])
    const err = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    ;(t.job as any).profiles.find = jest.fn().mockRejectedValueOnce(new Error('connection to db-prod-7 refused'))
    await expect(t.job.sweep(NOW)).resolves.toEqual({ published: 0, failed: 0 })
    expect(JSON.stringify(err.mock.calls)).not.toContain('db-prod-7')
    // find is a plain mock now; the next sweep works again.
    ;(t.job as any).profiles.find = jest.fn(async () => [VERIFIED('a1')])
    await t.job.sweep(NOW + 30_000)
    expect(t.published).toHaveLength(1)
  })

  it('does not run two sweeps at once', async () => {
    const t = setup([VERIFIED('a1')])
    let release!: () => void
    t.publisher.publish.mockImplementationOnce(() => new Promise<undefined>((r) => (release = () => r(undefined))))
    const a = t.job.sweep(NOW)
    await new Promise((r) => setImmediate(r)) // let the first sweep reach its publish
    const b = await t.job.sweep(NOW)
    expect(b).toEqual({ published: 0, failed: 0 })
    release()
    await a
  })

  it('stays off without a broker URL (verification itself is unaffected)', () => {
    const saved = { u: process.env.RABBITMQ_URL, i: process.env.RABBITMQ_URI }
    delete process.env.RABBITMQ_URL
    delete process.env.RABBITMQ_URI
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const t = setup([VERIFIED('a1')])
    t.job.onModuleInit()
    expect(warn).toHaveBeenCalled()
    expect(t.publisher.publish).not.toHaveBeenCalled()
    t.job.onModuleDestroy()
    process.env.RABBITMQ_URL = saved.u
    process.env.RABBITMQ_URI = saved.i
    if (saved.u === undefined) delete process.env.RABBITMQ_URL
    if (saved.i === undefined) delete process.env.RABBITMQ_URI
  })
})
