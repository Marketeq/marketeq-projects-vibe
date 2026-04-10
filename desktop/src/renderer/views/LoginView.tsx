// src/renderer/views/LoginView.tsx
/// <reference path="../dtt-bridge.d.ts" />
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { COPY } from '../copy';

function formatCountdown(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function LoginView(): JSX.Element {
  const authStore = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const locked =
    authStore.lockedUntil != null && authStore.lockedUntil > now;
  const lockRemaining = locked ? (authStore.lockedUntil ?? 0) - now : 0;

  async function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault();
    setLocalError(null);
    if (!email || !password) {
      setLocalError('Email and password are required.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await authStore.login(email, password);
      if (!result.ok) {
        switch (result.code) {
          case 'ERR_AUTH_BAD_CREDENTIALS':
            setLocalError(COPY.login.errors.invalidCredentials);
            break;
          case 'ERR_AUTH_NETWORK':
            setLocalError(COPY.login.errors.network);
            break;
          case 'ERR_AUTH_LOCKED':
          case 'ERR_AUTH_RATE_LIMITED':
            setLocalError(COPY.login.errors.locked);
            break;
          default:
            setLocalError(result.message || COPY.login.errors.unknown);
        }
      }
    } catch (err) {
      setLocalError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function openForgot() {
    // External link — we intentionally don't use window.open in Electron
    // because the renderer may not have access. Log it instead; a future
    // preload helper can route it through shell.openExternal.
    // eslint-disable-next-line no-console
    console.info('forgot password clicked');
  }

  const error = localError ?? authStore.lastError;

  return (
    <main className="view">
      <section className="login" aria-labelledby="login-heading">
        <h1 id="login-heading">{COPY.login.heading}</h1>
        <p className="sub">{COPY.login.helpText}</p>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="login-email">{COPY.login.emailLabel}</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              placeholder={COPY.login.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting || locked}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="login-password">{COPY.login.passwordLabel}</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder={COPY.login.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting || locked}
              required
            />
            <a
              href="#"
              className="forgot"
              onClick={(e) => {
                e.preventDefault();
                openForgot();
              }}
            >
              {COPY.login.forgot}
            </a>
          </div>

          <div className="actions">
            <button
              type="submit"
              className="primary"
              disabled={submitting || locked}
              style={{ width: '100%' }}
            >
              {submitting ? COPY.login.submitting : COPY.login.submit}
            </button>
          </div>

          {locked && (
            <p className="locked" role="status">
              Locked for {formatCountdown(lockRemaining)}
            </p>
          )}

          <p className="hint">{COPY.login.onboardingHint}</p>
        </form>
      </section>
    </main>
  );
}
