import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError as any)
export class PgExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const code = String(exception?.code || '');

    if (code === '23505') {
      const e = new ConflictException('Duplicate key');
      return res.status(e.getStatus()).json(e.getResponse());
    }
    if (code.startsWith('23')) {
      const e = new BadRequestException('Invalid relation/constraint');
      return res.status(e.getStatus()).json(e.getResponse());
    }
    Logger.error(exception);
    const e = new BadRequestException('Database error');
    return res.status(e.getStatus()).json(e.getResponse());
  }
}
