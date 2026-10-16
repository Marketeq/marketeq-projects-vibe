import {
  auditActor,
  auditFromRequest,
  formatAuditLine,
  recordAudit,
  resetAuditSink,
  setAuditSink,
  AuditEvent,
} from './security-audit'

const at = '2026-10-02T12:00:00.000Z'
const base = { actor: 'u1', actorRole: 'admin', action: 'POST /v1/payouts', outcome: 'allowed' as const, at }

describe('security audit', () => {
  afterEach(() => resetAuditSink())

  describe('formatAuditLine', () => {
    it('emits a stable, greppable field order', () => {
      expect(formatAuditLine({ ...base, target: 't1', ip: '1.2.3.4', requestId: 'r1' })).toBe(
        'AUDIT outcome=allowed actor=u1 role=admin action=POST_/v1/payouts target=t1 ip=1.2.3.4 requestId=r1 at=2026-10-02T12:00:00.000Z',
      )
    })

    it('fills absent fields with a placeholder rather than dropping them', () => {
      const line = formatAuditLine(base)
      expect(line).toContain('target=-')
      expect(line).toContain('ip=-')
      expect(line).toContain('requestId=-')
    })

    it('neutralises whitespace and quotes so one event stays one line', () => {
      const line = formatAuditLine({ ...base, actor: 'a b\n"c' })
      expect(line).not.toMatch(/[\n"]/)
      expect(line.split(' ').filter((p) => p.startsWith('actor=')).length).toBe(1)
    })

    it('truncates an over-long value', () => {
      const line = formatAuditLine({ ...base, reason: 'x'.repeat(500) })
      expect(line.length).toBeLessThan(500)
      expect(line).toContain('…')
    })
  })

  describe('recordAudit', () => {
    it('passes the event to a registered sink, with a timestamp filled in', () => {
      const seen: AuditEvent[] = []
      setAuditSink((e) => { seen.push(e) })
      recordAudit({ actor: 'u1', actorRole: 'admin', action: 'DELETE /x', outcome: 'denied' })
      expect(seen).toHaveLength(1)
      expect(seen[0].at).toEqual(expect.any(String))
      expect(new Date(seen[0].at).toString()).not.toBe('Invalid Date')
    })

    // The property that matters most: auditing must never break the action.
    it('does not throw when the sink throws synchronously', () => {
      setAuditSink(() => { throw new Error('db down') })
      expect(() => recordAudit({ ...base })).not.toThrow()
    })

    it('does not reject when the sink rejects', async () => {
      setAuditSink(() => Promise.reject(new Error('db down')))
      expect(() => recordAudit({ ...base })).not.toThrow()
      await new Promise((r) => setTimeout(r, 10))
    })

    it('works with no sink at all — stdout only', () => {
      expect(() => recordAudit({ ...base })).not.toThrow()
    })
  })

  describe('auditActor', () => {
    it('names the signed-in caller and their role', () => {
      expect(auditActor({ user: { sub: 'u1', platformRole: 'admin' } }))
        .toEqual({ actor: 'u1', actorRole: 'admin' })
    })

    it('accepts userId as well as sub', () => {
      expect(auditActor({ user: { userId: 'u2' } })).toEqual({ actor: 'u2', actorRole: 'none' })
    })

    it('distinguishes an internal service call from an anonymous one', () => {
      expect(auditActor({ headers: { 'x-internal-token': 'secret' } }).actor).toBe('service:internal-token')
      expect(auditActor({ headers: {} }).actor).toBe('anonymous')
    })
  })

  describe('auditFromRequest', () => {
    it('derives action, target and ip from the request', () => {
      const seen: AuditEvent[] = []
      setAuditSink((e) => { seen.push(e) })
      auditFromRequest(
        {
          user: { sub: 'u1', platformRole: 'finance' },
          method: 'PATCH',
          originalUrl: '/v1/users/u9?expand=1',
          params: { id: 'u9' },
          ip: '9.9.9.9',
          headers: { 'x-request-id': 'req-7' },
        },
        { outcome: 'denied', reason: 'cross-user' },
      )
      expect(seen[0]).toMatchObject({
        actor: 'u1',
        actorRole: 'finance',
        action: 'PATCH /v1/users/u9',
        target: 'u9',
        outcome: 'denied',
        reason: 'cross-user',
        ip: '9.9.9.9',
        requestId: 'req-7',
      })
    })
  })
})
