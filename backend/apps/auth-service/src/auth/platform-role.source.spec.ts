import {
  parseRoleAssignments,
  resolvePlatformRole,
  resetPlatformRoleCache,
} from './platform-role.source'

const ADMIN_ID = '11111111-1111-1111-1111-111111111111'
const FINANCE_ID = '22222222-2222-2222-2222-222222222222'

describe('platform role source', () => {
  const original = process.env.PLATFORM_ROLE_ASSIGNMENTS

  beforeEach(() => {
    resetPlatformRoleCache()
    delete process.env.PLATFORM_ROLE_ASSIGNMENTS
  })

  afterAll(() => {
    if (original === undefined) delete process.env.PLATFORM_ROLE_ASSIGNMENTS
    else process.env.PLATFORM_ROLE_ASSIGNMENTS = original
  })

  describe('parseRoleAssignments', () => {
    it('parses a list of id:role pairs, ignoring whitespace', () => {
      const parsed = parseRoleAssignments(` ${ADMIN_ID}:admin , ${FINANCE_ID} : Finance `)
      expect(parsed.get(ADMIN_ID)).toBe('admin')
      expect(parsed.get(FINANCE_ID)).toBe('finance')
    })

    it('returns an empty map for absent or blank config', () => {
      expect(parseRoleAssignments(undefined).size).toBe(0)
      expect(parseRoleAssignments('   ').size).toBe(0)
    })

    it('drops entries with an unknown role rather than granting it', () => {
      const parsed = parseRoleAssignments(`${ADMIN_ID}:superuser,${FINANCE_ID}:finance`)
      expect(parsed.has(ADMIN_ID)).toBe(false)
      expect(parsed.get(FINANCE_ID)).toBe('finance')
    })

    it('drops malformed entries without taking the rest down', () => {
      const parsed = parseRoleAssignments(`not-a-pair,:admin,${ADMIN_ID}:,${FINANCE_ID}:admin`)
      expect(parsed.size).toBe(1)
      expect(parsed.get(FINANCE_ID)).toBe('admin')
    })
  })

  describe('resolvePlatformRole', () => {
    it('gives nobody a role when the variable is unset', () => {
      expect(resolvePlatformRole(ADMIN_ID)).toBeUndefined()
    })

    it('gives the listed account its role and nobody else one', () => {
      process.env.PLATFORM_ROLE_ASSIGNMENTS = `${ADMIN_ID}:admin`
      expect(resolvePlatformRole(ADMIN_ID)).toBe('admin')
      expect(resolvePlatformRole(FINANCE_ID)).toBeUndefined()
    })

    it('matches the user id exactly — no prefix or partial match', () => {
      process.env.PLATFORM_ROLE_ASSIGNMENTS = `${ADMIN_ID}:admin`
      expect(resolvePlatformRole(ADMIN_ID.slice(0, 8))).toBeUndefined()
      expect(resolvePlatformRole(`${ADMIN_ID}x`)).toBeUndefined()
    })

    it('handles a missing user id', () => {
      process.env.PLATFORM_ROLE_ASSIGNMENTS = `${ADMIN_ID}:admin`
      expect(resolvePlatformRole(undefined)).toBeUndefined()
      expect(resolvePlatformRole('')).toBeUndefined()
    })

    it('re-parses when the variable changes', () => {
      process.env.PLATFORM_ROLE_ASSIGNMENTS = `${ADMIN_ID}:admin`
      expect(resolvePlatformRole(ADMIN_ID)).toBe('admin')
      process.env.PLATFORM_ROLE_ASSIGNMENTS = `${ADMIN_ID}:support`
      expect(resolvePlatformRole(ADMIN_ID)).toBe('support')
      process.env.PLATFORM_ROLE_ASSIGNMENTS = ''
      expect(resolvePlatformRole(ADMIN_ID)).toBeUndefined()
    })
  })
})
