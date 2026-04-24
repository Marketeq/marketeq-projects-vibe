// src/main/services/auth/auth-service.ts
//
// Phase 5 — Authentication & Session Management.
//
// Implements doc 15 end-to-end for the desktop main process:
//   * POST /auth/login → stores refresh token in OS keychain, keeps access
//     token in memory, mirrors user profile.
//   * POST /auth/refresh → silent refresh 60 s before expiry, handles
//     rotation if the server returns a new refresh token.
//   * POST /auth/logout → best-effort server revoke + local cleanup.
//   * Automatic refresh scheduling via setTimeout.
//   * 401 handling from any caller → triggers refresh; if refresh fails,
//     forces sign-out.
//   * Client-side lockout ledger (doc 13 §15): 5 failed attempts per
//     300 seconds → local lock + emits `auth:locked-out`.
//   * Session lifecycle guard: forced sign-out stops the timer first.
//   * Pluggable `onTokenChange` for the Phase 4 api-client hook.
//
// IMPORTANT: this file DOES NOT import from Phase 4 sync. It exposes an
// `onTokenChange` subscription + an optional `apiClient` adapter so the
// sync layer can wire itself in when it lands, without creating a hard
// dependency here.
//
// All boundary I/O is validated via zod.

import { EventEmitter } from 'node:events';
import { z } from 'zod';
import type { Logger } from 'pino';
import type { Repos } from '../../db/repos';
import { createTokenStore, type TokenStore } from './token-store';
import type {
  AuthLockedOutPayload,
  AuthLoginErrorCode,
  AuthLoginResult,
  AuthNeedsLoginPayload,
  AuthStatus,
  AuthStatusChangedPayload,
  AuthUserMirror,
} from '../../../shared/ipc-contracts';

// ---------------------------------------------------------------------------
// Constants (doc 13 §15, doc 15 §3)
// ---------------------------------------------------------------------------

/** Server login throttle window (per doc 13 §15 — 5 req / 300 s). */
export const LOGIN_RATE_LIMIT_WINDOW_MS = 300_000;
/** Max local failed attempts before we soft-lock. */
export const LOGIN_MAX_ATTEMPTS = 5;
/** How long we soft-lock for once LOGIN_MAX_ATTEMPTS is reached. */
export const LOGIN_LOCKOUT_DURATION_MS = 15 * 60_000;
/** Lead time before expiry to run a silent refresh. */
export const REFRESH_LEAD_MS = 60_000;
/** Minimum delay for the refresh scheduler to avoid tight loops. */
export const MIN_REFRESH_DELAY_MS = 5_000;
/** Number of retries the refresh loop will attempt on network error. */
export const REFRESH_RETRY_COUNT = 3;
/** Backoff between refresh retries. */
export const REFRESH_RETRY_BACKOFF_MS = 5_000;

// ---------------------------------------------------------------------------
// Wire schemas
// ---------------------------------------------------------------------------

const RawUserMirror = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().default(''),
  avatarUrl: z.string().nullable().optional(),
  timezone: z.string().default('UTC'),
  currency: z.string().default('USD'),
  pendingErasure: z.boolean().optional(),
});

const LoginResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().int().positive().default(604800),
  user: RawUserMirror,
});
type LoginResponse = z.infer<typeof LoginResponseSchema>;

const RefreshResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive().default(604800),
  /** Refresh token rotation is supported — optional field. */
  refreshToken: z.string().min(1).optional(),
});
type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

/** Normalize backend responses that may use snake_case keys. */
function normalizeLoginBody(raw: unknown): unknown {
  if (raw == null || typeof raw !== 'object') return raw;
  const r = raw as Record<string, unknown>;
  const user = r.user as Record<string, unknown> | undefined;
  return {
    accessToken: r.accessToken ?? r.access_token,
    refreshToken: r.refreshToken ?? r.refresh_token,
    expiresIn: r.expiresIn ?? r.expires_in ?? 604800,
    user: user
      ? {
          id: user.id,
          email: user.email,
          displayName:
            user.displayName ?? user.display_name ?? user.username ?? '',
          avatarUrl: user.avatarUrl ?? user.avatar_url ?? null,
          timezone: user.timezone ?? 'UTC',
          currency: user.currency ?? 'USD',
          pendingErasure: user.pendingErasure ?? false,
        }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// HTTP port — tiny abstraction so tests can inject a fake.
// ---------------------------------------------------------------------------

export interface AuthHttpResponse<T> {
  status: number;
  ok: boolean;
  body: T;
  headers: Record<string, string>;
}

export interface AuthHttpError extends Error {
  status: number;
  headers: Record<string, string>;
  body?: unknown;
}

export interface AuthHttpPort {
  post<T>(
    path: string,
    body: unknown,
    opts?: { bearer?: string | null; skipAuth?: boolean },
  ): Promise<AuthHttpResponse<T>>;
  get<T>(
    path: string,
    opts?: { bearer?: string | null },
  ): Promise<AuthHttpResponse<T>>;
}

// ---------------------------------------------------------------------------
// Optional api-client hook (Phase 4)
// ---------------------------------------------------------------------------

/** Subset of Phase-4 ApiClient this module cares about. */
export interface AuthApiClientHook {
  setAuthToken: (token: string | null) => void;
}

/** Timer stop port — avoids a hard import of the timer service. */
export interface AuthTimerPort {
  getCurrentState: () => string;
  stopTimer: (reason?: string) => Promise<unknown> | unknown;
  dispatch: (event: { type: string }) => Promise<unknown> | unknown;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export const AUTH_EVENTS = {
  loggedIn: 'auth:logged-in',
  loggedOut: 'auth:logged-out',
  statusChanged: 'auth:status-changed',
  needsLogin: 'auth:needs-login',
  lockedOut: 'auth:locked-out',
  tokenExpired: 'auth:token-expired',
} as const;
export type AuthEventName = (typeof AUTH_EVENTS)[keyof typeof AUTH_EVENTS];

export type AuthBusEvent =
  | { channel: typeof AUTH_EVENTS.loggedIn; payload: AuthStatus }
  | { channel: typeof AUTH_EVENTS.loggedOut; payload: { reason: string } }
  | {
      channel: typeof AUTH_EVENTS.statusChanged;
      payload: AuthStatusChangedPayload;
    }
  | { channel: typeof AUTH_EVENTS.needsLogin; payload: AuthNeedsLoginPayload }
  | { channel: typeof AUTH_EVENTS.lockedOut; payload: AuthLockedOutPayload };

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

export interface AuthServiceDeps {
  logger: Logger;
  repos: Pick<Repos, 'user' | 'authAttempts' | 'authSession'>;
  http: AuthHttpPort;
  tokenStore?: TokenStore;
  apiClient?: AuthApiClientHook;
  timer?: AuthTimerPort;
  /** Optional clock for tests. */
  now?: () => number;
  /** Optional setTimeout for tests (must match Node API). */
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createAuthService(deps: AuthServiceDeps) {
  const logger = deps.logger.child({ module: 'auth/auth-service' });
  const bus = new EventEmitter();
  const now = deps.now ?? Date.now;
  const schedule = deps.setTimeoutFn ?? setTimeout;
  const unschedule = deps.clearTimeoutFn ?? clearTimeout;

  const tokenStore =
    deps.tokenStore ?? createTokenStore({ logger: deps.logger });

  // --- in-memory state -----------------------------------------------------
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let expiresAt = 0;
  let currentUser: AuthUserMirror | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let refreshing: Promise<boolean> | null = null;
  let apiClient: AuthApiClientHook | null = deps.apiClient ?? null;
  const tokenChangeSubscribers = new Set<(token: string | null) => void>();

  // ------------------------------------------------------------------------
  // Event emission
  // ------------------------------------------------------------------------

  function emit<K extends AuthBusEvent['channel']>(
    channel: K,
    payload: Extract<AuthBusEvent, { channel: K }>['payload'],
  ): void {
    const evt = { channel, payload } as AuthBusEvent;
    bus.emit('event', evt);
    bus.emit(channel, payload);
  }

  function emitStatusChanged() {
    emit(AUTH_EVENTS.statusChanged, { status: getStatus() });
  }

  // ------------------------------------------------------------------------
  // Token change plumbing (Phase 4 api-client hook)
  // ------------------------------------------------------------------------

  function notifyTokenChange(token: string | null) {
    try {
      apiClient?.setAuthToken(token);
    } catch (err) {
      logger.warn({ err }, 'apiClient.setAuthToken threw');
    }
    for (const cb of tokenChangeSubscribers) {
      try {
        cb(token);
      } catch (err) {
        logger.warn({ err }, 'onTokenChange subscriber threw');
      }
    }
  }

  function onTokenChange(cb: (token: string | null) => void): () => void {
    tokenChangeSubscribers.add(cb);
    // Fire once with the current token so late subscribers get the truth.
    try {
      cb(accessToken);
    } catch (err) {
      logger.warn({ err }, 'onTokenChange initial callback threw');
    }
    return () => tokenChangeSubscribers.delete(cb);
  }

  function setApiClient(client: AuthApiClientHook | null) {
    apiClient = client;
    try {
      apiClient?.setAuthToken(accessToken);
    } catch (err) {
      logger.warn({ err }, 'setApiClient: setAuthToken threw');
    }
  }

  // ------------------------------------------------------------------------
  // Lockout ledger (client-side)
  // ------------------------------------------------------------------------

  /** Returns the locked-until timestamp (ms) if currently locked, else null. */
  function getLockoutFor(email: string): number | null {
    const row = deps.repos.authAttempts.find(email);
    if (!row) return null;
    if (row.locked_until && row.locked_until > now()) return row.locked_until;
    return null;
  }

  function recordFailure(email: string): {
    lockedUntil: number | null;
    failureCount: number;
  } {
    const t = now();
    const existing = deps.repos.authAttempts.find(email);
    // Window reset: if the oldest failure is outside the rate-limit window,
    // start a fresh counter.
    const windowStart = existing?.first_failure_at ?? t;
    const inWindow = t - windowStart <= LOGIN_RATE_LIMIT_WINDOW_MS;

    const failureCount = inWindow ? (existing?.failure_count ?? 0) + 1 : 1;
    const firstFailureAt = inWindow ? (existing?.first_failure_at ?? t) : t;

    let lockedUntil: number | null = existing?.locked_until ?? null;
    if (lockedUntil && lockedUntil <= t) lockedUntil = null;
    if (failureCount >= LOGIN_MAX_ATTEMPTS) {
      lockedUntil = t + LOGIN_LOCKOUT_DURATION_MS;
    }

    deps.repos.authAttempts.upsert({
      email: email.toLowerCase(),
      failure_count: failureCount,
      first_failure_at: firstFailureAt,
      last_failure_at: t,
      locked_until: lockedUntil,
    });

    return { lockedUntil, failureCount };
  }

  function clearFailures(email: string): void {
    deps.repos.authAttempts.clear(email);
  }

  function surfaceLockedOut(
    email: string,
    lockedUntil: number,
    reason: AuthLockedOutPayload['reason'],
  ) {
    emit(AUTH_EVENTS.lockedOut, { email, lockedUntil, reason });
  }

  // ------------------------------------------------------------------------
  // Login
  // ------------------------------------------------------------------------

  async function login(
    email: string,
    password: string,
  ): Promise<AuthLoginResult> {
    // Input validation
    const parsed = z
      .object({ email: z.string().email(), password: z.string().min(1) })
      .safeParse({ email, password });
    if (!parsed.success) {
      return {
        ok: false,
        code: 'ERR_AUTH_INVALID_INPUT',
        message: 'Invalid email or password format',
      };
    }
    const normalizedEmail = parsed.data.email.toLowerCase();

    // Client-side lockout check
    const lockedUntil = getLockoutFor(normalizedEmail);
    if (lockedUntil) {
      surfaceLockedOut(normalizedEmail, lockedUntil, 'local_attempts');
      return {
        ok: false,
        code: 'ERR_AUTH_LOCKED',
        message:
          'Too many failed sign-in attempts. Please wait before trying again.',
        lockedUntil,
      };
    }

    let res: AuthHttpResponse<unknown>;
    try {
      res = await deps.http.post('/auth/login', {
        email: normalizedEmail,
        password: parsed.data.password,
      });
    } catch (err) {
      const httpErr = err as AuthHttpError;
      if (typeof httpErr?.status === 'number') {
        return handleLoginHttpError(normalizedEmail, httpErr);
      }
      logger.warn({ err }, 'login: network error');
      return {
        ok: false,
        code: 'ERR_AUTH_NETWORK',
        message: 'Network error — please check your connection and retry.',
      };
    }

    if (!res.ok) {
      const syntheticErr: AuthHttpError = Object.assign(
        new Error(`login failed: ${res.status}`),
        { status: res.status, headers: res.headers, body: res.body },
      );
      return handleLoginHttpError(normalizedEmail, syntheticErr);
    }

    const bodyParsed = LoginResponseSchema.safeParse(normalizeLoginBody(res.body));
    if (!bodyParsed.success) {
      logger.error(
        { issues: bodyParsed.error.issues },
        'login: server response failed schema validation',
      );
      return {
        ok: false,
        code: 'ERR_AUTH_UNKNOWN',
        message: 'Sign-in failed: unexpected server response.',
      };
    }

    await applyLoginResponse(bodyParsed.data);
    clearFailures(normalizedEmail);

    emit(AUTH_EVENTS.loggedIn, getStatus());
    emitStatusChanged();

    return { ok: true, user: currentUser as AuthUserMirror, expiresAt };
  }

  function handleLoginHttpError(
    email: string,
    err: AuthHttpError,
  ): AuthLoginResult {
    const retryAfter = parseRetryAfter(err.headers);
    switch (err.status) {
      case 400:
      case 401: {
        const { lockedUntil, failureCount } = recordFailure(email);
        if (lockedUntil) {
          surfaceLockedOut(email, lockedUntil, 'local_attempts');
          return {
            ok: false,
            code: 'ERR_AUTH_LOCKED',
            message:
              'Too many failed sign-in attempts. Please wait before trying again.',
            lockedUntil,
          };
        }
        return {
          ok: false,
          code: 'ERR_AUTH_BAD_CREDENTIALS',
          message: `Invalid email or password. ${LOGIN_MAX_ATTEMPTS - failureCount} attempt(s) left.`,
        };
      }
      case 423: {
        // Server said the account is locked — mirror it locally.
        const lockUntil = retryAfter
          ? now() + retryAfter * 1000
          : now() + LOGIN_LOCKOUT_DURATION_MS;
        deps.repos.authAttempts.upsert({
          email: email.toLowerCase(),
          failure_count: LOGIN_MAX_ATTEMPTS,
          first_failure_at: now(),
          last_failure_at: now(),
          locked_until: lockUntil,
        });
        surfaceLockedOut(email, lockUntil, 'server_account_locked');
        return {
          ok: false,
          code: 'ERR_AUTH_LOCKED',
          message:
            'Your account is temporarily locked. Try again in a few minutes.',
          lockedUntil: lockUntil,
          retryAfterSec: retryAfter ?? undefined,
        };
      }
      case 429: {
        const lockUntil = retryAfter
          ? now() + retryAfter * 1000
          : now() + 60_000;
        surfaceLockedOut(email, lockUntil, 'server_rate_limit');
        return {
          ok: false,
          code: 'ERR_AUTH_RATE_LIMITED',
          message:
            'Too many sign-in attempts. Wait a moment and try again.',
          lockedUntil: lockUntil,
          retryAfterSec: retryAfter ?? undefined,
        };
      }
      case 503:
      case 502:
      case 504:
        return {
          ok: false,
          code: 'ERR_AUTH_SERVICE_DOWN',
          message: 'Sign-in service is unavailable. Please try again shortly.',
        };
      default:
        logger.warn(
          { status: err.status },
          'login: unhandled http error status',
        );
        return {
          ok: false,
          code: 'ERR_AUTH_UNKNOWN',
          message: 'Sign-in failed. Please try again.',
        };
    }
  }

  function parseRetryAfter(headers: Record<string, string>): number | null {
    const h = headers['retry-after'] ?? headers['Retry-After'];
    if (!h) return null;
    const n = Number(h);
    if (Number.isFinite(n) && n >= 0) return n;
    return null;
  }

  async function applyLoginResponse(body: LoginResponse): Promise<void> {
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
    expiresAt = now() + body.expiresIn * 1000;
    currentUser = normalizeUser(body.user);

    // Mirror the user into the local DB (same behaviour as doc 15 §6).
    try {
      deps.repos.user.upsert({
        id: currentUser.id,
        email: currentUser.email,
        display_name: currentUser.displayName,
        avatar_url: currentUser.avatarUrl,
        timezone: currentUser.timezone,
        currency: currentUser.currency,
        pending_erasure: currentUser.pendingErasure ? 1 : 0,
        mirrored_at: now(),
      });
    } catch (err) {
      logger.warn({ err }, 'failed to mirror user into local DB');
    }

    try {
      deps.repos.authSession.upsert({
        id: currentUser.id,
        user_id: currentUser.id,
        access_token_expires_at: expiresAt,
        refresh_token_ref: 'keychain',
        created_at: now(),
        updated_at: now(),
      });
    } catch (err) {
      logger.warn({ err }, 'failed to upsert auth_session');
    }

    try {
      await tokenStore.save({
        accessToken,
        refreshToken,
        expiresAt,
        userId: currentUser.id,
      });
    } catch (err) {
      logger.error({ err }, 'failed to persist token bundle');
    }

    notifyTokenChange(accessToken);
    scheduleRefresh();
  }

  function normalizeUser(
    raw: z.infer<typeof RawUserMirror>,
  ): AuthUserMirror {
    return {
      id: raw.id,
      email: raw.email,
      displayName: raw.displayName,
      avatarUrl: raw.avatarUrl ?? null,
      timezone: raw.timezone,
      currency: raw.currency,
      pendingErasure: raw.pendingErasure ?? false,
    };
  }

  // ------------------------------------------------------------------------
  // Refresh
  // ------------------------------------------------------------------------

  function scheduleRefresh() {
    if (refreshTimer) unschedule(refreshTimer);
    if (!accessToken) return;
    const delay = Math.max(
      expiresAt - now() - REFRESH_LEAD_MS,
      MIN_REFRESH_DELAY_MS,
    );
    refreshTimer = schedule(() => {
      void refresh();
    }, delay);
  }

  async function refresh(): Promise<boolean> {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      if (!refreshToken) {
        logger.warn('refresh: no refresh token available');
        await forceLogout('refresh_failed');
        return false;
      }
      let attempt = 0;
      while (attempt < REFRESH_RETRY_COUNT) {
        attempt += 1;
        try {
          const res = await deps.http.post<unknown>(
            '/auth/refresh',
            { deviceId: currentUser?.id ?? null },
            { bearer: refreshToken, skipAuth: true },
          );
          if (!res.ok) {
            if (res.status === 401) {
              logger.warn('refresh: 401 — refresh token revoked');
              await forceLogout('refresh_failed');
              return false;
            }
            throw Object.assign(
              new Error(`refresh failed: ${res.status}`),
              { status: res.status, headers: res.headers, body: res.body },
            ) as AuthHttpError;
          }
          const parsed = RefreshResponseSchema.safeParse(res.body);
          if (!parsed.success) {
            logger.error(
              { issues: parsed.error.issues },
              'refresh: invalid response shape',
            );
            await forceLogout('refresh_failed');
            return false;
          }
          accessToken = parsed.data.accessToken;
          expiresAt = now() + parsed.data.expiresIn * 1000;
          if (parsed.data.refreshToken) {
            // Rotation — persist the new refresh token.
            refreshToken = parsed.data.refreshToken;
          }
          if (currentUser && refreshToken) {
            try {
              await tokenStore.save({
                accessToken,
                refreshToken,
                expiresAt,
                userId: currentUser.id,
              });
            } catch (err) {
              logger.warn({ err }, 'refresh: failed to persist updated tokens');
            }
            try {
              deps.repos.authSession.upsert({
                id: currentUser.id,
                user_id: currentUser.id,
                access_token_expires_at: expiresAt,
                refresh_token_ref: 'keychain',
                created_at: now(),
                updated_at: now(),
              });
            } catch (err) {
              logger.warn({ err }, 'refresh: failed to upsert auth_session');
            }
          }
          notifyTokenChange(accessToken);
          scheduleRefresh();
          emitStatusChanged();
          logger.debug({ expiresAt }, 'access token refreshed');
          return true;
        } catch (err) {
          const httpErr = err as AuthHttpError;
          if (httpErr?.status === 401) {
            logger.warn('refresh: 401 thrown — refresh token revoked');
            await forceLogout('refresh_failed');
            return false;
          }
          logger.warn(
            { err, attempt },
            'refresh: network/unknown error, will retry',
          );
          if (attempt < REFRESH_RETRY_COUNT) {
            await sleep(REFRESH_RETRY_BACKOFF_MS);
            continue;
          }
        }
      }
      logger.error('refresh: all retries exhausted — forcing logout');
      await forceLogout('refresh_failed');
      return false;
    })();
    try {
      return await refreshing;
    } finally {
      refreshing = null;
    }
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => schedule(() => resolve(), ms));
  }

  // ------------------------------------------------------------------------
  // Logout / forced logout
  // ------------------------------------------------------------------------

  async function logout(): Promise<void> {
    // Force-stop any active timer session first so we don't leave the FSM
    // in a running state with no auth context (doc 15 §4 + doc 20 —
    // FORCED_SIGN_OUT is the only event that transitions from any state
    // to Idle).
    await haltActiveTimer('forced_signout');

    if (accessToken) {
      try {
        await deps.http.post(
          '/auth/logout',
          {},
          { bearer: accessToken },
        );
      } catch (err) {
        logger.warn({ err }, 'logout: backend revoke failed, continuing');
      }
    }

    await cleanup();
    emit(AUTH_EVENTS.loggedOut, { reason: 'user' });
    emit(AUTH_EVENTS.needsLogin, { reason: 'user_signed_out' });
    emitStatusChanged();
  }

  async function forceLogout(
    reason: AuthNeedsLoginPayload['reason'] = 'forced_sign_out',
  ): Promise<void> {
    await haltActiveTimer('forced_signout');
    await cleanup();
    emit(AUTH_EVENTS.loggedOut, { reason });
    emit(AUTH_EVENTS.needsLogin, { reason });
    emitStatusChanged();
  }

  async function haltActiveTimer(_reason: string): Promise<void> {
    if (!deps.timer) return;
    try {
      const state = deps.timer.getCurrentState();
      if (state === 'Idle') return;
      // Preferred path: FORCED_SIGN_OUT drives the FSM to Idle from any
      // state and triggers the force_close_active effect.
      await deps.timer.dispatch({ type: 'FORCED_SIGN_OUT' });
    } catch (err) {
      logger.warn(
        { err },
        'haltActiveTimer: dispatch(FORCED_SIGN_OUT) failed — falling back to stopTimer',
      );
      try {
        await deps.timer.stopTimer('forced_signout');
      } catch (err2) {
        logger.error(
          { err: err2 },
          'haltActiveTimer: stopTimer fallback also failed',
        );
      }
    }
  }

  async function cleanup(): Promise<void> {
    if (refreshTimer) {
      unschedule(refreshTimer);
      refreshTimer = null;
    }
    accessToken = null;
    refreshToken = null;
    expiresAt = 0;
    const prevUser = currentUser;
    currentUser = null;
    try {
      await tokenStore.clear();
    } catch (err) {
      logger.warn({ err }, 'cleanup: tokenStore.clear failed');
    }
    try {
      deps.repos.authSession.clear();
    } catch (err) {
      logger.warn({ err }, 'cleanup: auth_session clear failed');
    }
    notifyTokenChange(null);
    if (prevUser) {
      logger.info({ userId: prevUser.id }, 'user signed out');
    }
  }

  // ------------------------------------------------------------------------
  // 401 handler / token-expired event consumer
  // ------------------------------------------------------------------------

  /**
   * Called by the Phase 4 api-client (or any other caller) when it observes
   * a 401 from a TTS request. Triggers a silent refresh; if that fails,
   * forces sign-out.
   */
  async function handleUnauthorized(): Promise<boolean> {
    logger.debug('handleUnauthorized: triggering silent refresh');
    const ok = await refresh();
    if (!ok) return false;
    return accessToken != null;
  }

  // ------------------------------------------------------------------------
  // Session resume on app start
  // ------------------------------------------------------------------------

  async function tryResumeSession(): Promise<boolean> {
    const bundle = await tokenStore.load();
    if (!bundle) {
      emit(AUTH_EVENTS.needsLogin, { reason: 'no_session' });
      emitStatusChanged();
      return false;
    }

    // Rehydrate in-memory state from the keychain bundle.
    accessToken = bundle.accessToken;
    refreshToken = bundle.refreshToken;
    expiresAt = bundle.expiresAt;

    // Rehydrate the user mirror from the local DB.
    const userRow = deps.repos.user.findById(bundle.userId);
    if (userRow) {
      currentUser = {
        id: userRow.id,
        email: userRow.email,
        displayName: userRow.display_name,
        avatarUrl: userRow.avatar_url,
        timezone: userRow.timezone,
        currency: userRow.currency,
        pendingErasure: userRow.pending_erasure === 1,
      };
    } else {
      currentUser = null;
    }

    // If access token is already expired, try a silent refresh.
    if (expiresAt - now() <= MIN_REFRESH_DELAY_MS) {
      const ok = await refresh();
      if (!ok) return false;
    } else {
      scheduleRefresh();
      notifyTokenChange(accessToken);
    }

    emit(AUTH_EVENTS.loggedIn, getStatus());
    emitStatusChanged();
    return true;
  }

  // ------------------------------------------------------------------------
  // Status + introspection
  // ------------------------------------------------------------------------

  function getStatus(): AuthStatus {
    const email = currentUser?.email;
    const lockedUntil = email ? getLockoutFor(email) : null;
    return {
      isAuthenticated: accessToken != null && currentUser != null,
      user: currentUser,
      lockedUntil,
      expiresAt: accessToken ? expiresAt : null,
    };
  }

  function getAccessToken(): string | null {
    return accessToken;
  }

  function getCurrentUser(): AuthUserMirror | null {
    return currentUser;
  }

  function isAuthenticated(): boolean {
    return accessToken != null && currentUser != null;
  }

  function getLockoutForEmail(email: string): number | null {
    return getLockoutFor(email.toLowerCase());
  }

  // ------------------------------------------------------------------------
  // Event bus
  // ------------------------------------------------------------------------

  function attachEventBus(cb: (evt: AuthBusEvent) => void): () => void {
    const listener = (evt: AuthBusEvent) => cb(evt);
    bus.on('event', listener);
    return () => bus.off('event', listener);
  }

  function on<K extends AuthEventName>(
    channel: K,
    cb: (payload: unknown) => void,
  ): () => void {
    bus.on(channel, cb);
    return () => bus.off(channel, cb);
  }

  function dispose() {
    if (refreshTimer) {
      unschedule(refreshTimer);
      refreshTimer = null;
    }
    bus.removeAllListeners();
    tokenChangeSubscribers.clear();
  }

  return {
    login,
    logout,
    refresh,
    forceLogout,
    handleUnauthorized,
    tryResumeSession,
    getStatus,
    getAccessToken,
    getCurrentUser,
    isAuthenticated,
    getLockoutForEmail,
    onTokenChange,
    setApiClient,
    attachEventBus,
    on,
    dispose,
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
