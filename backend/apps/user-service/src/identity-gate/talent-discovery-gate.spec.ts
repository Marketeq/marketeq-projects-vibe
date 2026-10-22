import 'reflect-metadata'
import { Observable, of, throwError, NEVER } from 'rxjs'
import {
  IdentityVerificationGateClient,
  IdentityVerificationUnavailableError,
  MAX_GATE_CHECK_BATCH,
  MAX_PARALLEL_GATE_CHUNKS,
} from './identity-verification-gate.client'
import { TalentDiscoveryGateService } from './talent-discovery-gate.service'

const OPEN = { gateOpen: true, missingRequirements: 'none' }
const CLOSED = { gateOpen: false, missingRequirements: 'both' }

const clientWith = (send: jest.Mock, broker: string | null = 'amqp://x') =>
  new IdentityVerificationGateClient({ send } as any, { get: (k: string) => (k === 'RABBITMQ_URL' ? broker ?? undefined : undefined) } as any)

const answerFrom = (table: Record<string, any>) =>
  jest.fn((_p: string, record: any) =>
    of({
      decisions: (record.data.userIds as string[]).filter((id) => table[id]).map((id) => ({ userId: id, ...table[id] })),
    }),
  )

describe('IdentityVerificationGateClient.checkGateBatch (G1)', () => {
  it('sends the batch pattern with a TTL equal to the timeout and returns one decision per account', async () => {
    const send = answerFrom({ a: OPEN, b: CLOSED })
    const out = await clientWith(send).checkGateBatch(['a', 'b'])
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0]).toBe('identity_verification.gate_check_batch')
    expect(send.mock.calls[0][1].options.expiration).toBe(3000)
    expect(out.get('a')).toEqual(OPEN)
    expect(out.get('b')).toEqual(CLOSED)
  })

  it('de-duplicates, ignores blanks, and makes no request for nothing to ask', async () => {
    const send = answerFrom({ a: OPEN })
    await clientWith(send).checkGateBatch(['a', 'a', '', '  '])
    expect(send.mock.calls[0][1].data.userIds).toEqual(['a'])
    send.mockClear()
    expect((await clientWith(send).checkGateBatch([])).size).toBe(0)
    expect(send).not.toHaveBeenCalled()
  })

  it(`chunks at ${MAX_GATE_CHECK_BATCH} accounts per request`, async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `u${i}`)
    const send = answerFrom(Object.fromEntries(ids.map((i) => [i, OPEN])))
    const out = await clientWith(send).checkGateBatch(ids)
    expect(send.mock.calls.map(([, r]) => r.data.userIds.length).sort((a, b) => b - a)).toEqual([100, 100, 50])
    expect(out.size).toBe(250)
  })

  it('an account the reply does not mention is absent, not open', async () => {
    const out = await clientWith(answerFrom({ a: OPEN })).checkGateBatch(['a', 'b'])
    expect(out.has('b')).toBe(false)
  })

  it('keeps only the contract fields of a decision', async () => {
    const send = jest.fn(() => of({ decisions: [{ userId: 'a', ...OPEN, secret: 'x', status: 'approved' }] }))
    const out = await clientWith(send).checkGateBatch(['a'])
    expect(out.get('a')).toEqual(OPEN)
  })

  it.each([
    ['undefined reply', undefined],
    ['string reply', 'ok'],
    ['no decisions', {}],
    ['decisions not an array', { decisions: {} }],
    ['null entry', { decisions: [null] }],
    ['entry without userId', { decisions: [{ ...OPEN }] }],
    ['unrequested account', { decisions: [{ userId: 'zzz', ...OPEN }] }],
    ['duplicate account', { decisions: [{ userId: 'a', ...OPEN }, { userId: 'a', ...OPEN }] }],
    ['open but missing requirement', { decisions: [{ userId: 'a', gateOpen: true, missingRequirements: 'identity' }] }],
    ['closed but nothing missing', { decisions: [{ userId: 'a', gateOpen: false, missingRequirements: 'none' }] }],
    ['unknown requirement value', { decisions: [{ userId: 'a', gateOpen: false, missingRequirements: 'wat' }] }],
    ['truthy non-boolean gateOpen', { decisions: [{ userId: 'a', gateOpen: 1, missingRequirements: 'none' }] }],
  ])('malformed reply (%s) throws instead of opening the gate', async (_l, reply) => {
    await expect(clientWith(jest.fn(() => of(reply))).checkGateBatch(['a'])).rejects.toBeInstanceOf(
      IdentityVerificationUnavailableError,
    )
  })

  it('one bad chunk fails the whole call', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `u${i}`)
    let n = 0
    const send = jest.fn((_p: string, record: any) =>
      n++ === 0 ? of('garbage') : of({ decisions: record.data.userIds.map((userId: string) => ({ userId, ...OPEN })) }),
    )
    await expect(clientWith(send).checkGateBatch(ids)).rejects.toBeInstanceOf(IdentityVerificationUnavailableError)
  })

  it(`sends at most ${'$'}{MAX_PARALLEL_GATE_CHUNKS} batch requests at a time`, async () => {
    const ids = Array.from({ length: 100 * (MAX_PARALLEL_GATE_CHUNKS * 2 + 3) }, (_, i) => `u${i}`)
    let inFlight = 0
    let peak = 0
    const send = jest.fn((_p: string, record: any) => {
      inFlight++
      peak = Math.max(peak, inFlight)
      return new Observable((sub) => {
        setTimeout(() => {
          inFlight--
          sub.next({ decisions: record.data.userIds.map((userId: string) => ({ userId, ...OPEN })) })
          sub.complete()
        }, 5)
      })
    })
    const out = await clientWith(send as any).checkGateBatch(ids)
    expect(out.size).toBe(ids.length)
    expect(peak).toBeLessThanOrEqual(MAX_PARALLEL_GATE_CHUNKS)
    expect(send).toHaveBeenCalledTimes(MAX_PARALLEL_GATE_CHUNKS * 2 + 3)
  })

  it('RPC error rejects', async () => {
    await expect(clientWith(jest.fn(() => throwError(() => new Error('x')))).checkGateBatch(['a'])).rejects.toBeInstanceOf(
      IdentityVerificationUnavailableError,
    )
  })

  it('no consumer / timeout rejects after the 3 s bound', async () => {
    const started = Date.now()
    await expect(clientWith(jest.fn(() => NEVER)).checkGateBatch(['a'])).rejects.toBeInstanceOf(IdentityVerificationUnavailableError)
    expect(Date.now() - started).toBeGreaterThanOrEqual(2900)
  }, 10_000)

  it.each([null, '', '   '])('missing broker configuration (%j) rejects without sending', async (broker) => {
    const send = jest.fn()
    await expect(clientWith(send, broker as any).checkGateBatch(['a'])).rejects.toBeInstanceOf(IdentityVerificationUnavailableError)
    expect(send).not.toHaveBeenCalled()
  })

  it('RABBITMQ_URI is preferred over RABBITMQ_URL', async () => {
    const send = answerFrom({ a: OPEN })
    const c = new IdentityVerificationGateClient({ send } as any, { get: (k: string) => (k === 'RABBITMQ_URI' ? 'amqp://uri' : undefined) } as any)
    await expect(c.checkGateBatch(['a'])).resolves.toBeDefined()
  })
})

describe('TalentDiscoveryGateService (G1)', () => {
  const svc = (checkGateBatch: jest.Mock) => new TalentDiscoveryGateService({ checkGateBatch } as any)

  it('visible = affirmatively open only (verified/grace); closed, missing and unanswered are hidden', async () => {
    const batch = jest.fn().mockResolvedValue(new Map([['v', OPEN], ['u', CLOSED]]))
    const { visible, failed } = await svc(batch).evaluate(['v', 'u', 'absent'])
    expect([...visible]).toEqual(['v'])
    expect(failed).toBe(false)
  })

  it.each([
    ['unavailable', () => Promise.reject(new IdentityVerificationUnavailableError())],
    ['unexpected error', () => Promise.reject(new Error('boom'))],
    ['non-error rejection', () => Promise.reject('boom')],
  ])('%s: nobody visible, failed=true, never throws', async (_l, impl) => {
    const out = await svc(jest.fn(impl)).evaluate(['a', 'b'])
    expect(out).toEqual({ visible: new Set(), failed: true })
  })

  it('nothing to evaluate makes no request', async () => {
    const batch = jest.fn()
    expect(await svc(batch).evaluate([null, undefined, ''])).toEqual({ visible: new Set(), failed: false })
    expect(batch).not.toHaveBeenCalled()
  })

  describe('collectVisible', () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({ id: `r${i}`, acct: `a${i}` }))
    const source = (data = rows) => jest.fn(async (offset: number, size: number) => data.slice(offset, offset + size))
    // even-numbered accounts are open
    const gate = () =>
      jest.fn(async (ids: string[]) => new Map(ids.map((id) => [id, Number(id.slice(1)) % 2 === 0 ? OPEN : CLOSED])))

    it('returns the first `wanted` visible rows in source order, scanning further chunks to fill', async () => {
      const fetchChunk = source()
      const batch = gate()
      const out = await svc(batch).collectVisible({ fetchChunk, userIdOf: (r) => r.acct, wanted: 5, chunkSize: 4 })
      expect(out.map((r) => r.id)).toEqual(['r0', 'r2', 'r4', 'r6', 'r8'])
      expect(batch).toHaveBeenCalledTimes(3) // 3 chunks of 4 - one batch each, never one per row
    })

    it('with wanted=Infinity returns every visible row up to the end of the source', async () => {
      const out = await svc(gate()).collectVisible({ fetchChunk: source(), userIdOf: (r) => r.acct, wanted: Infinity, chunkSize: 7 })
      expect(out).toHaveLength(15)
    })

    it('fails closed: a gate failure returns nothing, even if earlier chunks were fine', async () => {
      let calls = 0
      const batch = jest.fn(async (ids: string[]) => {
        if (calls++ === 1) throw new IdentityVerificationUnavailableError()
        return new Map(ids.map((id) => [id, OPEN]))
      })
      const out = await svc(batch).collectVisible({ fetchChunk: source(), userIdOf: (r) => r.acct, wanted: 20, chunkSize: 5 })
      expect(out).toEqual([])
      expect(batch).toHaveBeenCalledTimes(2) // stops asking once identity is not answering
    })

    it('rows with no account id are never visible', async () => {
      const data = [{ id: 'x', acct: null as any }, { id: 'y', acct: 'a0' }]
      const out = await svc(gate()).collectVisible({ fetchChunk: source(data as any), userIdOf: (r: any) => r.acct, wanted: 5, chunkSize: 10 })
      expect(out.map((r: any) => r.id)).toEqual(['y'])
    })

    it('has no scan ceiling: finds visible rows after thousands of hidden ones, and reads each page once', async () => {
      // 2,350 hidden rows first (odd accounts), then 40 visible rows (even accounts)
      const big = [
        ...Array.from({ length: 2350 }, (_, i) => ({ id: `h${i}`, acct: `a${i * 2 + 1}` })),
        ...Array.from({ length: 40 }, (_, i) => ({ id: `v${i}`, acct: `a${i * 2}` })),
      ]
      const fetchChunk = source(big)
      const out = await svc(gate()).collectVisible({ fetchChunk, userIdOf: (r) => r.acct, wanted: 24, chunkSize: 200 })
      expect(out.map((r) => r.id)).toEqual(Array.from({ length: 24 }, (_, i) => `v${i}`))
      const requested = fetchChunk.mock.calls.map(([offset]) => offset)
      expect(requested).toEqual(Array.from({ length: 12 }, (_, i) => i * 200)) // each page exactly once, in order
    })

    it('wanted=Infinity over 5,000 rows returns every visible row (exact count)', async () => {
      const all = Array.from({ length: 5000 }, (_, i) => ({ id: `r${i}`, acct: `a${i}` }))
      const out = await svc(gate()).collectVisible({ fetchChunk: source(all), userIdOf: (r) => r.acct, wanted: Infinity, chunkSize: 500 })
      expect(out).toHaveLength(2500)
    })

    it('an empty source makes no gate request', async () => {
      const batch = gate()
      expect(await svc(batch).collectVisible({ fetchChunk: source([]), userIdOf: (r: any) => r.acct, wanted: 5, chunkSize: 5 })).toEqual([])
      expect(batch).not.toHaveBeenCalled()
    })
  })
})
