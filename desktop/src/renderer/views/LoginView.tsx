// src/renderer/views/LoginView.tsx
/// <reference path="../dtt-bridge.d.ts" />
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { COPY } from '../copy';
import { cn } from '../utils/functions';

const WEB_BASE =
  (import.meta as any).env?.VITE_WEB_BASE_URL ?? 'http://localhost:3000';

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

  function openExternal(url: string) {
    window.dtt?.shell?.openExternal?.(url).catch(() => undefined);
  }

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

  const error = localError ?? authStore.lastError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-blue-600">
      <div className="w-full max-w-[400px] px-6">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">
            {COPY.login.heading}
          </h1>
          <p className="text-sm text-dark-blue-25 mt-1.5">
            {COPY.login.helpText}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-lg bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="flex flex-col gap-y-1.5 mb-5">
            <label
              htmlFor="login-email"
              className="text-sm font-medium text-white"
            >
              {COPY.login.emailLabel}
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              placeholder={COPY.login.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting || locked}
              required
              className={cn(
                'w-full rounded-lg border border-dark-blue-300 bg-dark-blue-500 px-3.5 py-2.5',
                'text-sm text-white placeholder:text-dark-blue-25/50',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-y-1.5 mb-5">
            <label
              htmlFor="login-password"
              className="text-sm font-medium text-white"
            >
              {COPY.login.passwordLabel}
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder={COPY.login.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting || locked}
              required
              className={cn(
                'w-full rounded-lg border border-dark-blue-300 bg-dark-blue-500 px-3.5 py-2.5',
                'text-sm text-white placeholder:text-dark-blue-25/50',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            />
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                openExternal(`${WEB_BASE}/forgot-password`);
              }}
              className="text-xs text-white/70 hover:text-white hover:underline self-end mt-1"
            >
              {COPY.login.forgot}
            </a>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || locked}
            className={cn(
              'w-full rounded-lg bg-primary-500 px-4 py-2.5',
              'text-sm font-semibold text-white',
              'hover:bg-primary-600 active:bg-primary-700',
              'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 focus:ring-offset-dark-blue-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors',
            )}
          >
            {submitting ? COPY.login.submitting : COPY.login.submit}
          </button>

          {/* Lockout */}
          {locked && (
            <p className="mt-3 text-center text-xs text-warning-300">
              Locked for {formatCountdown(lockRemaining)}
            </p>
          )}

          {/* Onboarding hint */}
          <p className="mt-5 text-xs text-white/70 leading-relaxed">
            {COPY.login.onboardingHint}
          </p>
        </form>

        {/* Web sign-in link */}
        <div className="mt-6 pt-5 border-t border-dark-blue-300 text-center">
          <span className="text-xs text-white/70">
            Having trouble?{' '}
          </span>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              openExternal(`${WEB_BASE}/sign-in`);
            }}
            className="text-xs text-primary-300 hover:text-primary-200 hover:underline inline-flex items-center gap-1"
          >
            Sign in on the web
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
