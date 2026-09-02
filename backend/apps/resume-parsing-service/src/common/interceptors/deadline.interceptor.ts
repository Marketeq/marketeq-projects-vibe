import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, timeout, catchError } from 'rxjs';
import { ParseException } from '../errors/parse.exception';

@Injectable()
export class DeadlineInterceptor implements NestInterceptor {
  private readonly deadlineMs: number;

  constructor() {
    this.deadlineMs = parseInt(process.env.REQUEST_DEADLINE_MS || '120000', 10);
  }

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(this.deadlineMs),
      catchError((err) => {
        if (err.name === 'TimeoutError') {
          throw ParseException.deadlineExceeded();
        }
        throw err;
      }),
    );
  }
}
