// apps/payout-service/src/filters/global-exception.filter.ts
// PS-00 §6: Catches all exceptions and returns consistent error shape
// Error codes referenced throughout PS-25 (Error States & HTTP Error Catalog)
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'ERR_INTERNAL';
    let message = 'An unexpected error occurred.';
    // Extra fields PayoutError attaches (attemptsLeft, lockedUntil, etc.) —
    // callers like the deposit-method verification UI depend on these
    // reaching the client, not just errorCode/message.
    let meta: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as any;
        errorCode = resp.errorCode || `ERR_HTTP_${status}`;
        message = resp.message || exception.message;
        const { errorCode: _ec, message: _msg, statusCode: _sc, ...rest } = resp;
        meta = rest;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      errorCode,
      message,
      ...meta,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}