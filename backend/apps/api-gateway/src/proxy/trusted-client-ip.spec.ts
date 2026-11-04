import { normalizeTrustedIp, resolveTrustedClientIp } from './trusted-client-ip'

const req = (headers: Record<string, any> = {}, remoteAddress?: string): any => ({
  headers,
  socket: remoteAddress === undefined ? undefined : { remoteAddress },
})

describe('normalizeTrustedIp', () => {
  it.each([
    ['203.0.113.5', '203.0.113.5'],
    ['  203.0.113.5  ', '203.0.113.5'],
    ['2606:4700:4700::1111', '2606:4700:4700::1111'],
    ['2606:4700:4700::ABCD', '2606:4700:4700::abcd'],
    ['::ffff:203.0.113.5', '203.0.113.5'],
    ['::FFFF:203.0.113.5', '203.0.113.5'],
    ['::ffff:cb00:7105', '203.0.113.5'],
    ['::1', '::1'],
  ])('%p -> %p', (input, expected) => {
    expect(normalizeTrustedIp(input)).toBe(expected)
  })

  it.each([
    '', ' ', 'unknown', 'not-an-ip', '999.1.1.1', '8.8.8', '8.8.8.8, 1.1.1.1', '8.8.8.8 1.1.1.1',
    '8.8.8.8:443', '[2606:4700::1111]', '[2606:4700::1111]:443', 'fe80::1%eth0', '8.8.8.8/24',
    'http://8.8.8.8', 'x'.repeat(100), undefined, null, 42, ['8.8.8.8'],
  ])('rejects %p', (input) => {
    expect(normalizeTrustedIp(input as any)).toBeNull()
  })
})

describe('resolveTrustedClientIp', () => {
  it.each(['production', 'staging', 'test', '', undefined])('NODE_ENV=%p: trusts only CF-Connecting-IP', (nodeEnv) => {
    const env = { NODE_ENV: nodeEnv } as NodeJS.ProcessEnv
    expect(resolveTrustedClientIp(req({ 'cf-connecting-ip': '203.0.113.5' }, '10.0.0.9'), env)).toBe('203.0.113.5')
  })

  it('ignores any caller-supplied x-forwarded-for / x-real-ip, leftmost or not', () => {
    const env = { NODE_ENV: 'production' } as NodeJS.ProcessEnv
    const headers = {
      'x-forwarded-for': '8.8.8.8, 1.1.1.1, 9.9.9.9',
      'x-real-ip': '8.8.8.8',
      'cf-connecting-ip': '185.59.221.75',
    }
    expect(resolveTrustedClientIp(req(headers, '10.0.0.9'), env)).toBe('185.59.221.75')
  })

  it.each(['production', 'staging', 'test', ''])(
    'NODE_ENV=%p: no CF-Connecting-IP -> null, never the load balancer socket or x-forwarded-for',
    (nodeEnv) => {
      const env = { NODE_ENV: nodeEnv } as NodeJS.ProcessEnv
      expect(resolveTrustedClientIp(req({ 'x-forwarded-for': '8.8.8.8' }, '10.0.0.9'), env)).toBeNull()
    },
  )

  it('invalid, list or repeated CF-Connecting-IP -> null, with no development socket fallback either', () => {
    const env = { NODE_ENV: 'development' } as NodeJS.ProcessEnv
    for (const value of ['junk', '8.8.8.8, 1.1.1.1', ['8.8.8.8', '1.1.1.1'], '']) {
      expect(resolveTrustedClientIp(req({ 'cf-connecting-ip': value }, '127.0.0.1'), env)).toBeNull()
    }
  })

  it('development with the header absent falls back to the direct socket, normalised', () => {
    const env = { NODE_ENV: 'development' } as NodeJS.ProcessEnv
    expect(resolveTrustedClientIp(req({}, '::ffff:127.0.0.1'), env)).toBe('127.0.0.1')
    expect(resolveTrustedClientIp(req({}, '::1'), env)).toBe('::1')
    expect(resolveTrustedClientIp(req({ 'x-forwarded-for': '8.8.8.8' }, '127.0.0.1'), env)).toBe('127.0.0.1')
    expect(resolveTrustedClientIp(req({}), env)).toBeNull()
  })

  it.each(['Development', ' development'])('the socket fallback is exactly NODE_ENV=development (%p is not)', (nodeEnv) => {
    expect(resolveTrustedClientIp(req({}, '127.0.0.1'), { NODE_ENV: nodeEnv } as NodeJS.ProcessEnv)).toBeNull()
  })
})
