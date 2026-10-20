import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

const HANDLED_RESPONSE_KEYS = new Set([
  'statusCode',
  'code',
  'message',
  'details',
  'error',
  'blockingReasons',
  'valid',
])

const extraResponseFields = (exceptionResponse: unknown): Record<string, unknown> =>
  typeof exceptionResponse === 'object' &&
  exceptionResponse !== null &&
  !Array.isArray(exceptionResponse)
    ? Object.fromEntries(
        Object.entries(exceptionResponse).filter(([key]) => !HANDLED_RESPONSE_KEYS.has(key)),
      )
    : {}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter')

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR

    const exceptionResponse = exception instanceof HttpException
      ? exception.getResponse()
      : null

    const isProd = process.env.NODE_ENV === 'production'
    const detail = isProd ? '' : (exception instanceof Error ? exception.stack : String(exception))

    // originalUrl, not url: for exceptions thrown in middleware (JwtMiddleware)
    // url is relative to the mount point and always reads "/". The query string
    // is dropped so tokens and codes in it never reach the logs.
    const path = (request.originalUrl || request.url || '').split('?')[0]
    const line = `${request.method} ${path} — ${status}`

    // 4xx are client errors handled as designed (mostly logged-out 401s, which
    // JwtMiddleware already logs), so they are WARN. ERROR is kept for 5xx,
    // which is what the staging monitor's error scan is meant to catch.
    if (status < 500) {
      this.logger.warn(detail ? `${line}\n${detail}` : line)
    } else {
      this.logger.error(line, detail)
    }

    response.status(status).json({
      ...extraResponseFields(exceptionResponse),
      statusCode: status,
      code: typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).code ?? 'INTERNAL_ERROR'
        : 'INTERNAL_ERROR',
      message: typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).message ?? 'An unexpected error occurred.'
        : isProd ? 'An unexpected error occurred.' : String(exception),
      details: typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).details ?? undefined
        : undefined,
      ...(typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      Array.isArray((exceptionResponse as any).blockingReasons)
        ? {
            valid: false,
            blockingReasons: (exceptionResponse as any).blockingReasons,
          }
        : {}),
    })
  }
}
