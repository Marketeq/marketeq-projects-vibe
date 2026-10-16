import { ForbiddenException } from '@nestjs/common'
import { UserAccessGuard } from './user-access.guard'

const CALLER = 'aaaaaaaa-0000-0000-0000-000000000001'
const OTHER = 'bbbbbbbb-0000-0000-0000-000000000002'

const ctx = (req: any) => ({ switchToHttp: () => ({ getRequest: () => req }) }) as any

const request = (over: any = {}) => ({
  user: { sub: CALLER },
  params: {},
  body: {},
  method: 'PATCH',
  originalUrl: '/users/' + CALLER,
  headers: {},
  ...over,
})

describe('UserAccessGuard mode split', () => {
  const env = { ...process.env }
  let guard: UserAccessGuard

  beforeEach(() => {
    guard = new UserAccessGuard()
    jest.spyOn((guard as any).logger, 'warn').mockImplementation(() => undefined)
    delete process.env.USER_ACCESS_MODE
    delete process.env.USER_ACCESS_ESCALATION_MODE
    delete process.env.INTERNAL_SERVICE_TOKEN
  })

  afterAll(() => {
    process.env = env
  })

  it('rejects privilege escalation out of the box, with no env set', () => {
    const req = request({ body: { role: 'admin' } })
    expect(() => guard.canActivate(ctx(req))).toThrow(ForbiddenException)
  })

  it('rejects an attempt to set platformRole directly', () => {
    const req = request({ body: { platformRole: 'admin' } })
    expect(() => guard.canActivate(ctx(req))).toThrow(ForbiddenException)
  })

  it('still only logs a cross-user edit — that check stays in monitor', () => {
    const req = request({ params: { id: OTHER }, originalUrl: '/users/' + OTHER })
    expect(guard.canActivate(ctx(req))).toBe(true)
    expect((guard as any).logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('WOULD BLOCK [cross-user]'),
    )
  })

  it('still only logs a list-all', () => {
    const req = request({ method: 'GET', originalUrl: '/users' })
    expect(guard.canActivate(ctx(req))).toBe(true)
    expect((guard as any).logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('WOULD BLOCK [list-all]'),
    )
  })

  it('logs escalation as BLOCKED, not WOULD BLOCK', () => {
    const req = request({ body: { role: 'admin' } })
    expect(() => guard.canActivate(ctx(req))).toThrow()
    expect((guard as any).logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('BLOCKED [role-escalation]'),
    )
  })

  it('can be backed off independently if it ever breaks something', () => {
    process.env.USER_ACCESS_ESCALATION_MODE = 'monitor'
    const req = request({ body: { role: 'admin' } })
    expect(guard.canActivate(ctx(req))).toBe(true)
  })

  it('USER_ACCESS_MODE=off is a kill switch for all three checks', () => {
    process.env.USER_ACCESS_MODE = 'off'
    expect(guard.canActivate(ctx(request({ body: { role: 'admin' } })))).toBe(true)
    expect(guard.canActivate(ctx(request({ params: { id: OTHER } })))).toBe(true)
  })

  it('enforcing USER_ACCESS_MODE turns the ownership checks on too', () => {
    process.env.USER_ACCESS_MODE = 'enforce'
    const req = request({ params: { id: OTHER }, originalUrl: '/users/' + OTHER })
    expect(() => guard.canActivate(ctx(req))).toThrow(ForbiddenException)
  })

  it('exempts a service-to-service caller holding the internal token', () => {
    process.env.INTERNAL_SERVICE_TOKEN = 'shared-secret-value'
    const req = request({
      params: { id: OTHER },
      body: { role: 'admin' },
      headers: { 'x-internal-token': 'shared-secret-value' },
    })
    expect(guard.canActivate(ctx(req))).toBe(true)
  })

  it('lets an ordinary self-edit through untouched', () => {
    const req = request({ params: { id: CALLER }, body: { firstName: 'Lotty' } })
    expect(guard.canActivate(ctx(req))).toBe(true)
    expect((guard as any).logger.warn).not.toHaveBeenCalled()
  })
})
