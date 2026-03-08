import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

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

    this.logger.error(
      `${request.method} ${request.url} — ${status}`,
      isProd ? '' : (exception instanceof Error ? exception.stack : String(exception)),
    )

    response.status(status).json({
      statusCode: status,
      code: typeof exceptionResponse === 'object'
        ? (exceptionResponse as any).code ?? 'INTERNAL_ERROR'
        : 'INTERNAL_ERROR',
      message: typeof exceptionResponse === 'object'
        ? (exceptionResponse as any).message ?? 'An unexpected error occurred.'
        : isProd ? 'An unexpected error occurred.' : String(exception),
      details: typeof exceptionResponse === 'object'
        ? (exceptionResponse as any).details ?? undefined
        : undefined,
    })
  }
}
