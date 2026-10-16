import { isRoleAllowed, resolveCallerRole, describeRequest } from './platform-role.core'

describe('platform role core', () => {
  describe('resolveCallerRole', () => {
    it('reads the platformRole claim, case-insensitively', () => {
      expect(resolveCallerRole({ platformRole: 'admin' })).toBe('admin')
      expect(resolveCallerRole({ platformRole: 'ADMIN' })).toBe('admin')
      expect(resolveCallerRole({ platformRole: ' finance ' })).toBe('finance')
    })

    // The regression that matters: `role` is a profile label an ordinary user
    // can set on themselves via UpdateUserDto. If it ever becomes a role
    // source again, editing your own profile grants platform admin.
    it('ignores the writable profile label entirely', () => {
      expect(resolveCallerRole({ role: 'admin' } as any)).toBeUndefined()
      expect(resolveCallerRole({ roles: ['admin'] } as any)).toBeUndefined()
      expect(resolveCallerRole({ platformRole: null, role: 'admin' } as any)).toBeUndefined()
    })

    it('returns undefined when the caller has no security role', () => {
      expect(resolveCallerRole(undefined)).toBeUndefined()
      expect(resolveCallerRole({})).toBeUndefined()
      expect(resolveCallerRole({ platformRole: '   ' })).toBeUndefined()
      expect(resolveCallerRole({ platformRole: null })).toBeUndefined()
    })
  })

  describe('isRoleAllowed', () => {
    it('matches case-insensitively', () => {
      expect(isRoleAllowed('admin', ['ADMIN'])).toBe(true)
      expect(isRoleAllowed('admin', ['support', 'admin'])).toBe(true)
    })

    it('refuses a caller with no role — the current state of every request', () => {
      expect(isRoleAllowed(undefined, ['admin'])).toBe(false)
    })

    it('refuses a role that is not in the list', () => {
      expect(isRoleAllowed('support', ['admin'])).toBe(false)
      expect(isRoleAllowed('talent', ['admin', 'finance'])).toBe(false)
    })

    it('treats an empty requirement list as "any signed-in caller"', () => {
      expect(isRoleAllowed(undefined, [])).toBe(true)
    })
  })

  it('describeRequest strips the query string', () => {
    expect(describeRequest({ method: 'POST', originalUrl: '/v1/payouts/admin?x=1' })).toBe(
      'POST /v1/payouts/admin',
    )
    expect(describeRequest({ url: '/x' })).toBe('? /x')
  })
})
