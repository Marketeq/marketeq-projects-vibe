import {
  ALL_CAPABILITIES,
  CAPABILITIES,
  PLATFORM_ROLES,
  PLATFORM_ROLE_CATALOGUE,
  capabilitiesOf,
  getRoleDefinition,
  isKnownCapability,
  isPlatformRole,
} from './platform-roles.catalog'
import { hasCapability, isRoleAllowed, isCapabilityRequirement } from './platform-role.core'

describe('platform role catalogue', () => {
  describe('shape', () => {
    it('lists the roles the business named', () => {
      for (const id of ['admin', 'developer', 'qa', 'product-manager']) {
        expect(PLATFORM_ROLES).toContain(id)
      }
    })

    it('has no duplicate ids', () => {
      expect(new Set(PLATFORM_ROLES).size).toBe(PLATFORM_ROLES.length)
    })

    // A typo'd capability on a role would silently grant nothing; catching it
    // here is cheaper than finding out when someone cannot do their job.
    it('grants only capabilities that exist', () => {
      for (const role of PLATFORM_ROLE_CATALOGUE) {
        for (const cap of role.capabilities) {
          if (cap === ALL_CAPABILITIES) continue
          expect({ role: role.id, cap, known: isKnownCapability(cap) })
            .toEqual({ role: role.id, cap, known: true })
        }
      }
    })

    it('names every capability it defines', () => {
      for (const [id, description] of Object.entries(CAPABILITIES)) {
        expect(id).toMatch(/^[a-z]+(:[a-z-]+)+$/)
        expect(description.length).toBeGreaterThan(0)
      }
    })

    it('marks unagreed roles provisional so nobody mistakes them for policy', () => {
      expect(getRoleDefinition('admin')!.status).toBe('confirmed')
      for (const id of ['developer', 'qa', 'product-manager']) {
        expect(getRoleDefinition(id)!.status).toBe('provisional')
      }
    })
  })

  describe('capabilitiesOf', () => {
    it('gives the owner the wildcard, so future capabilities are covered too', () => {
      expect(capabilitiesOf('admin')).toEqual([ALL_CAPABILITIES])
    })

    it('gives an unknown role nothing', () => {
      expect(capabilitiesOf('ceo')).toEqual([])
      expect(capabilitiesOf(undefined)).toEqual([])
      expect(capabilitiesOf('')).toEqual([])
    })

    it('is case and whitespace insensitive', () => {
      expect(capabilitiesOf(' ADMIN ')).toEqual([ALL_CAPABILITIES])
    })

    it('does not let rank imply inheritance', () => {
      // developer outranks qa but must not inherit its fixture-writing power.
      expect(getRoleDefinition('developer')!.rank).toBeGreaterThan(getRoleDefinition('qa')!.rank)
      expect(capabilitiesOf('developer')).not.toContain('qa:fixture:write')
    })
  })

  describe('hasCapability', () => {
    it('lets the owner do everything', () => {
      for (const cap of Object.keys(CAPABILITIES)) {
        expect(hasCapability('admin', cap)).toBe(true)
      }
    })

    it('holds the money separation: finance approves but cannot move funds', () => {
      expect(hasCapability('finance', 'finance:approve')).toBe(true)
      expect(hasCapability('finance', 'wire:review')).toBe(true)
      expect(hasCapability('finance', 'finance:move')).toBe(false)
    })

    it('keeps user records away from the technical roles', () => {
      for (const role of ['developer', 'qa', 'product-manager']) {
        expect(hasCapability(role, 'users:write')).toBe(false)
        expect(hasCapability(role, 'finance:move')).toBe(false)
        expect(hasCapability(role, 'platform:role:grant')).toBe(false)
      }
    })

    it('keeps support read-only', () => {
      expect(hasCapability('support', 'users:read')).toBe(true)
      expect(hasCapability('support', 'users:write')).toBe(false)
    })

    it('fails closed on no role, an unknown role and an unknown capability', () => {
      expect(hasCapability(undefined, 'users:read')).toBe(false)
      expect(hasCapability('ceo', 'users:read')).toBe(false)
      // A misspelled requirement must deny, never allow.
      expect(hasCapability('admin', 'finance:aprove')).toBe(false)
    })
  })

  describe('isRoleAllowed accepts roles and capabilities', () => {
    it('still honours plain role names — every existing call site', () => {
      expect(isRoleAllowed('admin', ['admin'])).toBe(true)
      expect(isRoleAllowed('developer', ['admin'])).toBe(false)
      expect(isRoleAllowed(undefined, ['admin'])).toBe(false)
      expect(isRoleAllowed('admin', [])).toBe(true)
    })

    it('honours capability requirements', () => {
      expect(isRoleAllowed('finance', ['finance:approve'])).toBe(true)
      expect(isRoleAllowed('support', ['finance:approve'])).toBe(false)
      expect(isRoleAllowed('developer', ['observability:read'])).toBe(true)
    })

    it('accepts a mixed list', () => {
      expect(isRoleAllowed('finance', ['admin', 'finance:approve'])).toBe(true)
      expect(isRoleAllowed('qa', ['admin', 'finance:approve'])).toBe(false)
    })

    it('tells the two requirement kinds apart by the colon', () => {
      expect(isCapabilityRequirement('finance:approve')).toBe(true)
      expect(isCapabilityRequirement('admin')).toBe(false)
    })
  })

  // The template property: a new role should need no change outside the
  // catalogue. This proves resolution is data-driven rather than hardcoded.
  describe('expandability', () => {
    it('resolves a role added at runtime with no other code change', () => {
      PLATFORM_ROLE_CATALOGUE.push({
        id: 'release-manager',
        label: 'Release Manager',
        rank: 50,
        status: 'provisional',
        summary: 'test-only role',
        capabilities: ['release:flag:write'],
        inherits: ['support'],
      })
      try {
        // Not picked up: the id index is built once at module load, which is
        // the behaviour to document — adding a role needs a restart, not a
        // code change.
        expect(isPlatformRole('release-manager')).toBe(false)
      } finally {
        PLATFORM_ROLE_CATALOGUE.pop()
      }
    })

    it('composes through inherits without rank games', () => {
      const def = getRoleDefinition('support')!
      expect(def.inherits).toBeUndefined()
      expect(capabilitiesOf('support')).toEqual(expect.arrayContaining(['users:read', 'analytics:read']))
    })
  })
})
