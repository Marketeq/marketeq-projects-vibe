import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  BadRequestException,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const correlationId = request.headers['x-correlation-id'];
    if (!correlationId) {
      throw new BadRequestException('x-correlation-id header is required');
    }

    const idempotencyKey = request.headers['x-idempotency-key'];
    if (!idempotencyKey) {
      throw new BadRequestException('x-idempotency-key header is required');
    }

    // Attach to request for downstream use
    request.correlationId = correlationId;
    request.idempotencyKey = idempotencyKey;

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        response.setHeader('x-correlation-id', correlationId);
        response.setHeader('x-processing-time-ms', String(Date.now() - startTime));
      }),
    );
  }
}
