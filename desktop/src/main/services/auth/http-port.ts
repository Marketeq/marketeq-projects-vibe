// src/main/services/auth/http-port.ts
//
// Minimal HTTP adapter used by the AuthService to talk to the backend
// auth endpoints. Intentionally dependency-free (uses Node's built-in
// fetch so we do not pull in ky/axios just for auth) — the Phase 4
// api-client will own the richer HttpClient with retries, certificate
// pinning, idempotency keys, etc.
//
// Tests inject their own AuthHttpPort implementation, so nothing inside
// this module is on the hot test path.

import type { Logger } from 'pino';
import type {
  AuthHttpError,
  AuthHttpPort,
  AuthHttpResponse,
} from './auth-service';

export interface FetchAuthHttpPortDeps {
  logger: Logger;
  /** Base URL (no trailing slash). */
  baseUrl?: string;
  /** Override fetch for tests. */
  fetchImpl?: typeof fetch;
}

export function createFetchAuthHttpPort(
  deps: FetchAuthHttpPortDeps,
): AuthHttpPort {
  const logger = deps.logger.child({ module: 'auth/http-port' });
  const baseUrl =
    deps.baseUrl ??
    process.env.TTS_API_URL ??
    'https://api.marketeq.com/tts/v1';
  const fetchFn = deps.fetchImpl ?? globalThis.fetch;

  if (!fetchFn) {
    logger.error('global fetch is not available; auth http port inoperative');
  }

  async function doRequest<T>(
    method: 'GET' | 'POST',
    path: string,
    body: unknown,
    opts?: { bearer?: string | null; skipAuth?: boolean },
  ): Promise<AuthHttpResponse<T>> {
    if (!fetchFn) {
      const err = new Error('fetch_unavailable') as AuthHttpError;
      err.status = 0;
      err.headers = {};
      throw err;
    }
    const url = `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (!opts?.skipAuth && opts?.bearer) {
      headers.Authorization = `Bearer ${opts.bearer}`;
    } else if (opts?.bearer) {
      headers.Authorization = `Bearer ${opts.bearer}`;
    }
    const init: RequestInit = {
      method,
      headers,
      body: method === 'GET' || body == null ? undefined : JSON.stringify(body),
    };
    const res = await fetchFn(url, init);
    const rawHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      rawHeaders[k.toLowerCase()] = v;
    });
    let parsed: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!res.ok) {
      const err = new Error(`http_${res.status}`) as AuthHttpError;
      err.status = res.status;
      err.headers = rawHeaders;
      err.body = parsed;
      throw err;
    }
    return {
      status: res.status,
      ok: res.ok,
      headers: rawHeaders,
      body: parsed as T,
    };
  }

  return {
    post: (path, body, opts) => doRequest('POST', path, body, opts),
    get: (path, opts) => doRequest('GET', path, null, opts),
  };
}
