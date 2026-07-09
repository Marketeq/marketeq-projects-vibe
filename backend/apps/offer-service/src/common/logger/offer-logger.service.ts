// apps/offer-service/src/common/logger/offer-logger.service.ts
// OS-35: Structured JSON logger with automatic sensitive-field masking.
// Every log line is newline-delimited JSON to stdout.
import { Injectable, LoggerService } from '@nestjs/common';

const SENSITIVE_KEYS = new Set([
  'password', 'PASSWORD', 'secret', 'SECRET',
  'token', 'TOKEN', 'apiKey', 'api_key', 'ABLY_API_KEY',
  'authorization', 'Authorization',
  'x-internal-secret', 'X-Internal-Secret', 'INTERNAL_SERVICE_SECRET',
  'JWT_SECRET', 'DB_PASSWORD',
  'declinedReason', 'declined_reason',
  'credit_card', 'card_number', 'ssn', 'routing_number',
  'privateKey', 'private_key',
]);

export function maskSensitive(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((v) => maskSensitive(v, depth + 1));

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    masked[key] =
      SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(key.toLowerCase())
        ? '[REDACTED]'
        : maskSensitive(value, depth + 1);
  }
  return masked;
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

@Injectable()
export class OfferLoggerService implements LoggerService {
  private readonly SERVICE = 'offer-service' as const;

  private write(
    level: LogLevel,
    message: string,
    context?: string,
    extra?: Record<string, unknown>,
  ): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.SERVICE,
      context: context ?? 'App',
      message,
      ...(extra ? (maskSensitive(extra) as Record<string, unknown>) : {}),
    };
    process.stdout.write(JSON.stringify(entry) + '\n');
  }

  log(message: string, context?: string): void { this.write('info', message, context); }
  error(message: string, trace?: string, context?: string): void { this.write('error', message, context, { trace }); }
  warn(message: string, context?: string): void { this.write('warn', message, context); }
  debug(message: string, context?: string): void { this.write('debug', message, context); }
  verbose(message: string, context?: string): void { this.write('verbose', message, context); }

  logWithData(
    level: 'error' | 'warn' | 'info' | 'debug',
    message: string,
    context: string,
    data: Record<string, unknown>,
  ): void {
    this.write(level, message, context, data);
  }
}