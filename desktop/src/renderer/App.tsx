// src/renderer/App.tsx
//
// Phase 6 — Root route switcher. Chooses which top-level view to render
// based on a discriminated union computed from the auth/onboarding/timer
// stores. No react-router — Electron apps have exactly one window so a
// simple switch suffices.

/// <reference path="./dtt-bridge.d.ts" />
import React, { useEffect, useMemo } from 'react';
import { useAuthStore } from './stores/auth-store';
import { useOnboardingStore } from './stores/onboarding-store';
import { useTimerStore } from './stores/timer-store';
import { LoginView } from './views/LoginView';
import { OnboardingView } from './views/onboarding/OnboardingView';
import { MainView } from './views/MainView';
import { COPY } from './copy';

type Route = 'loading' | 'login' | 'onboarding' | 'locked' | 'main';

interface ErrorBoundaryState {
  err: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { err: null };

  static getDerivedStateFromError(err: Error): ErrorBoundaryState {
    return { err };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('renderer error boundary caught', err, info);
  }

  render(): React.ReactNode {
    if (this.state.err) {
      return (
        <div className="error-screen" role="alert">
          <h1>Something went wrong</h1>
          <pre>{this.state.err.message}</pre>
          <button
            type="button"
            onClick={() => this.setState({ err: null })}
          >
            Reload view
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LockedView(): JSX.Element {
  return (
    <div className="locked-view" role="alert">
      <h1>{COPY.locked.heading}</h1>
      <p>{COPY.locked.body}</p>
    </div>
  );
}

function LoadingView(): JSX.Element {
  return (
    <div className="loading-view" role="status">
      <p>Loading…</p>
    </div>
  );
}

function computeRoute(params: {
  authHydrated: boolean;
  onboardingHydrated: boolean;
  isAuthenticated: boolean;
  needsLogin: boolean;
  onboardingCompleted: boolean;
  timerState: string;
}): Route {
  if (!params.authHydrated || !params.onboardingHydrated) return 'loading';
  if (params.needsLogin || !params.isAuthenticated) return 'login';
  if (!params.onboardingCompleted) return 'onboarding';
  if (params.timerState === 'LockedDisputed') return 'locked';
  return 'main';
}

export function App(): JSX.Element {
  const authHydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const needsLogin = useAuthStore((s) => s.needsLogin);
  const hydrateAuth = useAuthStore((s) => s.hydrate);

  const onboardingHydrated = useOnboardingStore((s) => s.hydrated);
  const onboardingCompleted = useOnboardingStore((s) => s.state.completed);
  const hydrateOnboarding = useOnboardingStore((s) => s.hydrate);

  const timerState = useTimerStore((s) => s.state);

  useEffect(() => {
    void hydrateAuth();
    void hydrateOnboarding();
  }, [hydrateAuth, hydrateOnboarding]);

  const route = useMemo(
    () =>
      computeRoute({
        authHydrated,
        onboardingHydrated,
        isAuthenticated,
        needsLogin,
        onboardingCompleted,
        timerState,
      }),
    [
      authHydrated,
      onboardingHydrated,
      isAuthenticated,
      needsLogin,
      onboardingCompleted,
      timerState,
    ],
  );

  let view: JSX.Element;
  switch (route) {
    case 'loading':
      view = <LoadingView />;
      break;
    case 'login':
      view = <LoginView />;
      break;
    case 'onboarding':
      view = <OnboardingView />;
      break;
    case 'locked':
      view = <LockedView />;
      break;
    case 'main':
    default:
      view = <MainView />;
      break;
  }

  return <ErrorBoundary>{view}</ErrorBoundary>;
}
