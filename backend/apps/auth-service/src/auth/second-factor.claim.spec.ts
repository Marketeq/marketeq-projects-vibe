import { hasSecondFactor } from './second-factor.claim'

describe('hasSecondFactor', () => {
  it('recognises the marker written at 2FA verification', () => {
    expect(hasSecondFactor({ amr: ['mfa'] })).toBe(true)
    expect(hasSecondFactor({ amr: ['pwd', 'MFA'] })).toBe(true)
    expect(hasSecondFactor({ amr: [' mfa '] })).toBe(true)
  })

  // Fails closed: at worst the role holder signs in again.
  it('treats anything else as single-factor', () => {
    expect(hasSecondFactor(undefined)).toBe(false)
    expect(hasSecondFactor({})).toBe(false)
    expect(hasSecondFactor({ amr: [] })).toBe(false)
    expect(hasSecondFactor({ amr: ['pwd'] })).toBe(false)
    expect(hasSecondFactor({ amr: 'mfa' })).toBe(false)
    expect(hasSecondFactor({ amr: [null, 1, {}] })).toBe(false)
    expect(hasSecondFactor({ amr: ['mfa-ish'] })).toBe(false)
  })
})
