// src/main/services/sync/api-client.ts
//
// Phase 4 — REST client for the time-tracking-service backend.
//
// Responsibilities (doc 13 + doc 16):
//   1. Own the axios instance with base URL + timeout.
//   2. Inject the bearer token on every request. Phase 5 owns the
//      keychain wiring; for now the client exposes `setAuthToken(token)`
//      which auth can call once it has one.
//   3. On a 401, refresh via `onUnauthorized` and transparently retry the
//      same request once (doc 15 §7) — no caller ever sees a stale-token
//      401 unless the refresh itself fails.
//   4. On 5xx / network errors / 408 / 429: exponential backoff + full
//      jitter per doc 16 §4, capped at MAX_RETRIES per single call. Note
//      that the outbox layer owns its own multi-cycle retry budget; this
//      layer is for the "transient blip" case where a single API call
//      should retry 1-2 times before surfacing failure.
//   5. zod validate every response body so bad servers can't poison the
//      main process.
//   6. Support AbortController so `close()` drains pending requests on
//      app quit.
//   7. Typed methods for every endpoint the desktop calls (doc 13 §2-13).
//
// This module is a pure function factory — no singletons, no side effects
// beyond the axios instance it owns, which makes it trivial to test in
// isolation with a mock adapter.

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import type { Logger } from 'pino';
import { z, ZodSchema } from 'zod';

// -----------------------------------------------------------------------------
// Response schemas (doc 13)
// -----------------------------------------------------------------------------

// export const HealthResponse = z.object({
//   status: z.literal('ok'),
//   version: z.string(),
//   uptime: z.number(),
// });
export const HealthResponse = z.object({
  status: z.literal('ok'),
}).passthrough();
export type HealthResponse = z.infer<typeof HealthResponse>;

export const ErrorEnvelope = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export const UserMirror = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  timezone: z.string(),
  currency: z.string(),
  pendingErasure: z.boolean(),
});
export type UserMirror = z.infer<typeof UserMirror>;

export const SessionResponse = z.object({
  id: z.string(),
  userId: z.string(),
  contractId: z.string(),
  taskId: z.string(),
  deviceId: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable().optional(),
  endReason: z.string().nullable().optional(),
  billableSeconds: z.number().int().nonnegative().optional(),
});
export type SessionResponse = z.infer<typeof SessionResponse>;

export const TimeEntryResponse = z.object({
  id: z.string(),
  sessionId: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable().optional(),
  durationSeconds: z.number().int().nonnegative(),
});
export type TimeEntryResponse = z.infer<typeof TimeEntryResponse>;

export const BreakEventResponse = z.object({
  id: z.string(),
  sessionId: z.string(),
  kind: z.enum(['paid', 'unpaid']),
  startedAt: z.string(),
  endedAt: z.string().nullable().optional(),
});
export type BreakEventResponse = z.infer<typeof BreakEventResponse>;

export const IdleEventResponse = z.object({
  id: z.string(),
  sessionId: z.string(),
  startedAt: z.string(),
  endedAt: z.string(),
  seconds: z.number().int().nonnegative(),
  resolution: z.enum(['keep', 'discard', 'convert_to_break']).nullable(),
});
export type IdleEventResponse = z.infer<typeof IdleEventResponse>;

export const ScreenshotUploadUrlResponse = z.object({
  uploadUrl: z.string().url(),
  key: z.string(),
  expiresAt: z.string(),
});
export type ScreenshotUploadUrlResponse = z.infer<
  typeof ScreenshotUploadUrlResponse
>;

export const ScreenshotConfirmResponse = z.object({
  id: z.string(),
  sessionId: z.string(),
  key: z.string(),
  takenAt: z.string(),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
  sensitive: z.boolean(),
});
export type ScreenshotConfirmResponse = z.infer<
  typeof ScreenshotConfirmResponse
>;

export const ActivityBatchResponse = z.object({
  accepted: z.number().int().nonnegative(),
});
export type ActivityBatchResponse = z.infer<typeof ActivityBatchResponse>;

export const RealtimeTokenResponse = z.object({
  token: z.string().min(1),
});
export type RealtimeTokenResponse = z.infer<typeof RealtimeTokenResponse>;

export const DeviceRegisterResponse = z.object({
  deviceId: z.string(),
});
export type DeviceRegisterResponse = z.infer<typeof DeviceRegisterResponse>;

// -----------------------------------------------------------------------------
// Internal retry helpers
// -----------------------------------------------------------------------------

export interface RetryPolicy {
  /** Max retries per single call. Outbox owns its own multi-cycle budget. */
  maxRetries: number;
  /** Base delay in ms for the exponential curve (doc 16 §4). */
  baseDelayMs: number;
  /** Upper bound on computed delay (ms). */
  maxDelayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  baseDelayMs: 2_000,
  maxDelayMs: 30_000,
};

/** Full-jitter exponential backoff — doc 16 §4. */
export function backoffDelay(
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): number {
  const exp = Math.min(
    policy.maxDelayMs,
    policy.baseDelayMs * Math.pow(2, attempt),
  );
  // full jitter: uniform [0, exp]
  return Math.floor(Math.random() * exp);
}

/** Returns true if an axios error should be retried per doc 16 §4. */
export function isRetryableAxiosError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  const ax = err as AxiosError;
  // Network / timeout / aborted — retry.
  if (!ax.response) return true;
  const s = ax.response.status;
  if (s === 408 || s === 429) return true;
  if (s >= 500 && s <= 599) return true;
  return false;
}

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export interface ApiClientConfig {
  baseUrl: string;
  /** Per-request timeout in ms. Defaults to 15 000. */
  timeoutMs?: number;
  /** Retry policy; the outbox overrides this for queued writes. */
  retryPolicy?: RetryPolicy;
  /** Optional pre-seeded token (e.g. a Phase 5 test fixture). */
  initialToken?: string | null;
  /**
   * doc 15 §7: called on a 401 to obtain a fresh token before transparently
   * retrying the same request once. Resolves true if a fresh token is now
   * set (via setAuthToken), false if refresh failed (e.g. the refresh
   * token itself was revoked) — in which case the original 401 is returned
   * as-is and the caller (e.g. the doc 16 sync queue) treats it like any
   * other non-retryable 4xx.
   */
  onUnauthorized?: () => Promise<boolean>;
  /** Injected logger. */
  logger?: Logger;
  /** Injected axios for tests. */
  axiosInstance?: AxiosInstance;
  /** Clock injected for deterministic tests. */
  now?: () => number;
}

export interface RawRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  idempotencyKey?: string;
  /** Short-circuit the retry loop (used by the outbox which owns its own). */
  noRetry?: boolean;
  /** Per-request timeout override. */
  timeoutMs?: number;
  /** Abort signal for cancellation. */
  signal?: AbortSignal;
}

export type ApiClient = ReturnType<typeof createApiClient>;

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------

export function createApiClient(config: ApiClientConfig) {
  const log = config.logger?.child({ svc: 'api-client' });
  const now = config.now ?? Date.now;
  const timeoutMs = config.timeoutMs ?? 15_000;
  const retryPolicy = config.retryPolicy ?? DEFAULT_RETRY_POLICY;
  const abortController = new AbortController();
  let authToken: string | null = config.initialToken ?? null;
  let closed = false;

  const client: AxiosInstance =
    config.axiosInstance ??
    axios.create({
      baseURL: config.baseUrl.replace(/\/+$/, ''),
      timeout: timeoutMs,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      // Do not throw on 4xx — let our code map them.
      validateStatus: () => true,
    });

  // ---- Request interceptor: attach bearer token -----------------------------
  client.interceptors.request.use((req: InternalAxiosRequestConfig) => {
    if (authToken) {
      req.headers.set('Authorization', `Bearer ${authToken}`);
    }
    return req;
  });

  // ---------------------------------------------------------------------------
  // Core request helper
  // ---------------------------------------------------------------------------

  async function rawRequest(
    options: RawRequestOptions,
  ): Promise<AxiosResponse<unknown>> {
    if (closed) {
      throw new Error('api-client closed');
    }
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const axiosCfg: AxiosRequestConfig = {
      method: options.method,
      url: options.path,
      data: options.body,
      headers,
      timeout: options.timeoutMs ?? timeoutMs,
      signal: options.signal ?? abortController.signal,
    };

    let attempt = 0;
    let authRetried = false;
    // attempt = 0 is the initial try; attempts 1..maxRetries are retries.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const resp = await client.request(axiosCfg);

        // doc 15 §7: on a 401, refresh and transparently retry the same
        // request once — unconditional on `noRetry`, since this is
        // authentication plumbing, not the doc 16 retry/backoff policy.
        // Every caller (typed helpers and the outbox's raw() escape hatch
        // alike) gets "no stale tokens are possible" for free.
        if (resp.status === 401 && !authRetried && config.onUnauthorized) {
          authRetried = true;
          let refreshed = false;
          try {
            refreshed = await config.onUnauthorized();
          } catch (e) {
            log?.warn({ e }, 'onUnauthorized threw');
          }
          if (refreshed) {
            log?.debug({ path: options.path }, '401 — refreshed, retrying once');
            continue;
          }
          log?.warn({ path: options.path }, '401 — refresh failed, returning as final');
        }

        // Retry on retryable HTTP status even though axios didn't throw
        // (validateStatus: () => true).
        if (shouldRetryStatus(resp.status) && !options.noRetry) {
          if (attempt < retryPolicy.maxRetries) {
            attempt++;
            const delay = backoffDelay(attempt, retryPolicy);
            log?.debug(
              { path: options.path, status: resp.status, attempt, delay },
              'retryable HTTP status — backing off',
            );
            await sleep(delay, options.signal);
            continue;
          }
        }
        return resp;
      } catch (err) {
        if (options.noRetry || attempt >= retryPolicy.maxRetries) {
          throw err;
        }
        if (!isRetryableAxiosError(err)) {
          throw err;
        }
        attempt++;
        const delay = backoffDelay(attempt, retryPolicy);
        log?.debug(
          { path: options.path, err: describeErr(err), attempt, delay },
          'retryable network error — backing off',
        );
        await sleep(delay, options.signal);
      }
    }
  }

  function shouldRetryStatus(status: number): boolean {
    if (status === 408 || status === 429) return true;
    if (status >= 500 && status <= 599) return true;
    return false;
  }

  // ---------------------------------------------------------------------------
  // Typed helpers: parse with zod, throw on non-2xx.
  // ---------------------------------------------------------------------------

  async function requestJson<T>(
    schema: ZodSchema<T>,
    options: RawRequestOptions,
  ): Promise<T> {
    const resp = await rawRequest(options);
    if (resp.status < 200 || resp.status >= 300) {
      throw httpError(resp);
    }
    if (resp.status === 204) {
      // 204 No Content — caller should pass z.void()/z.null()
      return schema.parse(null);
    }
    return schema.parse(resp.data);
  }

  // ---------------------------------------------------------------------------
  // Public typed endpoints (doc 13)
  // ---------------------------------------------------------------------------

  return {
    // lifecycle -------------------------------------------------------------
    setAuthToken(token: string | null): void {
      authToken = token;
    },
    getAuthToken(): string | null {
      return authToken;
    },
    close(): void {
      if (closed) return;
      closed = true;
      try {
        abortController.abort();
      } catch {
        /* ignore */
      }
    },
    // low-level escape hatch used by the outbox
    raw: rawRequest,

    // health ----------------------------------------------------------------
    async health(opts?: { timeoutMs?: number; signal?: AbortSignal }): Promise<HealthResponse> {
      return requestJson(HealthResponse, {
        method: 'GET',
        path: '/health',
        timeoutMs: opts?.timeoutMs,
        signal: opts?.signal,
        noRetry: true,
      });
    },

    // user ------------------------------------------------------------------
    async getMe(): Promise<UserMirror> {
      return requestJson(UserMirror, { method: 'GET', path: '/me' });
    },

    // devices ---------------------------------------------------------------
    async registerDevice(input: {
      id: string;
      installationUuid: string;
      osName: string;
      osVersion: string;
      appVersion: string;
      arch: string;
      idempotencyKey: string;
    }): Promise<DeviceRegisterResponse> {
      const { idempotencyKey, ...body } = input;
      return requestJson(DeviceRegisterResponse, {
        method: 'POST',
        path: '/devices/register',
        body,
        idempotencyKey,
      });
    },

    async deviceHeartbeat(input: {
      deviceId: string;
      appVersion: string;
      timerState: string;
      idempotencyKey: string;
    }): Promise<void> {
      const { idempotencyKey, ...body } = input;
      const resp = await rawRequest({
        method: 'POST',
        path: '/devices/heartbeat',
        body,
        idempotencyKey,
      });
      if (resp.status !== 204 && (resp.status < 200 || resp.status >= 300)) {
        throw httpError(resp);
      }
    },

    // sessions --------------------------------------------------------------
    async startSession(input: {
      id: string;
      contractId: string;
      taskId: string;
      deviceId: string;
      startedAt: number;
      idempotencyKey: string;
    }): Promise<SessionResponse> {
      const { idempotencyKey, ...body } = input;
      return requestJson(SessionResponse, {
        method: 'POST',
        path: '/sessions',
        body,
        idempotencyKey,
      });
    },

    async closeSession(input: {
      sessionId: string;
      endedAt: number;
      reason: string;
      billableSeconds: number;
      idempotencyKey: string;
    }): Promise<SessionResponse> {
      const { sessionId, idempotencyKey, ...body } = input;
      return requestJson(SessionResponse, {
        method: 'POST',
        path: `/sessions/${encodeURIComponent(sessionId)}/close`,
        body,
        idempotencyKey,
      });
    },

    async takeOverSession(input: {
      sessionId: string;
      deviceId: string;
      idempotencyKey: string;
    }): Promise<SessionResponse> {
      const { sessionId, idempotencyKey, ...body } = input;
      return requestJson(SessionResponse, {
        method: 'POST',
        path: `/sessions/${encodeURIComponent(sessionId)}/take-over`,
        body,
        idempotencyKey,
      });
    },

    // time entries ----------------------------------------------------------
    async createTimeEntry(input: {
      sessionId: string;
      id: string;
      startedAt: number;
      endedAt: number | null;
      durationSeconds: number;
      idempotencyKey: string;
    }): Promise<TimeEntryResponse> {
      const { sessionId, idempotencyKey, ...body } = input;
      return requestJson(TimeEntryResponse, {
        method: 'POST',
        path: `/sessions/${encodeURIComponent(sessionId)}/entries`,
        body,
        idempotencyKey,
      });
    },

    async patchTimeEntry(input: {
      id: string;
      endedAt: number;
      durationSeconds: number;
      idempotencyKey: string;
    }): Promise<TimeEntryResponse> {
      const { id, idempotencyKey, ...body } = input;
      return requestJson(TimeEntryResponse, {
        method: 'PATCH',
        path: `/entries/${encodeURIComponent(id)}`,
        body,
        idempotencyKey,
      });
    },

    // breaks ----------------------------------------------------------------
    async startBreak(input: {
      sessionId: string;
      id: string;
      kind: 'paid' | 'unpaid';
      startedAt: number;
      idempotencyKey: string;
    }): Promise<BreakEventResponse> {
      const { sessionId, idempotencyKey, ...body } = input;
      return requestJson(BreakEventResponse, {
        method: 'POST',
        path: `/sessions/${encodeURIComponent(sessionId)}/breaks`,
        body,
        idempotencyKey,
      });
    },

    async endBreak(input: {
      id: string;
      endedAt: number;
      idempotencyKey: string;
    }): Promise<BreakEventResponse> {
      const { id, idempotencyKey, ...body } = input;
      return requestJson(BreakEventResponse, {
        method: 'PATCH',
        path: `/breaks/${encodeURIComponent(id)}`,
        body,
        idempotencyKey,
      });
    },

    // idles -----------------------------------------------------------------
    async createIdleEvent(input: {
      sessionId: string;
      id: string;
      startedAt: number;
      endedAt: number;
      seconds: number;
      resolution: 'keep' | 'discard' | 'convert_to_break';
      idempotencyKey: string;
    }): Promise<IdleEventResponse> {
      const { sessionId, idempotencyKey, ...body } = input;
      return requestJson(IdleEventResponse, {
        method: 'POST',
        path: `/sessions/${encodeURIComponent(sessionId)}/idles`,
        body,
        idempotencyKey,
      });
    },

    // screenshots -----------------------------------------------------------
    async requestScreenshotUploadUrl(input: {
      sessionId: string;
      takenAt: number;
      width: number;
      height: number;
      bytes: number;
      idempotencyKey: string;
    }): Promise<ScreenshotUploadUrlResponse> {
      const { idempotencyKey, ...body } = input;
      return requestJson(ScreenshotUploadUrlResponse, {
        method: 'POST',
        path: '/screenshots/upload-url',
        body,
        idempotencyKey,
      });
    },

    async putScreenshotBytes(input: {
      uploadUrl: string;
      bytes: Buffer;
      contentType: string;
      signal?: AbortSignal;
    }): Promise<void> {
      // Pre-signed PUT goes directly to R2; it is not under our base URL.
      // We use a raw axios call bypassing the bearer interceptor.
      const resp = await axios.put(input.uploadUrl, input.bytes, {
        headers: { 'Content-Type': input.contentType },
        timeout: Math.max(timeoutMs, 60_000),
        validateStatus: () => true,
        signal: input.signal ?? abortController.signal,
      });
      if (resp.status < 200 || resp.status >= 300) {
        throw httpError(resp);
      }
    },

    async confirmScreenshot(input: {
      id: string;
      sessionId: string;
      key: string;
      takenAt: number;
      width: number;
      height: number;
      bytes: number;
      sensitive: boolean;
      idempotencyKey: string;
    }): Promise<ScreenshotConfirmResponse> {
      const { idempotencyKey, ...body } = input;
      return requestJson(ScreenshotConfirmResponse, {
        method: 'POST',
        path: '/screenshots/confirm',
        body,
        idempotencyKey,
      });
    },

    // activity --------------------------------------------------------------
    async postActivityBatch(input: {
      sessionId: string;
      minutes: Array<{ id: string; minuteStartAt: number; active: boolean }>;
      idempotencyKey: string;
    }): Promise<ActivityBatchResponse> {
      const { sessionId, idempotencyKey, minutes } = input;
      return requestJson(ActivityBatchResponse, {
        method: 'POST',
        path: `/sessions/${encodeURIComponent(sessionId)}/activity`,
        body: { minutes },
        idempotencyKey,
      });
    },

    // realtime --------------------------------------------------------------
    async requestRealtimeToken(deviceId: string): Promise<RealtimeTokenResponse> {
      return requestJson(RealtimeTokenResponse, {
        method: 'POST',
        path: '/realtime/token',
        body: { deviceId },
      });
    },

    // diagnostics -----------------------------------------------------------
    _internal: {
      get isClosed() {
        return closed;
      },
      get lastAttemptNow() {
        return now();
      },
    },
  };
}

// -----------------------------------------------------------------------------
// Helpers (exported for tests)
// -----------------------------------------------------------------------------

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function httpError(resp: AxiosResponse<unknown>): HttpError {
  const parsed = ErrorEnvelope.safeParse(resp.data);
  if (parsed.success) {
    return new HttpError(
      resp.status,
      parsed.data.error.code,
      parsed.data.error.message,
      parsed.data.error.details,
    );
  }
  return new HttpError(
    resp.status,
    `HTTP_${resp.status}`,
    `HTTP ${resp.status}`,
    resp.data,
  );
}

export function describeErr(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('aborted'));
      return;
    }
    const t = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      cleanup();
      reject(new Error('aborted'));
    };
    const cleanup = () => {
      if (signal) signal.removeEventListener('abort', onAbort);
    };
    if (signal) signal.addEventListener('abort', onAbort);
  });
}
