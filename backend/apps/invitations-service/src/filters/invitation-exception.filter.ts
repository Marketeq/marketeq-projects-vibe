import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

const STATUS_CODE_FALLBACK: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.GONE]: 'GONE',
};

/**
 * Renders every error response in this service as
 * `{ success: false, error: CODE, message }` per the MyTeam epic doc.
 * InvitationApiException subclasses (invitation-exceptions.ts) already
 * carry the right shape; everything else gets a status-derived fallback
 * code so the frontend never has to string-match a message again.
 */
@Catch()
export class InvitationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(InvitationExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'object' && body !== null && 'error' in body) {
        res.status(status).json(body);
        return;
      }

      const message =
        typeof body === 'object' && body !== null && 'message' in body
          ? (body as { message: string | string[] }).message
          : exception.message;

      res.status(status).json({
        success: false,
        error: STATUS_CODE_FALLBACK[status] ?? 'ERROR',
        message: Array.isArray(message) ? message.join(', ') : message,
      });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Something went wrong',
    });
  }
}
