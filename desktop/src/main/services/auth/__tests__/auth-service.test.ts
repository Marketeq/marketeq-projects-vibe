// src/main/services/auth/__tests__/auth-service.test.ts
//
// Exercises the AuthService login / refresh / logout / lockout surface
// with mocked HTTP, token store, repos, and timer ports.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import pino from 'pino';
import {
  createAuthService,
  LOGIN_LOCKOUT_DURATION_MS,
  LOGIN_MAX_ATTEMPTS,
  type AuthHttpError,
  type AuthHttpPort,
  type AuthHttpResponse,
  type AuthServiceDeps,
  type AuthTimerPort,
} from '../auth-service';
import type { TokenBundle } from '../token-store';
import type { AuthAttemptRow } from '../../../db/repos/auth-attempts.repo';
import type { UserRow, AuthSessionRow } from '../../../db/schema';

const logger = pino({ level: 'silent' });

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

function makeFakeAuthAttemptsRepo() {
  const store = new Map<string, AuthAttemptRow>();
  return {
    store,
    find(email: string) {
      return store.get(email.toLowerCase()) ?? null;
    },
    upsert(row: AuthAttemptRow) {
      store.set(row.email.toLowerCase(), { ...row });
    },
    clear(email: string) {
      store.delete(email.toLowerCase());
    },
    clearAll() {
      store.clear();
    },
  };
}

function makeFakeUserRepo() {
  const store = new Map<string, UserRow>();
  return {
    store,
    findById(id: string) {
      return store.get(id) ?? null;
    },
    findFirst() {
      return store.values().next().value ?? null;
    },
    upsert(row: UserRow) {
      store.set(row.id, row);
    },
    deleteAll() {
      store.clear();
    },
  };
}

function makeFakeAuthSessionRepo() {
  const rows: AuthSessionRow[] = [];
  return {
    rows,
    findCurrent() {
      return rows[rows.length - 1] ?? null;
    },
    upsert(row: AuthSessionRow) {
      const idx = rows.findIndex((r) => r.id === row.id);
      if (idx >= 0) rows[idx] = row;
      else rows.push(row);
    },
    clear() {
      rows.length = 0;
    },
  };
}

function makeFakeTokenStore() {
  let bundle: TokenBundle | null = null;
  return {
    async save(b: TokenBundle) {
      bundle = b;
    },
    async load() {
      return bundle;
    },
    async clear() {
      bundle = null;
    },
    async isPresent() {
      return bundle != null;
    },
    get current() {
      return bundle;
    },
  };
}

function makeHttpResponse<T>(body: T, overrides?: Partial<AuthHttpResponse<T>>): AuthHttpResponse<T> {
  return {
    status: 200,
    ok: true,
    body,
    headers: {},
    ...overrides,
  };
}

function httpError(
  status: number,
  headers: Record<string, string> = {},
  body: unknown = null,
): AuthHttpError {
  const err = new Error(`http_${status}`) as AuthHttpError;
  err.status = status;
  err.headers = headers;
  err.body = body;
  return err;
}

function makeFakeHttp(): AuthHttpPort & {
  calls: Array<{ method: string; path: string; body: unknown; opts?: unknown }>;
  queueResponse: (path: string, res: AuthHttpResponse<unknown> | AuthHttpError) => void;
} {
  const calls: Array<{ method: string; path: string; body: unknown; opts?: unknown }> = [];
  const responses: Map<string, Array<AuthHttpResponse<unknown> | AuthHttpError>> = new Map();

  function takeResponse(path: string) {
    const queue = responses.get(path);
    if (!queue || queue.length === 0) {
      throw new Error(`no response queued for ${path}`);
    }
    return queue.shift()!;
  }

  return {
    calls,
    queueResponse(path, res) {
      const q = responses.get(path) ?? [];
      q.push(res);
      responses.set(path, q);
    },
    async post<T>(path: string, body: unknown, opts?: unknown) {
      calls.push({ method: 'POST', path, body, opts });
      const r = takeResponse(path);
      if (r instanceof Error) throw r;
      return r as AuthHttpResponse<T>;
    },
    async get<T>(path: string, opts?: unknown) {
      calls.push({ method: 'GET', path, body: null, opts });
      const r = takeResponse(path);
      if (r instanceof Error) throw r;
      return r as AuthHttpResponse<T>;
    },
  };
}

function makeFakeTimer(): AuthTimerPort & {
  currentState: string;
  dispatched: Array<{ type: string }>;
  stopCalls: number;
} {
  return {
    currentState: 'Idle',
    dispatched: [],
    stopCalls: 0,
    getCurrentState() {
      return this.currentState;
    },
    async stopTimer() {
      this.stopCalls += 1;
      this.currentState = 'Idle';
      return undefined;
    },
    async dispatch(event) {
      this.dispatched.push(event);
      if (event.type === 'FORCED_SIGN_OUT') this.currentState = 'Idle';
      return undefined;
    },
  };
}

const VALID_LOGIN_RESPONSE = {
  accessToken: 'at-123',
  refreshToken: 'rt-456',
  expiresIn: 900,
  user: {
    id: 'usr_test',
    email: 'test@example.com',
    displayName: 'Test User',
    avatarUrl: null,
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    pendingErasure: false,
  },
};

function makeService(override?: Partial<AuthServiceDeps>) {
  const http = makeFakeHttp();
  const tokenStore = makeFakeTokenStore();
  const repos = {
    user: makeFakeUserRepo(),
    authAttempts: makeFakeAuthAttemptsRepo(),
    authSession: makeFakeAuthSessionRepo(),
  };
  const timer = makeFakeTimer();
  const service = createAuthService({
    logger,
    http,
    tokenStore: tokenStore as unknown as AuthServiceDeps['tokenStore'],
    repos: repos as unknown as AuthServiceDeps['repos'],
    timer,
    // schedule: use real setTimeout — we stub via fake timers in tests that need it
    ...override,
  });
  return { service, http, tokenStore, repos, timer };
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

describe('AuthService.login', () => {
  it('happy path: stores tokens, mirrors user, emits logged-in, clears failures', async () => {
    const { service, http, tokenStore, repos } = makeService();
    http.queueResponse('/auth/login', makeHttpResponse(VALID_LOGIN_RESPONSE));

    const events: Array<{ channel: string }> = [];
    service.attachEventBus((e) => events.push({ channel: e.channel }));

    const result = await service.login('test@example.com', 'hunter2');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe('usr_test');
      expect(result.user.email).toBe('test@example.com');
    }
    expect(tokenStore.current?.accessToken).toBe('at-123');
    expect(tokenStore.current?.refreshToken).toBe('rt-456');
    expect(repos.user.store.get('usr_test')?.email).toBe('test@example.com');
    expect(service.getAccessToken()).toBe('at-123');
    expect(service.isAuthenticated()).toBe(true);
    expect(events.map((e) => e.channel)).toContain('auth:logged-in');
    expect(events.map((e) => e.channel)).toContain('auth:status-changed');
  });

  it('rejects invalid email format at the boundary', async () => {
    const { service } = makeService();
    const result = await service.login('not-an-email', 'x');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('ERR_AUTH_INVALID_INPUT');
  });

  it('401 response increments failure count and returns ERR_AUTH_BAD_CREDENTIALS', async () => {
    const { service, http, repos } = makeService();
    http.queueResponse('/auth/login', httpError(401));
    const result = await service.login('user@example.com', 'wrong');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('ERR_AUTH_BAD_CREDENTIALS');
    expect(repos.authAttempts.store.get('user@example.com')?.failure_count).toBe(1);
  });

  it(`locks out after ${LOGIN_MAX_ATTEMPTS} consecutive failures and emits auth:locked-out`, async () => {
    const { service, http, repos } = makeService();
    const events: Array<{ channel: string; payload: unknown }> = [];
    service.attachEventBus((e) => events.push({ channel: e.channel, payload: e.payload }));

    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i += 1) {
      http.queueResponse('/auth/login', httpError(401));
      // eslint-disable-next-line no-await-in-loop
      await service.login('user@example.com', 'wrong');
    }

    const row = repos.authAttempts.store.get('user@example.com');
    expect(row?.failure_count).toBe(LOGIN_MAX_ATTEMPTS);
    expect(row?.locked_until).toBeGreaterThan(Date.now());
    const lockedEvents = events.filter((e) => e.channel === 'auth:locked-out');
    expect(lockedEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('locked client short-circuits the server call', async () => {
    const { service, http, repos } = makeService();
    repos.authAttempts.upsert({
      email: 'locked@example.com',
      failure_count: LOGIN_MAX_ATTEMPTS,
      first_failure_at: Date.now(),
      last_failure_at: Date.now(),
      locked_until: Date.now() + LOGIN_LOCKOUT_DURATION_MS,
    });

    const result = await service.login('locked@example.com', 'anything');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('ERR_AUTH_LOCKED');
    expect(http.calls.length).toBe(0);
  });

  it('HTTP 429 surfaces rate limit and honours Retry-After', async () => {
    const { service, http } = makeService();
    http.queueResponse(
      '/auth/login',
      httpError(429, { 'retry-after': '30' }),
    );
    const result = await service.login('u@example.com', 'pw');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('ERR_AUTH_RATE_LIMITED');
      expect(result.retryAfterSec).toBe(30);
      expect(result.lockedUntil).toBeGreaterThan(Date.now());
    }
  });

  it('HTTP 423 surfaces account-locked', async () => {
    const { service, http } = makeService();
    http.queueResponse(
      '/auth/login',
      httpError(423, { 'retry-after': '60' }),
    );
    const result = await service.login('u@example.com', 'pw');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('ERR_AUTH_LOCKED');
  });

  it('invalid server response fails validation', async () => {
    const { service, http } = makeService();
    http.queueResponse(
      '/auth/login',
      makeHttpResponse({ not: 'a real login response' }),
    );
    const result = await service.login('u@example.com', 'pw');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('ERR_AUTH_UNKNOWN');
  });

  it('successful login after prior failures clears the lockout ledger', async () => {
    const { service, http, repos } = makeService();
    http.queueResponse('/auth/login', httpError(401));
    await service.login('user@example.com', 'wrong');
    expect(repos.authAttempts.store.get('user@example.com')?.failure_count).toBe(1);

    http.queueResponse('/auth/login', makeHttpResponse({
      ...VALID_LOGIN_RESPONSE,
      user: { ...VALID_LOGIN_RESPONSE.user, email: 'user@example.com' },
    }));
    const ok = await service.login('user@example.com', 'correct');
    expect(ok.ok).toBe(true);
    expect(repos.authAttempts.store.get('user@example.com')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

describe('AuthService.refresh', () => {
  it('replaces the access token on 200', async () => {
    const { service, http } = makeService();
    http.queueResponse('/auth/login', makeHttpResponse(VALID_LOGIN_RESPONSE));
    await service.login('test@example.com', 'pw');

    http.queueResponse('/auth/refresh', makeHttpResponse({
      accessToken: 'at-new',
      expiresIn: 900,
    }));
    const ok = await service.refresh();
    expect(ok).toBe(true);
    expect(service.getAccessToken()).toBe('at-new');
  });

  it('handles refresh token rotation when server returns a new refresh token', async () => {
    const { service, http, tokenStore } = makeService();
    http.queueResponse('/auth/login', makeHttpResponse(VALID_LOGIN_RESPONSE));
    await service.login('test@example.com', 'pw');

    http.queueResponse('/auth/refresh', makeHttpResponse({
      accessToken: 'at-rotated',
      refreshToken: 'rt-rotated',
      expiresIn: 900,
    }));
    await service.refresh();
    expect(tokenStore.current?.refreshToken).toBe('rt-rotated');
    expect(tokenStore.current?.accessToken).toBe('at-rotated');
  });

  it('401 on refresh forces logout', async () => {
    const { service, http, timer } = makeService();
    http.queueResponse('/auth/login', makeHttpResponse(VALID_LOGIN_RESPONSE));
    await service.login('test@example.com', 'pw');
    timer.currentState = 'Running';

    http.queueResponse('/auth/refresh', httpError(401));
    const ok = await service.refresh();
    expect(ok).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
    expect(timer.dispatched.some((e) => e.type === 'FORCED_SIGN_OUT')).toBe(
      true,
    );
  });

  it('refresh without a prior session fails gracefully', async () => {
    const { service } = makeService();
    const ok = await service.refresh();
    expect(ok).toBe(false);
  });

  it('coalesces concurrent refresh calls', async () => {
    const { service, http } = makeService();
    http.queueResponse('/auth/login', makeHttpResponse(VALID_LOGIN_RESPONSE));
    await service.login('test@example.com', 'pw');

    http.queueResponse('/auth/refresh', makeHttpResponse({
      accessToken: 'at-new',
      expiresIn: 900,
    }));
    const [a, b] = await Promise.all([service.refresh(), service.refresh()]);
    expect(a).toBe(true);
    expect(b).toBe(true);
    // Only one refresh request should have been enqueued / consumed.
    expect(
      http.calls.filter((c) => c.path === '/auth/refresh').length,
    ).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

describe('AuthService.logout', () => {
  it('calls backend, clears tokens, stops timer, emits logged-out', async () => {
    const { service, http, tokenStore, timer } = makeService();
    http.queueResponse('/auth/login', makeHttpResponse(VALID_LOGIN_RESPONSE));
    await service.login('test@example.com', 'pw');
    timer.currentState = 'Running';

    http.queueResponse('/auth/logout', makeHttpResponse({}, { status: 204 }));

    const events: string[] = [];
    service.attachEventBus((e) => events.push(e.channel));

    await service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.getAccessToken()).toBeNull();
    expect(tokenStore.current).toBeNull();
    expect(timer.dispatched.some((e) => e.type === 'FORCED_SIGN_OUT')).toBe(
      true,
    );
    expect(events).toContain('auth:logged-out');
    expect(events).toContain('auth:needs-login');
  });

  it('survives backend logout failure', async () => {
    const { service, http, tokenStore } = makeService();
    http.queueResponse('/auth/login', makeHttpResponse(VALID_LOGIN_RESPONSE));
    await service.login('test@example.com', 'pw');

    http.queueResponse('/auth/logout', httpError(500));
    await service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(tokenStore.current).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// handleUnauthorized / Phase-4 hook
// ---------------------------------------------------------------------------

describe('AuthService.handleUnauthorized', () => {
  it('triggers a refresh and returns true on success', async () => {
    const { service, http } = makeService();
    http.queueResponse('/auth/login', makeHttpResponse(VALID_LOGIN_RESPONSE));
    await service.login('test@example.com', 'pw');

    http.queueResponse('/auth/refresh', makeHttpResponse({
      accessToken: 'at-renewed',
      expiresIn: 900,
    }));
    const ok = await service.handleUnauthorized();
    expect(ok).toBe(true);
    expect(service.getAccessToken()).toBe('at-renewed');
  });

  it('returns false and forces logout on refresh failure', async () => {
    const { service, http } = makeService();
    http.queueResponse('/auth/login', makeHttpResponse(VALID_LOGIN_RESPONSE));
    await service.login('test@example.com', 'pw');

    http.queueResponse('/auth/refresh', httpError(401));
    const ok = await service.handleUnauthorized();
    expect(ok).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Session resume
// ---------------------------------------------------------------------------

describe('AuthService.tryResumeSession', () => {
  it('emits needs-login when no persisted token exists', async () => {
    const { service } = makeService();
    const events: string[] = [];
    service.attachEventBus((e) => events.push(e.channel));
    const ok = await service.tryResumeSession();
    expect(ok).toBe(false);
    expect(events).toContain('auth:needs-login');
  });

  it('resumes from persisted bundle when token is still valid', async () => {
    const { service, tokenStore, repos, http } = makeService();
    // Seed the store + user mirror as if a prior session had completed.
    const now = Date.now();
    await tokenStore.save({
      accessToken: 'stored-at',
      refreshToken: 'stored-rt',
      expiresAt: now + 900_000,
      userId: 'usr_test',
    });
    repos.user.store.set('usr_test', {
      id: 'usr_test',
      email: 'test@example.com',
      display_name: 'Test User',
      avatar_url: null,
      timezone: 'UTC',
      currency: 'USD',
      pending_erasure: 0,
      mirrored_at: now,
    } as UserRow);

    const ok = await service.tryResumeSession();
    expect(ok).toBe(true);
    expect(service.getAccessToken()).toBe('stored-at');
    expect(service.getCurrentUser()?.id).toBe('usr_test');
    expect(http.calls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Token-change subscribers
// ---------------------------------------------------------------------------

describe('AuthService.onTokenChange', () => {
  it('notifies subscribers on login / logout', async () => {
    const { service, http } = makeService();
    const seen: Array<string | null> = [];
    service.onTokenChange((t) => seen.push(t));
    // Initial fire = null
    expect(seen[0]).toBeNull();

    http.queueResponse('/auth/login', makeHttpResponse(VALID_LOGIN_RESPONSE));
    await service.login('test@example.com', 'pw');
    expect(seen).toContain('at-123');

    http.queueResponse('/auth/logout', makeHttpResponse({}, { status: 204 }));
    await service.logout();
    expect(seen[seen.length - 1]).toBeNull();
  });

  it('invokes apiClient.setAuthToken when provided via setApiClient', async () => {
    const { service, http } = makeService();
    const setAuthToken = vi.fn();
    service.setApiClient({ setAuthToken });
    http.queueResponse('/auth/login', makeHttpResponse(VALID_LOGIN_RESPONSE));
    await service.login('test@example.com', 'pw');
    expect(setAuthToken).toHaveBeenCalledWith('at-123');
  });
});

// ---------------------------------------------------------------------------
// Lockout retrieval
// ---------------------------------------------------------------------------

describe('AuthService.getLockoutForEmail', () => {
  it('returns null when no lockout is active', () => {
    const { service } = makeService();
    expect(service.getLockoutForEmail('nobody@example.com')).toBeNull();
  });

  it('returns the lockout timestamp when one is active', () => {
    const { service, repos } = makeService();
    const lockedUntil = Date.now() + 60_000;
    repos.authAttempts.upsert({
      email: 'user@example.com',
      failure_count: LOGIN_MAX_ATTEMPTS,
      first_failure_at: Date.now(),
      last_failure_at: Date.now(),
      locked_until: lockedUntil,
    });
    expect(service.getLockoutForEmail('user@example.com')).toBe(lockedUntil);
  });
});

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

describe('AuthService.getStatus', () => {
  it('returns a stable unauthenticated status on a cold service', () => {
    const { service } = makeService();
    const status = service.getStatus();
    expect(status.isAuthenticated).toBe(false);
    expect(status.user).toBeNull();
    expect(status.lockedUntil).toBeNull();
    expect(status.expiresAt).toBeNull();
  });

  it('reflects the authenticated user after login', async () => {
    const { service, http } = makeService();
    http.queueResponse('/auth/login', makeHttpResponse(VALID_LOGIN_RESPONSE));
    await service.login('test@example.com', 'pw');
    const status = service.getStatus();
    expect(status.isAuthenticated).toBe(true);
    expect(status.user?.email).toBe('test@example.com');
    expect(status.expiresAt).toBeGreaterThan(Date.now());
  });
});
