# 04 — `resume-parsing-service` API Endpoints

**Service:** `resume-parsing-service`
**Prepared:** 22 July 2026
**Audience:** the developer building this service. Assumes no prior familiarity with it.
**Prerequisites:** Docs 00–03. This document fills `src/parsing/` and `src/common/`.

---

## 1. What this document gets you

The one endpoint this service exposes — `POST /v1/parse` — wired end to end: authentication, validation, error handling, the request deadline, and a stub behind the extraction port so the whole thing runs and tests without a model provider. Doc 05 replaces the stub.

### 1.1 Two decisions this endpoint settles

**The caller sends bytes, not a storage reference.** `user-service` owns storage. Handing us an object key would mean giving this service storage credentials — and this is the service that reads arbitrary untrusted documents. Files cap at 5MB on the internal network, so the bandwidth cost is trivial and the security saving is real: **this service holds no storage credentials at all.**

**Classification failure is a `200`, not an error.** If the document is an invoice, the service did its job perfectly and returns `200` with `is_resume: false`. Error codes are reserved for cases where the service *could not* do its job. Getting this wrong pollutes error-rate alerting with normal traffic and makes the caller's handling incoherent.

---

## 2. The contract at a glance

| | |
|---|---|
| **Endpoint** | `POST /v1/parse` |
| **Content type** | `multipart/form-data`, one `file` part |
| **Auth** | Shared-secret bearer token, service-to-service only |
| **Exposure** | Internal only — never publicly routable |
| **Timeout** | 30 s at the caller; 25 s internal backstop |
| **State** | None |

### 2.1 Status codes

| Code | Meaning | Caller retries? |
|---|---|---|
| `200` | Parsed — **includes `is_resume: false`** | No |
| `400` | Malformed request — bad field, missing header, zero bytes | No |
| `401` | Missing or invalid service token | No |
| `413` | File exceeds 5MB | No |
| `415` | Type not PDF/DOC/DOCX, or signature mismatch | No |
| `422` | Readable request, unusable document — encrypted, corrupt, or far too long | No |
| `429` | This service is shedding load | **Yes**, once |
| `503` | Model provider unavailable | **Yes**, once |
| `504` | Internal deadline exceeded | **Yes**, once |

Retryability is part of the contract. The caller retries exactly once, only for `429`/`503`/`504`.

---

## 3. Error codes

Stable, machine-readable, mapped by the caller to talent-facing states. **Changing a code is a breaking change across two services.**

### 3.1 `src/common/errors/error-codes.ts`

```ts
/**
 * Stable error codes. The caller maps these to talent-facing states.
 * NEVER change or remove a value without a coordinated user-service change.
 * Adding a code is safe — the caller treats unknown codes as a generic failure.
 */
export enum ParseErrorCode {
  MISSING_FILE = 'MISSING_FILE',
  MISSING_CORRELATION_ID = 'MISSING_CORRELATION_ID',
  MISSING_IDEMPOTENCY_KEY = 'MISSING_IDEMPOTENCY_KEY',
  EMPTY_FILE = 'EMPTY_FILE',

  UNAUTHORIZED = 'UNAUTHORIZED',

  FILE_TOO_LARGE = 'FILE_TOO_LARGE',

  UNSUPPORTED_TYPE = 'UNSUPPORTED_TYPE',
  TYPE_MISMATCH = 'TYPE_MISMATCH',

  PASSWORD_PROTECTED = 'PASSWORD_PROTECTED',
  UNREADABLE_DOCUMENT = 'UNREADABLE_DOCUMENT',
  DOCUMENT_TOO_LONG = 'DOCUMENT_TOO_LONG',

  SERVICE_OVERLOADED = 'SERVICE_OVERLOADED',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  DEADLINE_EXCEEDED = 'DEADLINE_EXCEEDED',

  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/** Codes the caller may retry. Everything else fails identically on a retry. */
export const RETRYABLE_CODES: ReadonlySet<ParseErrorCode> = new Set([
  ParseErrorCode.SERVICE_OVERLOADED,
  ParseErrorCode.MODEL_UNAVAILABLE,
  ParseErrorCode.DEADLINE_EXCEEDED,
]);
```

### 3.2 `src/common/errors/parse.exception.ts`

```ts
import { HttpException, HttpStatus } from '@nestjs/common';
import { ParseErrorCode, RETRYABLE_CODES } from './error-codes';

export interface ParseErrorBody {
  error: { code: ParseErrorCode; message: string; retryable: boolean };
  correlationId: string | null;
}

/**
 * The only exception this service throws deliberately.
 *
 * `message` is for developers reading logs — NOT shown to a talent. user-service
 * owns talent-facing copy; we supply a code, it supplies the words. Never put
 * document content or personal data in a message.
 */
export class ParseException extends HttpException {
  constructor(
    public readonly code: ParseErrorCode,
    status: HttpStatus,
    message: string,
    public readonly correlationId: string | null = null,
  ) {
    super(
      { error: { code, message, retryable: RETRYABLE_CODES.has(code) }, correlationId },
      status,
    );
  }

  static missingFile(cid: string | null) {
    return new ParseException(ParseErrorCode.MISSING_FILE, HttpStatus.BAD_REQUEST,
      'No file part present in the multipart request.', cid);
  }
  static missingHeader(code: ParseErrorCode, header: string, cid: string | null) {
    return new ParseException(code, HttpStatus.BAD_REQUEST,
      `Required header "${header}" is missing.`, cid);
  }
  static emptyFile(cid: string | null) {
    return new ParseException(ParseErrorCode.EMPTY_FILE, HttpStatus.BAD_REQUEST,
      'Uploaded file contains zero bytes.', cid);
  }
  static unauthorized(cid: string | null) {
    return new ParseException(ParseErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED,
      'Missing or invalid service authentication token.', cid);
  }
  static tooLarge(bytes: number, limit: number, cid: string | null) {
    return new ParseException(ParseErrorCode.FILE_TOO_LARGE, HttpStatus.PAYLOAD_TOO_LARGE,
      `File is ${bytes} bytes; limit is ${limit}.`, cid);
  }
  static unsupportedType(declared: string, cid: string | null) {
    return new ParseException(ParseErrorCode.UNSUPPORTED_TYPE, HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      `Declared type "${declared}" is not PDF, DOC or DOCX.`, cid);
  }
  static typeMismatch(declared: string, detected: string, cid: string | null) {
    return new ParseException(ParseErrorCode.TYPE_MISMATCH, HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      `Declared "${declared}" but signature indicates "${detected}".`, cid);
  }
  static passwordProtected(cid: string | null) {
    return new ParseException(ParseErrorCode.PASSWORD_PROTECTED, HttpStatus.UNPROCESSABLE_ENTITY,
      'Document is encrypted and cannot be read.', cid);
  }
  static unreadable(cid: string | null) {
    return new ParseException(ParseErrorCode.UNREADABLE_DOCUMENT, HttpStatus.UNPROCESSABLE_ENTITY,
      'Document structure is damaged; no text could be extracted.', cid);
  }
  /**
   * Thrown BEFORE any model call. A document past the hard limit is not a resume
   * with a length problem — it is a thesis or a scanned book. Rejecting is
   * cheaper than a large model call and blocks a trivial cost-inflation attack.
   */
  static documentTooLong(chars: number, limit: number, cid: string | null) {
    return new ParseException(ParseErrorCode.DOCUMENT_TOO_LONG, HttpStatus.UNPROCESSABLE_ENTITY,
      `Extracted text is ${chars} characters; hard limit is ${limit}.`, cid);
  }
  static modelUnavailable(cid: string | null) {
    return new ParseException(ParseErrorCode.MODEL_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE,
      'Model provider is unreachable or returned an unrecoverable error.', cid);
  }
  static deadlineExceeded(ms: number, cid: string | null) {
    return new ParseException(ParseErrorCode.DEADLINE_EXCEEDED, HttpStatus.GATEWAY_TIMEOUT,
      `Processing exceeded the internal deadline of ${ms}ms.`, cid);
  }
}
```

### 3.3 `src/common/errors/all-exceptions.filter.ts`

```ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ParseException, type ParseErrorBody } from './parse.exception';
import { ParseErrorCode } from './error-codes';

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const correlationId = (request.headers['x-correlation-id'] as string) ?? null;

    if (exception instanceof ParseException) {
      const body = exception.getResponse() as ParseErrorBody;
      body.correlationId = correlationId;
      const status = exception.getStatus();
      // 4xx is normal traffic; 5xx is ours to fix. Different levels so alerting
      // on error-level logs does not fire on a bad upload.
      this.logger[status >= 500 ? 'error' : 'warn'](
        { correlationId, code: exception.code, status }, 'Request failed');
      void reply.status(status).send(body);
      return;
    }

    // Anything here is a bug. Log it fully; tell the caller nothing.
    this.logger.error({ correlationId, err: exception }, 'Unhandled exception');
    const body: ParseErrorBody = {
      error: { code: ParseErrorCode.INTERNAL_ERROR, message: 'An unexpected error occurred.', retryable: false },
      correlationId,
    };
    void reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(body);
  }
}
```

A stack trace in an HTTP response is both a leak and useless to the caller — the full error goes to logs keyed by correlation ID.

---

## 4. Authentication

### 4.1 `src/common/guards/service-auth.guard.ts`

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { ParseException } from '../errors/parse.exception';
import type { AppConfig } from '../../config/config.schema';

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  private readonly expected: Buffer;

  constructor(config: ConfigService<AppConfig, true>) {
    this.expected = Buffer.from(config.get('SERVICE_AUTH_TOKEN', { infer: true }), 'utf8');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const cid = (request.headers['x-correlation-id'] as string) ?? null;

    const header = request.headers['authorization'];
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      throw ParseException.unauthorized(cid);
    }

    const presented = Buffer.from(header.slice('Bearer '.length), 'utf8');

    // Length must match before timingSafeEqual, which throws on unequal lengths.
    if (presented.length !== this.expected.length) throw ParseException.unauthorized(cid);
    if (!timingSafeEqual(presented, this.expected)) throw ParseException.unauthorized(cid);

    return true;
  }
}
```

> **Why `timingSafeEqual`.** A normal comparison returns as soon as it finds a differing character, leaking how much of the token was correct — enough to recover the secret one character at a time. Constant-time comparison removes the signal. Standard practice for any secret comparison, and free.

Authentication is service-to-service only. There is **no user-level authorisation** — the service never learns which talent a document belongs to, and does not need to. Network isolation (Doc 01 §10) is the primary defence; the token protects against a compromised neighbour inside the perimeter.

---

## 5. Cross-cutting request handling

### 5.1 `src/common/interceptors/correlation.interceptor.ts`

```ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PinoLogger } from 'nestjs-pino';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ParseException } from '../errors/parse.exception';
import { ParseErrorCode } from '../errors/error-codes';

/**
 * Requires a correlation ID and an idempotency key, echoes the correlation ID,
 * and times the request. Both headers are mandatory rather than generated —
 * they are how a support engineer joins a talent's complaint to a log line, and
 * a generated one would not appear in user-service's logs at all.
 */
@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(CorrelationInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();

    const cid = request.headers['x-correlation-id'];
    if (typeof cid !== 'string' || cid.length === 0) {
      throw ParseException.missingHeader(ParseErrorCode.MISSING_CORRELATION_ID, 'x-correlation-id', null);
    }
    const idem = request.headers['x-idempotency-key'];
    if (typeof idem !== 'string' || idem.length === 0) {
      throw ParseException.missingHeader(ParseErrorCode.MISSING_IDEMPOTENCY_KEY, 'x-idempotency-key', cid);
    }

    void reply.header('x-correlation-id', cid);
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.logger.info({ correlationId: cid, durationMs: Date.now() - startedAt }, 'Request completed'),
        error: () => this.logger.warn({ correlationId: cid, durationMs: Date.now() - startedAt }, 'Request failed'),
      }),
    );
  }
}
```

### 5.2 `src/common/interceptors/deadline.interceptor.ts`

```ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import type { FastifyRequest } from 'fastify';
import { ParseException } from '../errors/parse.exception';
import type { AppConfig } from '../../config/config.schema';

/**
 * Backstop deadline for the whole request. Individual stages have their own
 * timeouts; this exists so a stage that fails to honour its own timeout still
 * cannot hold the caller past its budget. A request that hangs is worse than
 * one that fails.
 */
@Injectable()
export class DeadlineInterceptor implements NestInterceptor {
  private readonly deadlineMs: number;
  constructor(config: ConfigService<AppConfig, true>) {
    this.deadlineMs = config.get('REQUEST_DEADLINE_MS', { infer: true });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const cid = (request.headers['x-correlation-id'] as string) ?? null;
    return next.handle().pipe(
      timeout(this.deadlineMs),
      catchError((err) =>
        err instanceof TimeoutError
          ? throwError(() => ParseException.deadlineExceeded(this.deadlineMs, cid))
          : throwError(() => err)),
    );
  }
}
```

---

## 6. File validation

Three checks, cheapest and most conclusive first. Full walkthrough and the `SIGNATURE_COMPATIBILITY` map are in `src/common/validation/file-validator.ts` — the signature check is the one that matters, because a renamed `.png` must never reach the model.

### 6.1 `src/common/validation/file-validator.ts`

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fileTypeFromBuffer } from 'file-type';
import { ParseException } from '../errors/parse.exception';
import type { AppConfig } from '../../config/config.schema';

export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

// Detected signature -> the declared types it may satisfy.
// DOCX is a ZIP container, reported as OOXML or plain zip. Legacy .doc is CFB.
const SIGNATURE_COMPATIBILITY: Record<string, readonly string[]> = {
  'application/pdf': ['application/pdf'],
  'application/x-cfb': ['application/msword'],
  'application/zip': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

@Injectable()
export class FileValidator {
  private readonly maxBytes: number;
  constructor(config: ConfigService<AppConfig, true>) {
    this.maxBytes = config.get('MAX_FILE_BYTES', { infer: true });
  }

  async validate(buffer: Buffer, declared: string, cid: string): Promise<AcceptedMimeType> {
    if (buffer.length === 0) throw ParseException.emptyFile(cid);
    if (buffer.length > this.maxBytes) throw ParseException.tooLarge(buffer.length, this.maxBytes, cid);
    if (!ACCEPTED_MIME_TYPES.includes(declared as AcceptedMimeType)) {
      throw ParseException.unsupportedType(declared, cid);
    }

    const detected = await fileTypeFromBuffer(buffer);
    if (!detected) throw ParseException.typeMismatch(declared, 'unknown', cid);

    const permitted = SIGNATURE_COMPATIBILITY[detected.mime] ?? [];
    if (!permitted.includes(declared)) throw ParseException.typeMismatch(declared, detected.mime, cid);

    return declared as AcceptedMimeType;
  }
}
```

---

## 7. The stub behind the port

Lets the endpoint build and test without a provider. Doc 05 replaces it.

### 7.1 `src/parsing/extraction.stub.ts`

```ts
import { Injectable } from '@nestjs/common';
import type { ExtractionInput, ExtractionOutput, ExtractionPort } from './extraction.port';
import { parseResultSchema } from './dto/response.schema';

/**
 * Deterministic stub. Registered only when NODE_ENV is not production — see
 * parsing.module.ts. Exists so the API layer is independently testable and so
 * contract tests do not depend on a paid service.
 */
@Injectable()
export class ExtractionStub implements ExtractionPort {
  async extract(_input: ExtractionInput): Promise<ExtractionOutput> {
    const result = parseResultSchema.parse({
      document_type: 'resume',
      is_resume: true,
      confidence: 0.94,
      name: 'Ada Lovelace',
      job_titles: ['Principal Engineer', 'Senior Engineer'],
      skills: [{ name: 'TypeScript' }, { name: 'Distributed Systems' }],
      work_experience: [{
        job_title: 'Principal Engineer', company: 'Analytical Engines Ltd',
        start_date: '2021-03', end_date: null, description: null,
      }],
      education: [{
        institution: 'University of London', degree: 'BSc Mathematics',
        field_of_study: 'Mathematics', start_date: '2012', end_date: '2015',
      }],
      certifications: [{ name: 'Certified Kubernetes Administrator', issuing_body: null }],
    });

    return {
      result, modelAttempts: 1,
      detectedLanguages: ['en'], truncated: false, extractedCharacters: 4180,
    };
  }
}
```

---

## 8. Service and controller

### 8.1 `src/parsing/parsing.service.ts`

```ts
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { EXTRACTION_PORT, type ExtractionPort } from './extraction.port';
import type { ParseRequestDto } from './dto/parse-request.dto';
import type { ParseResponseDto } from './dto/parse-response.dto';
import type { AppConfig } from '../config/config.schema';

@Injectable()
export class ParsingService {
  private readonly confidenceThreshold: number;

  constructor(
    @Inject(EXTRACTION_PORT) private readonly extraction: ExtractionPort,
    private readonly logger: PinoLogger,
    config: ConfigService<AppConfig, true>,
  ) {
    this.logger.setContext(ParsingService.name);
    this.confidenceThreshold = config.get('CONFIDENCE_THRESHOLD', { infer: true });
  }

  async parse(request: ParseRequestDto): Promise<ParseResponseDto> {
    const startedAt = Date.now();

    const { result, modelAttempts, detectedLanguages, truncated, extractedCharacters } =
      await this.extraction.extract({
        buffer: request.buffer,
        mimeType: request.mimeType,
        correlationId: request.correlationId,
      });

    const processingMs = Date.now() - startedAt;

    // Log the SHAPE of the outcome, never its content. Counts, not values.
    // No name, no company, no skill. A resume is personal data and a log
    // aggregator is not where it belongs. Confidence distribution here is the
    // signal used to tune the 0.7 threshold after the first 100 uploads.
    this.logger.info({
      correlationId: request.correlationId,
      documentType: result.document_type,
      isResume: result.is_resume,
      confidence: result.confidence,
      fileBytes: request.buffer.length,
      mimeType: request.mimeType,
      modelAttempts, processingMs, detectedLanguages, truncated, extractedCharacters,
      counts: {
        jobTitles: result.job_titles.length,
        skills: result.skills.length,
        workExperience: result.work_experience.length,
        education: result.education.length,
        certifications: result.certifications.length,
      },
    }, 'Parse completed');

    return {
      result,
      meta: {
        correlationId: request.correlationId,
        idempotencyKey: request.idempotencyKey,
        confidenceThreshold: this.confidenceThreshold,
        processingMs, modelAttempts, detectedLanguages, truncated, extractedCharacters,
      },
    };
  }
}
```

> **Read the log call carefully.** It records counts, never values. This is the single easiest privacy mistake to make in this service and the hardest to undo once personal data reaches a retention system.

### 8.2 `src/parsing/parsing.controller.ts`

```ts
import { Controller, HttpCode, HttpStatus, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ParsingService } from './parsing.service';
import { FileValidator } from '../common/validation/file-validator';
import { ServiceAuthGuard } from '../common/guards/service-auth.guard';
import { CorrelationInterceptor } from '../common/interceptors/correlation.interceptor';
import { DeadlineInterceptor } from '../common/interceptors/deadline.interceptor';
import { ParseException } from '../common/errors/parse.exception';
import type { ParseResponseDto } from './dto/parse-response.dto';

@Controller({ path: 'parse', version: '1' })
@UseGuards(ServiceAuthGuard)
@UseInterceptors(CorrelationInterceptor, DeadlineInterceptor)
export class ParsingController {
  constructor(
    private readonly parsing: ParsingService,
    private readonly fileValidator: FileValidator,
  ) {}

  /**
   * POST /v1/parse — multipart/form-data, one `file` part.
   * Headers: authorization, x-correlation-id, x-idempotency-key.
   *
   * Returns 200 for any successful classification, INCLUDING is_resume: false.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async parse(@Req() request: FastifyRequest): Promise<ParseResponseDto> {
    const cid = request.headers['x-correlation-id'] as string;
    const idem = request.headers['x-idempotency-key'] as string;

    const part = await request.file();
    if (!part) throw ParseException.missingFile(cid);

    // toBuffer() throws if @fastify/multipart's byte limit is exceeded, so an
    // oversized upload is cut off mid-stream rather than fully buffered first.
    let buffer: Buffer;
    try {
      buffer = await part.toBuffer();
    } catch {
      throw ParseException.tooLarge(-1, -1, cid);
    }

    const mimeType = await this.fileValidator.validate(buffer, part.mimetype, cid);

    return this.parsing.parse({ buffer, mimeType, correlationId: cid, idempotencyKey: idem });
  }
}
```

### 8.3 `src/parsing/parsing.module.ts`

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ParsingController } from './parsing.controller';
import { ParsingService } from './parsing.service';
import { FileValidator } from '../common/validation/file-validator';
import { EXTRACTION_PORT } from './extraction.port';
import { ExtractionStub } from './extraction.stub';
import type { AppConfig } from '../config/config.schema';

@Module({
  controllers: [ParsingController],
  providers: [
    ParsingService,
    FileValidator,
    ExtractionStub,
    {
      provide: EXTRACTION_PORT,
      // Doc 05 replaces this factory with the real pipeline. The guard makes it
      // impossible to ship the stub to production by accident — the service
      // refuses to start. A stub that silently returns the same fake resume for
      // every upload is invisible in monitoring: every request succeeds,
      // latency is excellent, error rate is zero. Boot failure is the only
      // reliable protection.
      useFactory: (config: ConfigService<AppConfig, true>, stub: ExtractionStub) => {
        if (config.get('NODE_ENV', { infer: true }) === 'production') {
          throw new Error(
            'ExtractionStub must not be used in production. Wire the real pipeline (Doc 05).',
          );
        }
        return stub;
      },
      inject: [ConfigService, ExtractionStub],
    },
  ],
})
export class ParsingModule {}
```

### 8.4 Register the global filter

Add to `src/app.module.ts` providers (from Doc 02):

```ts
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';

// inside @Module({ ... })
providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
```

---

## 9. Verifying by hand

`$TOKEN` is the value from your `.env`.

```bash
# from apps/resume-parsing-service
TOKEN=$(grep SERVICE_AUTH_TOKEN .env | cut -d= -f2)
printf '%%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%%%EOF' > /tmp/test.pdf
```

| Case | Expect |
|---|---|
| Valid PDF, all headers | `200`, `is_resume: true` |
| No `Authorization` | `401 UNAUTHORIZED` |
| No `x-correlation-id` | `400 MISSING_CORRELATION_ID` |
| Renamed PNG as `.pdf` | `415 TYPE_MISMATCH` |
| Zero-byte file | `400 EMPTY_FILE` |

Happy path:

```bash
curl -i -X POST http://localhost:3002/v1/parse \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-correlation-id: test-001" \
  -H "x-idempotency-key: idem-001" \
  -F "file=@/tmp/test.pdf;type=application/pdf"
```

Renamed image — the check most worth confirming:

```bash
printf '\x89PNG\r\n\x1a\n' > /tmp/fake.pdf
curl -i -X POST http://localhost:3002/v1/parse \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-correlation-id: test-004" \
  -H "x-idempotency-key: idem-004" \
  -F "file=@/tmp/fake.pdf;type=application/pdf"
# → 415, "code":"TYPE_MISMATCH"
```

---

## 10. Contract tests

These assert the contract itself, not the extraction logic, so they must keep passing when the real pipeline replaces the stub. If a change here breaks them, it is a breaking change for `user-service`.

### 10.1 `test/contract.e2e-spec.ts`

```ts
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { ParseErrorCode } from '../src/common/errors/error-codes';

const TOKEN = process.env.SERVICE_AUTH_TOKEN as string;
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('POST /v1/parse — contract', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = ref.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ bodyLimit: 6 * 1024 * 1024 }));
    await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } });
    app.enableVersioning();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(async () => { await app.close(); });

  function body(buffer: Buffer, contentType: string) {
    const boundary = '----contracttest';
    const head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="r.pdf"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`);
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
    return { payload: Buffer.concat([head, buffer, tail]),
             contentType: `multipart/form-data; boundary=${boundary}` };
  }
  function post(buffer: Buffer, ct = 'application/pdf', h: Record<string, string> = {}) {
    const b = body(buffer, ct);
    return app.inject({ method: 'POST', url: '/v1/parse',
      headers: { authorization: `Bearer ${TOKEN}`, 'x-correlation-id': 'cid-test',
        'x-idempotency-key': 'idem-test', 'content-type': b.contentType, ...h },
      payload: b.payload });
  }

  it('200 with a valid result, echoes correlation id', async () => {
    const res = await post(PDF);
    expect(res.statusCode).toBe(200);
    const j = res.json();
    expect(j.result.is_resume).toBe(true);
    expect(j.meta.correlationId).toBe('cid-test');
    expect(res.headers['x-correlation-id']).toBe('cid-test');
  });
  it('always returns every array field', async () => {
    const j = (await post(PDF)).json();
    for (const k of ['job_titles','skills','work_experience','education','certifications'])
      expect(Array.isArray(j.result[k])).toBe(true);
  });
  it('meta carries the observability signals', async () => {
    const j = (await post(PDF)).json();
    expect(Array.isArray(j.meta.detectedLanguages)).toBe(true);
    expect(typeof j.meta.truncated).toBe('boolean');
    expect(typeof j.meta.extractedCharacters).toBe('number');
  });
  it('401 on missing token', async () => {
    const res = await post(PDF, 'application/pdf', { authorization: '' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe(ParseErrorCode.UNAUTHORIZED);
  });
  it('400 on missing correlation id', async () => {
    const res = await post(PDF, 'application/pdf', { 'x-correlation-id': '' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe(ParseErrorCode.MISSING_CORRELATION_ID);
  });
  it('400 on missing idempotency key', async () => {
    const res = await post(PDF, 'application/pdf', { 'x-idempotency-key': '' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe(ParseErrorCode.MISSING_IDEMPOTENCY_KEY);
  });
  it('400 on empty file', async () => {
    const res = await post(Buffer.alloc(0));
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe(ParseErrorCode.EMPTY_FILE);
  });
  it('415 on unsupported declared type', async () => {
    const res = await post(PDF, 'image/png');
    expect(res.statusCode).toBe(415);
    expect(res.json().error.code).toBe(ParseErrorCode.UNSUPPORTED_TYPE);
  });
  it('415 TYPE_MISMATCH on a renamed image', async () => {
    const res = await post(PNG, 'application/pdf');
    expect(res.statusCode).toBe(415);
    expect(res.json().error.code).toBe(ParseErrorCode.TYPE_MISMATCH);
  });
  it('marks permanent failures not retryable', async () => {
    expect((await post(PNG, 'application/pdf')).json().error.retryable).toBe(false);
  });
  it('never leaks the token in an error body', async () => {
    expect(JSON.stringify((await post(PNG, 'application/pdf')).json())).not.toContain(TOKEN);
  });
});
```

Run:

```bash
# from apps/resume-parsing-service
npm test
```

---

## 11. The contract for `user-service`

Hand this to whoever integrates on the calling side.

### 11.1 Request

```
POST /v1/parse
Authorization:      Bearer <SERVICE_AUTH_TOKEN>
x-correlation-id:   <traces the request across both services>
x-idempotency-key:  <stable across retries of the same file>
Content-Type:       multipart/form-data

file: <the document, ≤ 5MB, PDF/DOC/DOCX>
```

### 11.2 Success — `200`

```json
{
  "result": {
    "document_type": "resume", "is_resume": true, "confidence": 0.94,
    "name": "Ada Lovelace",
    "job_titles": ["Principal Engineer", "Senior Engineer"],
    "skills": [{ "name": "TypeScript" }],
    "work_experience": [{ "job_title": "Principal Engineer",
      "company": "Analytical Engines Ltd", "start_date": "2021-03",
      "end_date": null, "description": null }],
    "education": [{ "institution": "University of London",
      "degree": "BSc Mathematics", "field_of_study": "Mathematics",
      "start_date": "2012", "end_date": "2015" }],
    "certifications": [{ "name": "Certified Kubernetes Administrator", "issuing_body": null }]
  },
  "meta": {
    "correlationId": "…", "idempotencyKey": "…", "confidenceThreshold": 0.7,
    "processingMs": 3241, "modelAttempts": 1,
    "detectedLanguages": ["en"], "truncated": false, "extractedCharacters": 4180
  }
}
```

### 11.3 Failure

```json
{
  "error": { "code": "TYPE_MISMATCH",
    "message": "Declared \"application/pdf\" but signature indicates \"image/png\".",
    "retryable": false },
  "correlationId": "…"
}
```

`message` is for your logs. **Do not show it to a talent** — talent-facing copy lives in the epic's Doc 08.

### 11.4 Mapping to talent-facing states

| This service returns | `user-service` status |
|---|---|
| `200`, `is_resume: true`, `confidence` ≥ 0.7 | `ready_for_review` |
| `200`, `is_resume: true`, every array empty | `nothing_found` — **store the file** |
| `200`, `is_resume: false` **or** `confidence` < 0.7 | `not_a_resume` — **store nothing** |
| `200` with `meta.truncated: true` | `ready_for_review`, **and tell the talent only the first part was read** |
| `400` / `413` / `415` | `invalid_type` / `too_large` |
| `422 PASSWORD_PROTECTED` | `password_protected` |
| `422 UNREADABLE_DOCUMENT` | `not_a_resume` |
| `422 DOCUMENT_TOO_LONG` | `not_a_resume` |
| `429` / `503` / `504` | Retry once, then `parse_failed` / `parse_timeout` |
| `500` | `parse_failed` |

**Three rules the caller owns, not us:**

1. The 0.7 floor is enforced by you. We return the score; you apply the threshold. Exactly `0.7` passes.
2. We do not distinguish `nothing_found`. We return `is_resume: true` with empty arrays; deciding that means "nothing found" — and that the file is still stored — is yours.
3. Retry only `429`/`503`/`504`, exactly once. Everything else fails identically on a retry.

---

## 12. Definition of done

- [ ] `POST /v1/parse` serves against the stub
- [ ] Every case in §9 returns the documented status and code
- [ ] All contract tests in §10 pass
- [ ] `NODE_ENV=production npm run start:prod` **fails at boot** with the stub error
- [ ] No log line contains a name, company, skill or any document content
- [ ] The error body never contains the token
- [ ] Error codes match those `user-service` maps in §11.4

---

## 13. What comes next

| Doc | Adds |
|---|---|
| **05 — Integrations** | Replaces `ExtractionStub` with the real pipeline: text extraction, the model client, the prompt, retry, truncation, fallback |
| **06 — Observability** | Metrics from the `meta` and log signals defined here |
| **07 — QA** | The fixture corpus and evaluation harness |
