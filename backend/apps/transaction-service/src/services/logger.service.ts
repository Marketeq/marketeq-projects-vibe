import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class StructuredLogger implements NestLoggerService {
  private context?: string;
  private traceId?: string;

  setContext(context: string): void { this.context = context; }
  setTraceId(traceId: string): void { this.traceId = traceId; }

  private emit(level: string, message: string, extra?: object): void {
    process.stdout.write(JSON.stringify({
      level,
      timestamp:  new Date().toISOString(),
      service:    'transaction-service',
      traceId:    this.traceId ?? 'none',
      context:    this.context ?? 'App',
      message,
      ...extra,
    }) + '\n');
  }

  error(message: string, extra?: object): void { this.emit('error', message, extra); }
  warn(message:  string, extra?: object): void { this.emit('warn',  message, extra); }
  log(message:   string, extra?: object): void { this.emit('info',  message, extra); }
  debug(message: string, extra?: object): void {
    if (process.env.NODE_ENV !== 'production') this.emit('debug', message, extra);
  }
  verbose() {} // Not used
}