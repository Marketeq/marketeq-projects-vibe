// apps/offer-service/src/filters/offer-exception.filter.ts
// OS-13: Global exception filter — formats all errors into the standard envelope.
// Registered globally in main.ts via app.useGlobalFilters().
import {
  ArgumentsHost, Catch, ExceptionFilter,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  OfferServiceException,
  ActiveOfferAlreadyExistsException,
  VerificationRequiredException,
} from '../common/exceptions/offer.exceptions';

@Catch()
export class OfferExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(OfferExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Use X-Request-ID if provided by client; otherwise generate one
    const requestId = (request.headers['x-request-id'] as string) ?? uuidv4();

    const baseEnvelope = {
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    // ============================================================
    // Case 1a: ActiveOfferAlreadyExistsException (includes extra fields)
    // ============================================================
    if (exception instanceof ActiveOfferAlreadyExistsException) {
      const status = exception.getStatus();
      const payload = exception.getResponse() as { errorCode: string; message: string };
      return void response.status(status).json({
        statusCode: status,
        error: payload.errorCode,
        message: payload.message,
        activeOfferId: exception.activeOfferId,
        activeOfferStatus: exception.activeOfferStatus,
        ...baseEnvelope,
      });
    }

    // ============================================================
    // Case 1b: VerificationRequiredException (G4 - the acting talent's own
    // outstanding requirement, and nothing else)
    // ============================================================
    if (exception instanceof VerificationRequiredException) {
      const status = exception.getStatus();
      const payload = exception.getResponse() as { errorCode: string; message: string };
      return void response.status(status).json({
        statusCode: status,
        error: payload.errorCode,
        message: payload.message,
        missingRequirements: exception.missingRequirements,
        ...baseEnvelope,
      });
    }

    // ============================================================
    // Case 1: OfferServiceException (our typed exceptions)
    // ============================================================
    if (exception instanceof OfferServiceException) {
      const status = exception.getStatus();
      const payload = exception.getResponse() as { errorCode: string; message: string };
      return void response.status(status).json({
        statusCode: status,
        error: payload.errorCode,
        message: payload.message,
        ...baseEnvelope,
      });
    }

    // ============================================================
    // Case 2: NestJS HttpException (validation pipe, guards, etc.)
    // ============================================================
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      // Case 2a: ValidationPipe BadRequestException
      // payload shape: { message: string[], error: 'Bad Request', statusCode: 400 }
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'message' in payload &&
        Array.isArray((payload as { message: unknown }).message)
      ) {
        const rawMessages = (payload as { message: string[] }).message;
        const details = rawMessages.map((msg: string) => {
          const spaceIdx = msg.indexOf(' ');
          const field = spaceIdx > 0 ? msg.substring(0, spaceIdx) : 'unknown';
          const constraint = deriveConstraint(msg);
          return { field, constraint, message: msg };
        });
        return void response
          .status(HttpStatus.UNPROCESSABLE_ENTITY)
          .json({
            statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
            error: 'VALIDATION_ERROR',
            message: 'The request contains validation errors. See details for field-level information.',
            details,
            ...baseEnvelope,
          });
      }

      // Case 2b: Other HttpExceptions (UnauthorizedException, ForbiddenException, etc.)
      const message =
        typeof payload === 'string'
          ? payload
          : typeof payload === 'object' && payload !== null && 'message' in payload
            ? String((payload as { message: unknown }).message)
            : 'An error occurred.';

      // Try to extract error code from payload (set by guards using structured throw)
      const errorCode =
        typeof payload === 'object' && payload !== null && 'error' in payload
          ? String((payload as { error: unknown }).error)
          : httpStatusToErrorCode(status);

      return void response.status(status).json({
        statusCode: status,
        error: errorCode,
        message,
        ...baseEnvelope,
      });
    }

    // ============================================================
    // Case 3: Unhandled errors (database, null refs, network, etc.)
    // ============================================================
    this.logger.error(
      `Unhandled exception on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
      JSON.stringify({ requestId }),
    );

    return void response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again. If the issue persists, contact support with the requestId.',
        ...baseEnvelope,
      });
  }
}

// =============================================================================
// Helpers
// =============================================================================

/** Derive a human-readable constraint name from a class-validator message. */
function deriveConstraint(message: string): string {
  if (message.includes('must be a UUID')) return 'isUUID';
  if (message.includes('valid UUID')) return 'isUUID';
  if (message.includes('must be an integer')) return 'isInt';
  if (message.includes('whole number')) return 'isInt';
  if (message.includes('at least')) return 'min';
  if (message.includes('cannot exceed')) return 'max';
  if (message.includes('must not be empty') || message.includes('is required')) return 'isNotEmpty';
  if (message.includes('must be a string')) return 'isString';
  if (message.includes('must be one of')) return 'isEnum';
  if (message.includes('must be exactly')) return 'length';
  if (message.includes('must be uppercase')) return 'isUppercase';
  if (message.includes('YYYY-MM-DD')) return 'isIso8601DateString';
  if (message.includes('past')) return 'isFutureDate';
  if (message.includes('years in the future')) return 'isNotTooFarFuture';
  if (message.includes('valid schedule')) return 'isValidSchedule';
  return 'invalid';
}

/** Map HTTP status codes to default error code strings. */
function httpStatusToErrorCode(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMITED',
    500: 'INTERNAL_ERROR',
    503: 'SERVICE_UNAVAILABLE',
  };
  return map[status] ?? 'UNKNOWN_ERROR';
}