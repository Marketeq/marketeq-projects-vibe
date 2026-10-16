import { ForbiddenException } from '@nestjs/common'
import { assertOwner, ownerFromToken } from './wallet-owner'

const CALLER = '11111111-1111-4111-8111-111111111111'
const VICTIM = '22222222-2222-4222-8222-222222222222'

describe('wallet ownership', () => {
  describe('ownerFromToken (body-supplied id)', () => {
    it('returns the caller id when the body matches', () => {
      expect(ownerFromToken({ userId: CALLER }, CALLER, 'test')).toBe(CALLER)
    })

    it('ignores a body id belonging to someone else', () => {
      expect(ownerFromToken({ userId: CALLER }, VICTIM, 'test')).toBe(CALLER)
    })

    it('returns the caller id when the body omits one', () => {
      expect(ownerFromToken({ userId: CALLER }, undefined, 'test')).toBe(CALLER)
    })

    it('accepts a token that carries only sub', () => {
      expect(ownerFromToken({ sub: CALLER }, VICTIM, 'test')).toBe(CALLER)
    })

    it('refuses when there is no authenticated user (guard bypassed or removed)', () => {
      expect(() => ownerFromToken(undefined, CALLER, 'test')).toThrow(ForbiddenException)
      expect(() => ownerFromToken({}, CALLER, 'test')).toThrow(ForbiddenException)
    })
  })

  describe('assertOwner (path id)', () => {
    it('allows a caller reading their own wallet', () => {
      expect(assertOwner({ userId: CALLER }, CALLER, 'test')).toBe(CALLER)
    })

    it("blocks a caller reading someone else's wallet", () => {
      expect(() => assertOwner({ userId: CALLER }, VICTIM, 'test')).toThrow(ForbiddenException)
    })

    it('refuses when there is no authenticated user', () => {
      expect(() => assertOwner(undefined, CALLER, 'test')).toThrow(ForbiddenException)
    })
  })
})
