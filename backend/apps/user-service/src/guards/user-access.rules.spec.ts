import { evaluateUserAccess, requestsAdminRole } from './user-access.rules'

const CALLER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'

const check = (over: Partial<Parameters<typeof evaluateUserAccess>[0]> = {}) =>
  evaluateUserAccess({ callerId: CALLER, method: 'PATCH', path: '/users/' + CALLER, ...over })

describe('user access rules', () => {
  it('allows a user editing their own record', () => {
    expect(check({ targetId: CALLER, body: { bio: 'hello' } }).violation).toBeNull()
  })

  it("flags a user editing someone else's record", () => {
    const r = check({ targetId: OTHER, path: '/users/' + OTHER })
    expect(r.violation).toBe('cross-user')
    expect(r.reason).toContain(OTHER)
  })

  it('flags an attempt to set role=ADMIN, even on the caller’s own record', () => {
    expect(check({ targetId: CALLER, body: { role: 'ADMIN' } }).violation).toBe('role-escalation')
    expect(check({ targetId: OTHER, body: { role: 'admin' } }).violation).toBe('role-escalation')
    expect(check({ targetId: CALLER, body: { role: ' Admin ' } }).violation).toBe('role-escalation')
  })

  it('leaves the ordinary profile roles alone', () => {
    expect(check({ targetId: CALLER, body: { role: 'TALENT' } }).violation).toBeNull()
    expect(check({ targetId: CALLER, body: { role: 'CLIENT' } }).violation).toBeNull()
  })

  it('reports role escalation ahead of ownership, so self-escalation is still seen', () => {
    expect(check({ targetId: OTHER, body: { role: 'ADMIN' } }).violation).toBe('role-escalation')
  })

  it('flags listing every user', () => {
    expect(check({ method: 'GET', path: '/users', targetId: undefined }).violation).toBe('list-all')
    expect(check({ method: 'GET', path: '/users/', targetId: undefined }).violation).toBe('list-all')
  })

  it('does not flag a single-user read of the caller', () => {
    expect(check({ method: 'GET', path: '/users/' + CALLER, targetId: CALLER }).violation).toBeNull()
  })

  it('does nothing when there is no verified caller (public or unguarded route)', () => {
    expect(evaluateUserAccess({ method: 'PATCH', path: '/users/' + OTHER, targetId: OTHER }).violation).toBeNull()
  })

  it('flags any attempt to set the security role column', () => {
    expect(check({ targetId: CALLER, body: { platformRole: 'admin' } }).violation).toBe('role-escalation')
    expect(check({ targetId: CALLER, body: { platformRole: 'support' } }).violation).toBe('role-escalation')
    expect(check({ targetId: CALLER, body: { platform_role: 'admin' } }).violation).toBe('role-escalation')
  })

  it('requestsAdminRole only matches the admin value', () => {
    expect(requestsAdminRole({ role: 'ADMIN' })).toBe(true)
    expect(requestsAdminRole({ role: 'TALENT' })).toBe(false)
    expect(requestsAdminRole({})).toBe(false)
    expect(requestsAdminRole(undefined)).toBe(false)
    expect(requestsAdminRole({ role: 42 as unknown as string })).toBe(false)
  })
})
