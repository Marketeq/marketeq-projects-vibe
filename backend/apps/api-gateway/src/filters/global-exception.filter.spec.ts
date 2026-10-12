import { HttpStatus, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { GlobalExceptionFilter } from './global-exception.filter'

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter()
  let warn: jest.SpyInstance
  let error: jest.SpyInstance

  const run = (exception: unknown, request: Record<string, string>) => {
    const json = jest.fn()
    const status = jest.fn(() => ({ json }))
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => request,
      }),
    }
    filter.catch(exception, host as any)
    return { status, json }
  }

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  it('logs a middleware 401 as WARN with the full path and no query string', () => {
    // Inside middleware, url is relative to the mount point ("/").
    run(new UnauthorizedException('Missing token'), {
      method: 'GET',
      url: '/',
      originalUrl: '/user/me?token=secret',
    })
    expect(error).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toMatch(/^GET \/user\/me — 401/)
    expect(warn.mock.calls[0][0]).not.toContain('secret')
  })

  it('logs other 4xx as WARN', () => {
    run(new NotFoundException(), { method: 'POST', url: '/v1/things', originalUrl: '/v1/things' })
    expect(error).not.toHaveBeenCalled()
    expect(warn.mock.calls[0][0]).toMatch(/^POST \/v1\/things — 404/)
  })

  it('keeps 5xx at ERROR', () => {
    run(new Error('boom'), { method: 'GET', url: '/v1/earnings/balance', originalUrl: '/v1/earnings/balance' })
    expect(warn).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledTimes(1)
    expect(error.mock.calls[0][0]).toBe('GET /v1/earnings/balance — 500')
  })

  it('falls back to url when originalUrl is missing', () => {
    run(new Error('boom'), { method: 'GET', url: '/health?x=1' })
    expect(error.mock.calls[0][0]).toBe('GET /health — 500')
  })

  it('sends the same response body as before', () => {
    const unauthorized = run(new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Sign in' }), {
      method: 'GET',
      url: '/',
      originalUrl: '/user/me',
    })
    expect(unauthorized.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED)
    expect(unauthorized.json).toHaveBeenCalledWith({
      statusCode: 401,
      code: 'AUTH_REQUIRED',
      message: 'Sign in',
      details: undefined,
    })

    const crash = run(new Error('boom'), { method: 'GET', url: '/x', originalUrl: '/x' })
    expect(crash.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(crash.json).toHaveBeenCalledWith({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : 'Error: boom',
      details: undefined,
    })
  })
})
