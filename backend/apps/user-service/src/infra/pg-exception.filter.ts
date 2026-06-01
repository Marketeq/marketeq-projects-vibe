import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class PgExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PgExceptionFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const req = host.switchToHttp().getRequest();
    const driverErr = (exception as any).driverError ?? {};
    this.logger.error(
      `${req.method} ${req.url} -> ${(exception as any).code ?? driverErr.code ?? 'PG_ERR'}: ${exception.message}` +
        (driverErr.detail ? ` | detail: ${driverErr.detail}` : '') +
        (driverErr.table ? ` | table: ${driverErr.table}` : '') +
        (driverErr.column ? ` | column: ${driverErr.column}` : ''),
      exception.stack,
    );
    res.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Database error',
      path: req.url,
    });
  }
}
