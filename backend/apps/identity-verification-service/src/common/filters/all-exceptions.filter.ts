import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '../errors/domain-exceptions';
import { ErrorResponseDto } from '../../dto/response/error.response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof DomainException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as { message: string; details?: unknown };
      const errorBody: ErrorResponseDto = {
        code: exception.code,
        message: body.message,
        details: body.details as Record<string, unknown> | undefined,
      };
      response.status(status).json(errorBody);
      return;
    }

    if (exception instanceof BadRequestException) {
      const body = exception.getResponse() as { message: string[] | string };
      const errorBody: ErrorResponseDto = {
        code: 'VALIDATION_ERROR',
        message: 'One or more fields failed validation.',
        details: { errors: Array.isArray(body.message) ? body.message : [body.message] },
      };
      response.status(HttpStatus.BAD_REQUEST).json(errorBody);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message = typeof body === 'string' ? body : (body as { message?: string }).message ?? 'Request failed.';
      const errorBody: ErrorResponseDto = { code: 'REQUEST_FAILED', message };
      response.status(status).json(errorBody);
      return;
    }

    const errorBody: ErrorResponseDto = { code: 'INTERNAL_ERROR', message: 'Something went wrong. Try again.' };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorBody);
  }
}
