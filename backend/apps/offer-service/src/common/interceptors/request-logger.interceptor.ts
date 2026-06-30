// apps/offer-service/src/common/interceptors/request-logger.interceptor.ts
// OS-35: Logs every HTTP request/response with method, path, status, durationMs.
// 5xx → error level, 4xx → warn level, 2xx → info level.
// Request bodies are NEVER logged.
import {
  Injectable, NestInterceptor, ExecutionContext,
  CallHandler, Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import type { Request, Response } from 'express';

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggerInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req: Request = context.switchToHttp().getRequest();
    const res: Response = context.switchToHttp().getResponse();
    const startMs = Date.now();

    const method = req.method;
    const path = req.url.split('?')[0];
    const requestId = (req.headers['x-request-id'] as string) ?? '';
    const userId = (req as any).user?.sub ?? 'anonymous';

    const idempKeyRaw = req.headers['x-idempotency-key'] as string | undefined;
    const idempPrefix = idempKeyRaw ? idempKeyRaw.substring(0, 8) + '...' : undefined;

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - startMs;
        const status = res.statusCode;
        this.logger.log(
          `${method} ${path} ${status} ${ms}ms` +
            (idempPrefix ? ` idem=${idempPrefix}` : ''),
        );
      }),
      catchError((err: unknown) => {
        const ms = Date.now() - startMs;
        const status = (err as any)?.statusCode ?? (err as any)?.status ?? 500;
        const errorCode = (err as any)?.errorCode ?? 'UNKNOWN';

        const logLine =
          `${method} ${path} ${status} ${ms}ms` +
          ` errorCode=${errorCode}` +
          (idempPrefix ? ` idem=${idempPrefix}` : '') +
          ` requestId=${requestId} userId=${userId}`;

        if (status >= 500) {
          this.logger.error(logLine, (err as Error).stack);
        } else if (status >= 400) {
          this.logger.warn(logLine);
        }
        return throwError(() => err);
      }),
    );
  }
}